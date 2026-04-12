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
  const executionDetails = run?.execution_details_json || null;

  if (!executionDetails || typeof executionDetails !== "object" || Array.isArray(executionDetails)) {
    return null;
  }

  return executionDetails;
}

function mapFetchRun(run) {
  const executionDetails = getFetchRunExecutionDetails(run);

  return {
    ai_cache_hit_count: run.ai_cache_hit_count || 0,
    blocked_count: run.blocked_count || 0,
    duplicate_count: run.duplicate_count || 0,
    last_error_message: run.last_error_message || null,
    executionDetails,
    failed_count: run.failed_count || 0,
    fetched_count: run.fetched_count || 0,
    finished_at: serializeDate(run.finished_at),
    held_count: run.held_count || 0,
    id: run.id,
    optimized_count: run.optimized_count || 0,
    publishable_count: run.publishable_count || 0,
    published_count: run.published_count || 0,
    queued_count: run.queued_count || 0,
    skipped_count: run.skipped_count || 0,
    started_at: serializeDate(run.started_at),
    status: run.status,
    trigger_type: run.trigger_type || null,
  };
}

function getCurrentProviderCheckpoint(stream) {
  return (stream?.checkpoints || []).find((entry) => entry.provider_config_id === stream.active_provider_id) || null;
}

function getLatestRunByTrigger(fetchRuns = [], trigger_type) {
  return fetchRuns.find((run) => run.trigger_type === trigger_type) || null;
}

function getLatestStreamActivityAt(stream) {
  return [stream?.last_run_completed_at, stream?.last_failure_at, stream?.last_run_started_at]
    .filter((value) => value instanceof Date)
    .sort((left, right) => right.getTime() - left.getTime())[0] || null;
}

function buildEffectiveProviderRequest(stream) {
  const provider_key = stream?.activeProvider?.provider_key || "";

  if (!provider_key) {
    return {};
  }

  return resolveStreamProviderRequestValues(provider_key, {
    country_allowlist_json: stream?.country_allowlist_json || [],
    language_allowlist_json: stream?.language_allowlist_json || [],
    locale: stream?.locale || "",
    providerDefaults: stream?.activeProvider?.request_defaults_json || {},
    providerFilters: stream?.settings_json?.providerFilters || {},
  });
}

