import { createAuditEventRecord } from "@/lib/analytics";
import { env } from "@/lib/env/server";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import { sanitizeProviderFieldValues } from "@/lib/news/provider-definitions";
import {
  normalizeSocialPostLinkPlacement,
  normalizeSocialPostSettings,
} from "@/lib/news/social-post";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { getStreamValidationIssues } from "@/lib/validation/configuration";

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

/**
 * Returns the stream-management snapshot used by the admin workspace,
 * including related destination, provider, template, and validation data.
 *
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Stream workspace snapshot.
 */
export async function getStreamManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [streams, destinations, providers, templates, categories] = await Promise.all([
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
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.destination.findMany({
      orderBy: [{ name: "asc" }],
      select: {
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

  return {
    categories,
    destinations,
    providers,
    streams: streams.map((stream) => ({
      ...stream,
      includeKeywordsJson: stream.includeKeywordsJson || [],
      excludeKeywordsJson: stream.excludeKeywordsJson || [],
      streamCategories: stream.categories.map((entry) => entry.category),
      validationIssues: getStreamValidationIssues({
        countryAllowlistJson: stream.countryAllowlistJson,
        destination: stream.destination,
        languageAllowlistJson: stream.languageAllowlistJson,
        locale: stream.locale,
        mode: stream.mode,
        providerDefaults: stream.activeProvider?.requestDefaultsJson,
        providerFilters: stream.settingsJson?.providerFilters,
        providerKey: stream.activeProvider?.providerKey,
        template: stream.defaultTemplate,
      }),
    })),
    summary: {
      activeCount: streams.filter((stream) => stream.status === "ACTIVE").length,
      pausedCount: streams.filter((stream) => stream.status === "PAUSED").length,
      totalCount: streams.length,
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
