/**
 * Stream management feature services for admin snapshots and stream CRUD.
 */

import { createAuditEventRecord } from "@/lib/analytics";
import { env } from "@/lib/env/server";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import {
  getProviderEndpointShape,
  getProviderTimeBoundarySupport,
  resolveStreamProviderRequestValues,
  sanitizeProviderFieldValues,
} from "@/lib/news/provider-definitions";
import {
  normalizeSocialPostLinkPlacement,
  normalizeSocialPostSettings,
} from "@/lib/news/social-post";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import {
  getStreamNextScheduledRunAt,
  isStreamDueForScheduledRun,
  isStreamExecutionInProgress,
} from "@/lib/news/workflows";
import { getStreamValidationIssues } from "@/lib/validation/configuration";

const streamSnapshotLimit = 200;

function normalizeKeywordList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeDisplayText(entry)).filter(Boolean);
  }

  return normalizeDisplayText(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function normalizePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value ?? ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function normalizeNonNegativeInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value ?? ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue >= 0 ? parsedValue : fallbackValue;
}

function normalizeOptionalSocialPostLinkUrl(value) {
  const normalizedValue = trimText(value);

  if (!normalizedValue) {
    return null;
  }

  try {
    const parsedUrl = normalizedValue.startsWith("/") && !normalizedValue.startsWith("//")
      ? new URL(normalizedValue, env.app.url)
      : new URL(normalizedValue);

    if (!["http:", "https:"].includes(parsedUrl.protocol)) {
      throw new Error("invalid_protocol");
    }

    return parsedUrl.toString();
  } catch {
    throw new NewsPubError("Post link URL must be a valid http, https, or root-relative URL.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }
}

function getDefaultStreamModeForDestination(destination = {}) {
  return destination?.platform === "WEBSITE" ? "AUTO_PUBLISH" : "REVIEW_REQUIRED";
}

function getStatusCount(rows, status) {
  return rows
    .filter((row) => row.status === status)
    .reduce((total, row) => total + (row._count?._all || 0), 0);
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function parseBooleanFlag(value) {
  return ["1", "true", "yes", "on"].includes(`${value ?? ""}`.trim().toLowerCase());
}

function parsePositiveIntegerFlag(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value ?? ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function getFetchRunExecutionDetails(run) {
  const executionDetails = run?.executionDetailsJson || null;

  if (!executionDetails || typeof executionDetails !== "object" || Array.isArray(executionDetails)) {
    return null;
  }

  return executionDetails;
}

function mapFetchRun(run) {
  const executionDetails = getFetchRunExecutionDetails(run);

  return {
    aiCacheHitCount: run.aiCacheHitCount || 0,
    blockedCount: run.blockedCount || 0,
    duplicateCount: run.duplicateCount || 0,
    errorMessage: run.errorMessage || null,
    executionDetails,
    failedCount: run.failedCount || 0,
    fetchedCount: run.fetchedCount || 0,
    finishedAt: serializeDate(run.finishedAt),
    heldCount: run.heldCount || 0,
    id: run.id,
    optimizedCount: run.optimizedCount || 0,
    publishableCount: run.publishableCount || 0,
    publishedCount: run.publishedCount || 0,
    queuedCount: run.queuedCount || 0,
    skippedCount: run.skippedCount || 0,
    startedAt: serializeDate(run.startedAt),
    status: run.status,
    triggerType: run.triggerType || null,
  };
}

function getCurrentProviderCheckpoint(stream) {
  return (stream?.checkpoints || []).find((entry) => entry.providerConfigId === stream.activeProviderId) || null;
}

function getLatestRunByTrigger(fetchRuns = [], triggerType) {
  return fetchRuns.find((run) => run.triggerType === triggerType) || null;
}

function getLatestStreamActivityAt(stream) {
  return [stream?.lastRunCompletedAt, stream?.lastFailureAt, stream?.lastRunStartedAt]
    .filter((value) => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime())[0] || null;
}

function buildEffectiveProviderRequest(stream) {
  const providerKey = stream?.activeProvider?.providerKey || "";

  if (!providerKey) {
    return {};
  }

  return resolveStreamProviderRequestValues(providerKey, {
    countryAllowlistJson: stream?.countryAllowlistJson || [],
    languageAllowlistJson: stream?.languageAllowlistJson || [],
    locale: stream?.locale || "",
    providerDefaults: stream?.activeProvider?.requestDefaultsJson || {},
    providerFilters: stream?.settingsJson?.providerFilters || {},
  });
}

function buildScheduleSnapshot(stream, latestRun, latestScheduledRun, now) {
  const scheduleEnabled = (stream?.scheduleIntervalMinutes || 0) > 0;
  const active = stream?.status === "ACTIVE";
  const running = isStreamExecutionInProgress(stream);
  const nextRunAt = getStreamNextScheduledRunAt(stream);
  const due = active ? isStreamDueForScheduledRun(stream, now) : false;
  const overdueMinutes =
    due && nextRunAt instanceof Date ? Math.max(0, Math.floor((now.getTime() - nextRunAt.getTime()) / 60000)) : 0;
  const latestActivityAt = getLatestStreamActivityAt(stream);

  return {
    intervalMinutes: stream?.scheduleIntervalMinutes || 0,
    isActive: active,
    isDue: due,
    isEnabled: scheduleEnabled,
    isOverdue: due && overdueMinutes > 0,
    isRunning: active && running,
    lastActivityAt: serializeDate(latestActivityAt),
    lastFailureAt: serializeDate(stream?.lastFailureAt),
    lastRunCompletedAt: serializeDate(stream?.lastRunCompletedAt),
    lastRunStartedAt: serializeDate(stream?.lastRunStartedAt),
    latestRunId: latestRun?.id || null,
    latestRunStatus: latestRun?.status || null,
    latestScheduledRunId: latestScheduledRun?.id || null,
    latestScheduledRunStartedAt: latestScheduledRun?.startedAt || null,
    latestTriggerType: latestRun?.triggerType || null,
    nextRunAt: serializeDate(nextRunAt),
    overdueMinutes,
  };
}

/**
 * Returns the stream-management snapshot used by the admin workspace,
 * including related destination, provider, template, and validation data.
 *
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Stream workspace snapshot.
 */
export async function getStreamManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const now = new Date();
  const [streams, totalCount, statusCounts, rawDestinations, providers, templates, categories] = await Promise.all([
    db.publishingStream.findMany({
      include: {
        activeProvider: {
          select: {
            id: true,
            label: true,
            providerKey: true,
            requestDefaultsJson: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        checkpoints: {
          select: {
            id: true,
            lastSuccessfulFetchAt: true,
            providerConfigId: true,
            updatedAt: true,
          },
        },
        defaultTemplate: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        destination: {
          select: {
            id: true,
            kind: true,
            name: true,
            platform: true,
            slug: true,
          },
        },
        fetchRuns: {
          orderBy: [{ startedAt: "desc" }],
          select: {
            aiCacheHitCount: true,
            blockedCount: true,
            duplicateCount: true,
            errorMessage: true,
            executionDetailsJson: true,
            failedCount: true,
            fetchedCount: true,
            finishedAt: true,
            heldCount: true,
            id: true,
            optimizedCount: true,
            publishableCount: true,
            publishedCount: true,
            queuedCount: true,
            skippedCount: true,
            startedAt: true,
            status: true,
            triggerType: true,
          },
          take: 4,
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
      take: streamSnapshotLimit,
    }),
    db.publishingStream.count(),
    db.publishingStream.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    db.destination.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        _count: {
          select: {
            streams: true,
          },
        },
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
    }),
    db.newsProviderConfig.findMany({
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
      select: {
        id: true,
        isDefault: true,
        label: true,
        providerKey: true,
        requestDefaultsJson: true,
      },
    }),
    db.destinationTemplate.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      select: {
        id: true,
        locale: true,
        name: true,
        platform: true,
      },
    }),
    db.category.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);
  const destinations = rawDestinations.map(({ _count, ...destination }) => ({
    ...destination,
    streamCount: _count.streams,
  }));
  const internalSchedulerEnabled = parseBooleanFlag(process.env.INTERNAL_SCHEDULER_ENABLED);
  const internalSchedulerIntervalSeconds = internalSchedulerEnabled
    ? parsePositiveIntegerFlag(process.env.INTERNAL_SCHEDULER_INTERVAL_SECONDS, 60)
    : null;
  const mappedStreams = streams.map((stream) => {
    const recentRuns = (stream.fetchRuns || []).map(mapFetchRun);
    const latestRun = recentRuns[0] || null;
    const latestScheduledRun = getLatestRunByTrigger(recentRuns, "scheduled");
    const effectiveProviderRequestValues = buildEffectiveProviderRequest(stream);
    const providerEndpoint = getProviderEndpointShape(stream.activeProvider?.providerKey, effectiveProviderRequestValues);
    const timeBoundarySupport = getProviderTimeBoundarySupport(
      stream.activeProvider?.providerKey,
      effectiveProviderRequestValues,
    );
    const currentCheckpoint = getCurrentProviderCheckpoint(stream);
    const streamRecord = {
      ...stream,
      checkpoint: currentCheckpoint
        ? {
            id: currentCheckpoint.id,
            lastSuccessfulFetchAt: serializeDate(currentCheckpoint.lastSuccessfulFetchAt),
            providerConfigId: currentCheckpoint.providerConfigId,
            updatedAt: serializeDate(currentCheckpoint.updatedAt),
          }
        : null,
      countryAllowlistJson: stream.countryAllowlistJson || [],
      effectiveFilters: {
        categories: stream.categories.map((entry) => entry.category),
        countryAllowlistJson: stream.countryAllowlistJson || [],
        excludeKeywordsJson: stream.excludeKeywordsJson || [],
        includeKeywordsJson: stream.includeKeywordsJson || [],
        languageAllowlistJson: stream.languageAllowlistJson || [],
        providerEndpoint,
        providerRequestValues: effectiveProviderRequestValues,
        regionAllowlistJson: stream.regionAllowlistJson || [],
        timeBoundarySupport: timeBoundarySupport
          ? {
              endpoint: timeBoundarySupport.endpoint,
              mode: timeBoundarySupport.mode,
              precision: timeBoundarySupport.precision,
              summary: timeBoundarySupport.summary,
            }
          : null,
      },
      excludeKeywordsJson: stream.excludeKeywordsJson || [],
      includeKeywordsJson: stream.includeKeywordsJson || [],
      latestRun,
      latestScheduledRun,
      recentRuns,
      schedule: buildScheduleSnapshot(stream, latestRun, latestScheduledRun, now),
      streamCategories: stream.categories.map((entry) => entry.category),
      validationIssues: getStreamValidationIssues({
        countryAllowlistJson: stream.countryAllowlistJson,
        destination: stream.destination,
        languageAllowlistJson: stream.languageAllowlistJson,
        locale: stream.locale,
        maxPostsPerRun: stream.maxPostsPerRun,
        mode: stream.mode,
        providerDefaults: stream.activeProvider?.requestDefaultsJson,
        providerFilters: stream.settingsJson?.providerFilters,
        providerKey: stream.activeProvider?.providerKey,
        template: stream.defaultTemplate,
      }),
    };

    delete streamRecord.fetchRuns;
    delete streamRecord.checkpoints;

    return streamRecord;
  });
  const latestScheduledRunAt = mappedStreams
    .map((stream) => stream.latestScheduledRun?.startedAt)
    .filter(Boolean)
    .sort((left, right) => `${right}`.localeCompare(`${left}`))[0] || null;
  const scheduledStreamCount = mappedStreams.filter((stream) => stream.schedule.isEnabled).length;
  const dueStreamCount = mappedStreams.filter((stream) => stream.schedule.isDue).length;
  const overdueStreamCount = mappedStreams.filter((stream) => stream.schedule.isOverdue).length;
  const runningStreamCount = mappedStreams.filter((stream) => stream.schedule.isRunning).length;
  const neverRunCount = mappedStreams.filter(
    (stream) =>
      stream.schedule.isEnabled
      && !stream.schedule.lastRunCompletedAt
      && !stream.schedule.lastFailureAt
      && !stream.schedule.lastRunStartedAt,
  ).length;

  return {
    categories,
    destinations,
    providers,
    scheduler: {
      endpointPath: "/api/jobs/scheduled-publishing",
      headerName: "x-cron-secret",
      internalEnabled: internalSchedulerEnabled,
      internalIntervalSeconds: internalSchedulerIntervalSeconds,
      latestScheduledRunAt,
      mode: internalSchedulerEnabled ? "INTERNAL" : "EXTERNAL_CRON",
      modeLabel: internalSchedulerEnabled
        ? `Internal scheduler every ${internalSchedulerIntervalSeconds} seconds`
        : "External cron required",
      neverRunCount,
      runningStreamCount,
      scheduledStreamCount,
      dueStreamCount,
      overdueStreamCount,
      usesExternalCron: !internalSchedulerEnabled,
    },
    streams: mappedStreams,
    summary: {
      activeCount: getStatusCount(statusCounts, "ACTIVE"),
      autoPublishCount: mappedStreams.filter((stream) => stream.mode === "AUTO_PUBLISH").length,
      dueCount: dueStreamCount,
      overdueCount: overdueStreamCount,
      pausedCount: getStatusCount(statusCounts, "PAUSED"),
      runningCount: runningStreamCount,
      returnedCount: streams.length,
      scheduledCount: scheduledStreamCount,
      totalCount,
    },
    templates,
  };
}

/**
 * Creates or updates one publishing stream and keeps provider allowlists,
 * social-post settings, categories, and checkpoints synchronized.
 *
 * When the caller does not specify a mode, website destinations default to
 * `AUTO_PUBLISH` so eligible website stories can publish completely by
 * default, while social destinations remain in `REVIEW_REQUIRED`.
 *
 * @param {object} input - Submitted stream data.
 * @param {object} [options] - Save options.
 * @param {string|null} [options.actorId] - Acting admin id.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Saved stream record.
 */
export async function saveStreamRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const name = trimText(input.name);
  const slug = trimText(input.slug) || createSlug(name, "stream");

  if (!name || !input.destinationId || !input.activeProviderId || !input.locale) {
    throw new NewsPubError("Stream name, destination, provider, and locale are required.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const [destination, defaultTemplate] = await Promise.all([
    db.destination.findUnique({
      select: {
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
      where: {
        id: input.destinationId,
      },
    }),
    input.defaultTemplateId
      ? db.destinationTemplate.findUnique({
          select: {
            id: true,
            name: true,
            platform: true,
          },
          where: {
            id: input.defaultTemplateId,
          },
        })
      : Promise.resolve(null),
  ]);

  const activeProvider = await db.newsProviderConfig.findUnique({
    select: {
      id: true,
      providerKey: true,
      requestDefaultsJson: true,
    },
    where: {
      id: input.activeProviderId,
    },
  });

  if (!destination) {
    throw new NewsPubError("The selected destination could not be found.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  if (!activeProvider) {
    throw new NewsPubError("The selected provider could not be found.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  if (input.defaultTemplateId && !defaultTemplate) {
    throw new NewsPubError("The selected default template could not be found.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const providerFilters = sanitizeProviderFieldValues(
    activeProvider.providerKey,
    input.providerFilters,
    {
      preserveEmpty: true,
    },
  );
  const explicitCountryAllowlist = normalizeKeywordList(input.countryAllowlistJson);
  const explicitLanguageAllowlist = normalizeKeywordList(input.languageAllowlistJson);
  const fallbackCountryAllowlist = normalizeKeywordList(providerFilters.countryAllowlistJson);
  const fallbackLanguageAllowlist = normalizeKeywordList(providerFilters.languageAllowlistJson);
  const countryAllowlistJson = (
    explicitCountryAllowlist.length
      ? explicitCountryAllowlist
      : fallbackCountryAllowlist
  ).map((value) => value.toLowerCase());
  const languageAllowlistJson = (
    explicitLanguageAllowlist.length
      ? explicitLanguageAllowlist
      : fallbackLanguageAllowlist
  ).map((value) => value.toLowerCase());

  delete providerFilters.countryAllowlistJson;
  delete providerFilters.languageAllowlistJson;
  const socialPost = normalizeSocialPostSettings({
    linkPlacement: normalizeSocialPostLinkPlacement(input.postLinkPlacement),
    linkUrl: input.postLinkUrl,
  });
  const resolvedMode = trimText(input.mode) || getDefaultStreamModeForDestination(destination);
  const normalizedSocialPost = {
    ...socialPost,
    linkUrl: normalizeOptionalSocialPostLinkUrl(socialPost.linkUrl),
  };
  const validationIssues = getStreamValidationIssues({
    countryAllowlistJson,
    destination,
    languageAllowlistJson,
    locale: trimText(input.locale),
    maxPostsPerRun: normalizePositiveInteger(input.maxPostsPerRun, 5),
    mode: resolvedMode,
    providerDefaults: activeProvider.requestDefaultsJson,
    providerFilters,
    providerKey: activeProvider.providerKey,
    template: defaultTemplate,
  });

  if (validationIssues.length) {
    throw new NewsPubError(validationIssues[0].message, {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const stream = await db.publishingStream.upsert({
    where: {
      slug,
    },
    update: {
      activeProviderId: input.activeProviderId,
      defaultTemplateId: input.defaultTemplateId || null,
      description: trimText(input.description) || null,
      destinationId: input.destinationId,
      duplicateWindowHours: normalizePositiveInteger(input.duplicateWindowHours, 48),
      excludeKeywordsJson: normalizeKeywordList(input.excludeKeywordsJson),
      includeKeywordsJson: normalizeKeywordList(input.includeKeywordsJson),
      countryAllowlistJson,
      languageAllowlistJson,
      locale: trimText(input.locale),
      maxPostsPerRun: normalizePositiveInteger(input.maxPostsPerRun, 5),
      mode: resolvedMode,
      name,
      retryBackoffMinutes: normalizeNonNegativeInteger(input.retryBackoffMinutes, 15),
      retryLimit: normalizeNonNegativeInteger(input.retryLimit, 3),
      scheduleExpression: null,
      scheduleIntervalMinutes: normalizeNonNegativeInteger(input.scheduleIntervalMinutes, 60),
      settingsJson: {
        providerFilters,
        socialPost: normalizedSocialPost,
      },
      status: trimText(input.status) || "ACTIVE",
      timezone: trimText(input.timezone) || "UTC",
    },
    create: {
      activeProviderId: input.activeProviderId,
      defaultTemplateId: input.defaultTemplateId || null,
      description: trimText(input.description) || null,
      destinationId: input.destinationId,
      duplicateWindowHours: normalizePositiveInteger(input.duplicateWindowHours, 48),
      excludeKeywordsJson: normalizeKeywordList(input.excludeKeywordsJson),
      includeKeywordsJson: normalizeKeywordList(input.includeKeywordsJson),
      countryAllowlistJson,
      languageAllowlistJson,
      locale: trimText(input.locale),
      maxPostsPerRun: normalizePositiveInteger(input.maxPostsPerRun, 5),
      mode: resolvedMode,
      name,
      retryBackoffMinutes: normalizeNonNegativeInteger(input.retryBackoffMinutes, 15),
      retryLimit: normalizeNonNegativeInteger(input.retryLimit, 3),
      scheduleExpression: null,
      scheduleIntervalMinutes: normalizeNonNegativeInteger(input.scheduleIntervalMinutes, 60),
      slug,
      settingsJson: {
        providerFilters,
        socialPost: normalizedSocialPost,
      },
      status: trimText(input.status) || "ACTIVE",
      timezone: trimText(input.timezone) || "UTC",
    },
  });

  await db.streamCategory.deleteMany({
    where: {
      streamId: stream.id,
    },
  });

  for (const categoryId of input.categoryIds || []) {
    await db.streamCategory.create({
      data: {
        categoryId,
        streamId: stream.id,
      },
    });
  }

  await db.providerFetchCheckpoint.upsert({
    where: {
      streamId_providerConfigId: {
        providerConfigId: input.activeProviderId,
        streamId: stream.id,
      },
    },
    update: {},
    create: {
      providerConfigId: input.activeProviderId,
      streamId: stream.id,
    },
  });

  await createAuditEventRecord(
    {
      action: "STREAM_SAVED",
      actorId,
      entityId: stream.id,
      entityType: "publishing_stream",
      payloadJson: {
        destinationId: stream.destinationId,
        mode: stream.mode,
        providerConfigId: stream.activeProviderId,
        status: stream.status,
      },
    },
    db,
  );

  return stream;
}

/**
 * Deletes one publishing stream and records the resulting audit payload.
 *
 * @param {string} id - Stream id.
 * @param {object} [options] - Delete options.
 * @param {string|null} [options.actorId] - Acting admin id.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Deleted stream record.
 */
export async function deleteStreamRecord(id, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const existingStream = await db.publishingStream.findUnique({
    select: {
      activeProviderId: true,
      destinationId: true,
      id: true,
      name: true,
      slug: true,
    },
    where: {
      id,
    },
  });

  if (!existingStream) {
    throw new NewsPubError("Stream not found.", {
      status: "stream_validation_failed",
      statusCode: 404,
    });
  }

  const deletedStream = await db.publishingStream.delete({
    where: {
      id,
    },
  });

  await createAuditEventRecord(
    {
      action: "STREAM_DELETED",
      actorId,
      entityId: deletedStream.id,
      entityType: "publishing_stream",
      payloadJson: {
        destinationId: deletedStream.destinationId,
        providerConfigId: deletedStream.activeProviderId,
        slug: deletedStream.slug,
      },
    },
    db,
  );

  return deletedStream;
}