function buildScheduleSnapshot(stream, latestRun, latestScheduledRun, now) {
  const scheduleEnabled = (stream?.schedule_interval_minutes || 0) > 0;
  const active = stream?.status === "ACTIVE";
  const running = isStreamExecutionInProgress(stream);
  const next_run_at = getStreamNextScheduledRunAt(stream);
  const due = active ? isStreamDueForScheduledRun(stream, now) : false;
  const overdueMinutes =
    due && next_run_at instanceof Date ? Math.max(0, Math.floor((now.getTime() - next_run_at.getTime()) / 60000)) : 0;
  const latestActivityAt = getLatestStreamActivityAt(stream);

  return {
    intervalMinutes: stream?.schedule_interval_minutes || 0,
    is_active: active,
    isDue: due,
    is_enabled: scheduleEnabled,
    isOverdue: due && overdueMinutes > 0,
    isRunning: active && running,
    lastActivityAt: serializeDate(latestActivityAt),
    last_failure_at: serializeDate(stream?.last_failure_at),
    last_run_completed_at: serializeDate(stream?.last_run_completed_at),
    last_run_started_at: serializeDate(stream?.last_run_started_at),
    latestRunId: latestRun?.id || null,
    latestRunStatus: latestRun?.status || null,
    latestScheduledRunId: latestScheduledRun?.id || null,
    latestScheduledRunStartedAt: latestScheduledRun?.started_at || null,
    latestTriggerType: latestRun?.trigger_type || null,
    next_run_at: serializeDate(next_run_at),
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
            provider_key: true,
            request_defaults_json: true,
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
            last_successful_fetch_at: true,
            provider_config_id: true,
            updated_at: true,
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
          orderBy: [{ started_at: "desc" }],
          select: {
            ai_cache_hit_count: true,
            blocked_count: true,
            duplicate_count: true,
            last_error_message: true,
            execution_details_json: true,
            failed_count: true,
            fetched_count: true,
            finished_at: true,
            held_count: true,
            id: true,
            optimized_count: true,
            publishable_count: true,
            published_count: true,
            queued_count: true,
            skipped_count: true,
            started_at: true,
            status: true,
            trigger_type: true,
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
      orderBy: [{ is_default: "desc" }, { label: "asc" }],
      select: {
        id: true,
        is_default: true,
        label: true,
        provider_key: true,
        request_defaults_json: true,
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
    const providerEndpoint = getProviderEndpointShape(stream.activeProvider?.provider_key, effectiveProviderRequestValues);
    const timeBoundarySupport = getProviderTimeBoundarySupport(
      stream.activeProvider?.provider_key,
      effectiveProviderRequestValues,
    );
    const currentCheckpoint = getCurrentProviderCheckpoint(stream);
    const streamRecord = {
      ...stream,
      checkpoint: currentCheckpoint
        ? {
            id: currentCheckpoint.id,
            last_successful_fetch_at: serializeDate(currentCheckpoint.last_successful_fetch_at),
            provider_config_id: currentCheckpoint.provider_config_id,
            updated_at: serializeDate(currentCheckpoint.updated_at),
          }
        : null,
      country_allowlist_json: stream.country_allowlist_json || [],
      effectiveFilters: {
        categories: stream.categories.map((entry) => entry.category),
        country_allowlist_json: stream.country_allowlist_json || [],
        exclude_keywords_json: stream.exclude_keywords_json || [],
        include_keywords_json: stream.include_keywords_json || [],
        language_allowlist_json: stream.language_allowlist_json || [],
        providerEndpoint,
        providerRequestValues: effectiveProviderRequestValues,
        region_allowlist_json: stream.region_allowlist_json || [],
        timeBoundarySupport: timeBoundarySupport
          ? {
              endpoint: timeBoundarySupport.endpoint,
              mode: timeBoundarySupport.mode,
              precision: timeBoundarySupport.precision,
              summary: timeBoundarySupport.summary,
            }
          : null,
      },
      exclude_keywords_json: stream.exclude_keywords_json || [],
      include_keywords_json: stream.include_keywords_json || [],
      latestRun,
      latestScheduledRun,
      recentRuns,
      schedule: buildScheduleSnapshot(stream, latestRun, latestScheduledRun, now),
      streamCategories: stream.categories.map((entry) => entry.category),
      validationIssues: getStreamValidationIssues({
        country_allowlist_json: stream.country_allowlist_json,
        destination: stream.destination,
        language_allowlist_json: stream.language_allowlist_json,
        locale: stream.locale,
        max_posts_per_run: stream.max_posts_per_run,
        mode: stream.mode,
        providerDefaults: stream.activeProvider?.request_defaults_json,
        providerFilters: stream.settings_json?.providerFilters,
        provider_key: stream.activeProvider?.provider_key,
        template: stream.defaultTemplate,
      }),
    };

    delete streamRecord.fetchRuns;
    delete streamRecord.checkpoints;

    return streamRecord;
  });
  const latestScheduledRunAt = mappedStreams
    .map((stream) => stream.latestScheduledRun?.started_at)
    .filter(Boolean)
    .sort((left, right) => `${right}`.localeCompare(`${left}`))[0] || null;
  const scheduledStreamCount = mappedStreams.filter((stream) => stream.schedule.is_enabled).length;
  const dueStreamCount = mappedStreams.filter((stream) => stream.schedule.isDue).length;
  const overdueStreamCount = mappedStreams.filter((stream) => stream.schedule.isOverdue).length;
  const runningStreamCount = mappedStreams.filter((stream) => stream.schedule.isRunning).length;
  const neverRunCount = mappedStreams.filter(
    (stream) =>
      stream.schedule.is_enabled
      && !stream.schedule.last_run_completed_at
      && !stream.schedule.last_failure_at
      && !stream.schedule.last_run_started_at,
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
 * @param {string|null} [options.actor_id] - Acting admin id.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Saved stream record.
 */
export async function saveStreamRecord(input, { actor_id } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const name = trimText(input.name);
  const slug = trimText(input.slug) || createSlug(name, "stream");

  if (!name || !input.destination_id || !input.active_provider_id || !input.locale) {
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
        id: input.destination_id,
      },
    }),
    input.default_template_id
      ? db.destinationTemplate.findUnique({
          select: {
            id: true,
            name: true,
            platform: true,
          },
          where: {
            id: input.default_template_id,
          },
        })
      : Promise.resolve(null),
  ]);

  const activeProvider = await db.newsProviderConfig.findUnique({
    select: {
      id: true,
      provider_key: true,
      request_defaults_json: true,
    },
    where: {
      id: input.active_provider_id,
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

  if (input.default_template_id && !defaultTemplate) {
    throw new NewsPubError("The selected default template could not be found.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const providerFilters = sanitizeProviderFieldValues(
    activeProvider.provider_key,
    input.providerFilters,
    {
      preserveEmpty: true,
    },
  );
  const explicitCountryAllowlist = normalizeKeywordList(input.country_allowlist_json);
  const explicitLanguageAllowlist = normalizeKeywordList(input.language_allowlist_json);
  const fallbackCountryAllowlist = normalizeKeywordList(providerFilters.country_allowlist_json);
  const fallbackLanguageAllowlist = normalizeKeywordList(providerFilters.language_allowlist_json);
  const country_allowlist_json = (
    explicitCountryAllowlist.length
      ? explicitCountryAllowlist
      : fallbackCountryAllowlist
  ).map((value) => value.toLowerCase());
  const language_allowlist_json = (
    explicitLanguageAllowlist.length
      ? explicitLanguageAllowlist
      : fallbackLanguageAllowlist
  ).map((value) => value.toLowerCase());

  delete providerFilters.country_allowlist_json;
  delete providerFilters.language_allowlist_json;
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
    country_allowlist_json,
    destination,
    language_allowlist_json,
    locale: trimText(input.locale),
    max_posts_per_run: normalizePositiveInteger(input.max_posts_per_run, 5),
    mode: resolvedMode,
    providerDefaults: activeProvider.request_defaults_json,
    providerFilters,
    provider_key: activeProvider.provider_key,
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
      active_provider_id: input.active_provider_id,
      default_template_id: input.default_template_id || null,
      description: trimText(input.description) || null,
      destination_id: input.destination_id,
      duplicate_window_hours: normalizePositiveInteger(input.duplicate_window_hours, 48),
      exclude_keywords_json: normalizeKeywordList(input.exclude_keywords_json),
      include_keywords_json: normalizeKeywordList(input.include_keywords_json),
      country_allowlist_json,
      language_allowlist_json,
      locale: trimText(input.locale),
      max_posts_per_run: normalizePositiveInteger(input.max_posts_per_run, 5),
      mode: resolvedMode,
      name,
      retry_backoff_minutes: normalizeNonNegativeInteger(input.retry_backoff_minutes, 15),
      retry_limit: normalizeNonNegativeInteger(input.retry_limit, 3),
      schedule_expression: null,
      schedule_interval_minutes: normalizeNonNegativeInteger(input.schedule_interval_minutes, 60),
      settings_json: {
        providerFilters,
        socialPost: normalizedSocialPost,
      },
      status: trimText(input.status) || "ACTIVE",
      timezone: trimText(input.timezone) || "UTC",
    },
    create: {
      active_provider_id: input.active_provider_id,
      default_template_id: input.default_template_id || null,
      description: trimText(input.description) || null,
      destination_id: input.destination_id,
      duplicate_window_hours: normalizePositiveInteger(input.duplicate_window_hours, 48),
      exclude_keywords_json: normalizeKeywordList(input.exclude_keywords_json),
      include_keywords_json: normalizeKeywordList(input.include_keywords_json),
      country_allowlist_json,
      language_allowlist_json,
      locale: trimText(input.locale),
      max_posts_per_run: normalizePositiveInteger(input.max_posts_per_run, 5),
      mode: resolvedMode,
      name,
      retry_backoff_minutes: normalizeNonNegativeInteger(input.retry_backoff_minutes, 15),
      retry_limit: normalizeNonNegativeInteger(input.retry_limit, 3),
      schedule_expression: null,
      schedule_interval_minutes: normalizeNonNegativeInteger(input.schedule_interval_minutes, 60),
      slug,
      settings_json: {
        providerFilters,
        socialPost: normalizedSocialPost,
      },
      status: trimText(input.status) || "ACTIVE",
      timezone: trimText(input.timezone) || "UTC",
    },
  });

  await db.streamCategory.deleteMany({
    where: {
      stream_id: stream.id,
    },
  });

  for (const category_id of input.categoryIds || []) {
    await db.streamCategory.create({
      data: {
        category_id,
        stream_id: stream.id,
      },
    });
  }

  await db.providerFetchCheckpoint.upsert({
    where: {
      stream_id_provider_config_id: {
        provider_config_id: input.active_provider_id,
        stream_id: stream.id,
      },
    },
    update: {},
    create: {
      provider_config_id: input.active_provider_id,
      stream_id: stream.id,
    },
  });

  await createAuditEventRecord(
    {
      action: "STREAM_SAVED",
      actor_id,
      entity_id: stream.id,
      entity_type: "publishing_stream",
      payload_json: {
        destination_id: stream.destination_id,
        mode: stream.mode,
        provider_config_id: stream.active_provider_id,
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
 * @param {string|null} [options.actor_id] - Acting admin id.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Deleted stream record.
 */
export async function deleteStreamRecord(id, { actor_id } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const existingStream = await db.publishingStream.findUnique({
    select: {
      active_provider_id: true,
      destination_id: true,
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
      actor_id,
      entity_id: deletedStream.id,
      entity_type: "publishing_stream",
      payload_json: {
        destination_id: deletedStream.destination_id,
        provider_config_id: deletedStream.active_provider_id,
        slug: deletedStream.slug,
      },
    },
    db,
  );

  return deletedStream;
}
