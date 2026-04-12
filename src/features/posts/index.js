/**
 * Feature services for NewsPub canonical post creation, editing, review, and publication state.
 */

import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import {
  createAuditEventRecord,
  isFailureAuditAction,
  isWarningAuditAction,
  serializeAuditEvent,
} from "@/lib/analytics";
import { getPublishAttemptDiagnosticSummary } from "@/lib/news/publish-diagnostics";
import {
  buildStoryStructuredArticle,
  createContentHash,
  NewsPubError,
  pickTranslation,
  resolvePrismaClient,
} from "@/lib/news/shared";
import { createSlug } from "@/lib/normalization";
import { getStreamValidationIssues } from "@/lib/validation/configuration";
import { manualRepostArticleMatch, publishArticleMatch, refreshArticleMatchOptimization } from "@/lib/news/workflows";

/**
 * Admin post inventory, editor, and publication-control helpers for canonical NewsPub stories.
 */
export const editorialStageOrder = Object.freeze([
  "INGESTED",
  "REVIEWED",
  "EDITED",
  "APPROVED",
]);

export const postInventoryScopeValues = Object.freeze(["review", "published", "all"]);
export const postStatusValues = Object.freeze(["DRAFT", "SCHEDULED", "PUBLISHED", "ARCHIVED"]);
const manualProviderKey = "manual";

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function mapAuditEvent(event) {
  const payload = event.payload_json || null;

  return {
    ...serializeAuditEvent(event),
    level:
      payload?.level
      || (isFailureAuditAction(event.action) ? "error" : isWarningAuditAction(event.action) ? "warn" : "info"),
    reasonCode: payload?.reasonCode || null,
    reasonMessage: payload?.reasonMessage || payload?.message || null,
  };
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeScope(value) {
  const normalizedValue = trimText(value).toLowerCase();

  return postInventoryScopeValues.includes(normalizedValue) ? normalizedValue : "review";
}

function normalizePage(value) {
  const parsedValue = Number.parseInt(`${value || 1}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function dedupeStrings(values = []) {
  return [...new Set((values || []).map((value) => trimText(value)).filter(Boolean))];
}

function createPagination(totalItems, page, pageSize = 15) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const currentPage = Math.min(normalizePage(page), totalPages);
  const startItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const endItem = totalItems ? Math.min(totalItems, currentPage * pageSize) : 0;

  return {
    currentPage,
    endItem,
    hasNextPage: currentPage < totalPages,
    hasPreviousPage: currentPage > 1,
    pageSize,
    startItem,
    totalItems,
    totalPages,
  };
}

function createPostErrorPayload(error) {
  if (error instanceof NewsPubError) {
    return {
      body: {
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  return {
    body: {
      message: error instanceof Error ? error.message : "A NewsPub post workflow error occurred.",
      status: "post_workflow_error",
      success: false,
    },
    statusCode: 500,
  };
}

async function createUniquePostSlug(db, rawSlug, currentPostId = null) {
  const baseSlug = createSlug(rawSlug || "story", "story");
  let slug = baseSlug;
  let suffix = 2;

  while (true) {
    const existingPost = await db.post.findUnique({
      select: {
        id: true,
      },
      where: {
        slug,
      },
    });

    if (!existingPost || existingPost.id === currentPostId) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

function selectTranslation(post, locale = defaultLocale) {
  return pickTranslation(post?.translations || [], locale);
}

function mapImage(asset) {
  if (!asset) {
    return null;
  }

  return {
    alt: asset.alt || asset.caption || "Story image",
    caption: asset.caption || null,
    height: asset.height || null,
    id: asset.id,
    url: asset.source_url || asset.public_url || null,
    width: asset.width || null,
  };
}

function mapRemoteImage(url, fallbackAlt = "Story image") {
  const normalizedUrl = trimText(url);

  if (!normalizedUrl) {
    return null;
  }

  return {
    alt: fallbackAlt,
    caption: null,
    height: null,
    id: null,
    url: normalizedUrl,
    width: null,
  };
}

function mapPostImage(post, fallbackAlt = "Story image") {
  return mapRemoteImage(post?.sourceArticle?.image_url, fallbackAlt) || mapImage(post?.featuredImage);
}

function mapCategory(category, locale = defaultLocale) {
  return {
    id: category.id,
    name: category.name,
    path: buildLocalizedPath(locale, publicRouteSegments.category(category.slug)),
    slug: category.slug,
  };
}

function mapManualPublishingStream(stream) {
  return {
    destinationName: stream.destination?.name || "Website",
    id: stream.id,
    locale: stream.locale,
    mode: stream.mode,
    name: stream.name,
    status: stream.status,
    templateName: stream.defaultTemplate?.name || null,
    validationIssues: stream.validationIssues || [],
  };
}

function mapPublishAttempt(attempt) {
  const diagnosticSummary = getPublishAttemptDiagnosticSummary(attempt);

  return {
    completed_at: serializeDate(attempt.completed_at),
    created_at: serializeDate(attempt.created_at),
    diagnosticIssueCodes: diagnosticSummary.issueCodes,
    diagnosticReasonCode: diagnosticSummary.reasonCode,
    diagnosticReasonMessage: diagnosticSummary.reasonMessage,
    diagnostics: attempt.diagnostics_json || null,
    last_error_code: attempt.last_error_code || null,
    last_error_message: attempt.last_error_message || null,
    id: attempt.id,
    platform: attempt.platform,
    publicationMode: attempt.diagnostics_json?.publicationMode || null,
    published_at: serializeDate(attempt.published_at),
    queued_at: serializeDate(attempt.queued_at),
    remote_id: attempt.remote_id || null,
    retryable: Boolean(attempt.retryable),
    retry_count: attempt.retry_count,
    status: attempt.status,
  };
}

function mapOptimizationDetails(match) {
  const aiResolution = match?.optimized_payload_json?.aiResolution;

  if (aiResolution?.status) {
    return aiResolution;
  }

  if (match?.optimization_status === "SKIPPED") {
    return {
      last_error_message: null,
      model: null,
      provider: "disabled",
      reasonCode: "cached_ai_skip",
      reasonMessage: "AI optimization was skipped and NewsPub kept deterministic content.",
      status: "SKIPPED",
      usedDeterministicFallback: true,
    };
  }

  if (match?.optimization_status === "FALLBACK") {
    return {
      last_error_message: null,
      model: null,
      provider: "fallback",
      reasonCode: "cached_ai_fallback",
      reasonMessage: "AI optimization fell back to deterministic content.",
      status: "FALLBACK",
      usedDeterministicFallback: true,
    };
  }

  return null;
}

function mapArticleMatch(match) {
  return {
    ban_risk_score: match.ban_risk_score ?? null,
    destination: match.destination
      ? {
          id: match.destination.id,
          kind: match.destination.kind,
          name: match.destination.name,
          platform: match.destination.platform,
          slug: match.destination.slug,
        }
      : null,
    failed_at: serializeDate(match.failed_at),
    fetchedArticle: match.fetchedArticle
      ? {
          id: match.fetchedArticle.id,
          published_at: serializeDate(match.fetchedArticle.published_at),
          source_name: match.fetchedArticle.source_name,
          source_url: match.fetchedArticle.source_url,
          summary: match.fetchedArticle.summary || null,
          title: match.fetchedArticle.title,
        }
      : null,
    holdReasons: Array.isArray(match.hold_reasons_json) ? match.hold_reasons_json : [],
    id: match.id,
    optimizationDetails: mapOptimizationDetails(match),
    last_optimized_at: serializeDate(match.last_optimized_at),
    last_policy_checked_at: serializeDate(match.last_policy_checked_at),
    optimization_status: match.optimization_status || "NOT_REQUESTED",
    optimizedPayload: match.optimized_payload_json || null,
    policyReasons: Array.isArray(match.policy_reasons_json) ? match.policy_reasons_json : [],
    policy_status: match.policy_status || "PASS",
    publishAttempts: (match.publishAttempts || []).map(mapPublishAttempt),
    published_at: serializeDate(match.published_at),
    queued_at: serializeDate(match.queued_at),
    readinessChecks: Array.isArray(match.readiness_checks_json) ? match.readiness_checks_json : [],
    reasons: Array.isArray(match.filter_reasons_json) ? match.filter_reasons_json : [],
    review_notes: match.review_notes || null,
    status: match.status,
    stream: match.stream
      ? {
          id: match.stream.id,
          locale: match.stream.locale,
          mode: match.stream.mode,
          name: match.stream.name,
          status: match.stream.status,
        }
      : null,
    workflow_stage: match.workflow_stage || "INGESTED",
  };
}

function mapInventoryPost(post, locale = defaultLocale) {
  const translation = selectTranslation(post, locale);
  const primaryArticleMatch = post.articleMatches?.[0] || null;
  const websitePublished = (post.publishAttempts || []).some(
    (attempt) => attempt.platform === "WEBSITE" && attempt.status === "SUCCEEDED",
  );

  return {
    articleMatches: (post.articleMatches || []).map(mapArticleMatch),
    categories: (post.categories || []).map(({ category }) => mapCategory(category, locale)),
    editorial_stage: post.editorial_stage,
    excerpt: post.excerpt,
    featuredImage: mapPostImage(post, translation?.title || post.slug),
    id: post.id,
    locale: translation?.locale || locale,
    path: buildLocalizedPath(translation?.locale || locale, publicRouteSegments.newsPost(post.slug)),
    provider_key: post.provider_key,
    published_at: serializeDate(post.published_at),
    reviewWorkflowStage: primaryArticleMatch?.workflow_stage || "INGESTED",
    reviewPolicyStatus: primaryArticleMatch?.policy_status || "PASS",
    reviewOptimizationStatus: primaryArticleMatch?.optimization_status || "NOT_REQUESTED",
    reviewOptimizationDetails: mapOptimizationDetails(primaryArticleMatch),
    scheduled_publish_at: serializeDate(post.scheduled_publish_at),
    slug: post.slug,
    source_name: post.source_name,
    source_url: post.source_url,
    status: post.status,
    summary: translation?.summary || post.excerpt,
    title: translation?.title || post.slug,
    updated_at: serializeDate(post.updated_at),
    websitePublished,
  };
}

function buildInventoryWhere(scope, search) {
  const normalizedScope = normalizeScope(scope);
  const normalizedSearch = trimText(search);

  return {
    ...(normalizedScope === "published"
      ? {
          status: "PUBLISHED",
        }
      : normalizedScope === "review"
        ? {
            status: {
              in: ["DRAFT", "SCHEDULED"],
            },
          }
        : {
            status: {
              not: "ARCHIVED",
            },
          }),
    ...(normalizedSearch
      ? {
          OR: [
            {
              slug: {
                contains: normalizedSearch,
              },
            },
            {
              source_name: {
                contains: normalizedSearch,
              },
            },
            {
              source_url: {
                contains: normalizedSearch,
              },
            },
            {
              excerpt: {
                contains: normalizedSearch,
              },
            },
            {
              translations: {
                some: {
                  OR: [
                    {
                      title: {
                        contains: normalizedSearch,
                      },
                    },
                    {
                      summary: {
                        contains: normalizedSearch,
                      },
                    },
                    {
                      content_md: {
                        contains: normalizedSearch,
                      },
                    },
                  ],
                },
              },
            },
          ],
        }
      : {}),
  };
}

const postInventoryInclude = Object.freeze({
  articleMatches: {
    include: {
      destination: {
        select: {
          id: true,
          kind: true,
          name: true,
          platform: true,
          slug: true,
        },
      },
      fetchedArticle: {
        select: {
          id: true,
          published_at: true,
          source_name: true,
          source_url: true,
          summary: true,
          title: true,
        },
      },
      publishAttempts: {
        orderBy: {
          created_at: "desc",
        },
        select: {
          completed_at: true,
          created_at: true,
          diagnostics_json: true,
          last_error_code: true,
          last_error_message: true,
          id: true,
          platform: true,
          published_at: true,
          queued_at: true,
          remote_id: true,
          retryable: true,
          retry_count: true,
          status: true,
        },
        take: 6,
      },
      stream: {
        select: {
          id: true,
          locale: true,
          mode: true,
          name: true,
          status: true,
        },
      },
    },
    orderBy: {
      created_at: "desc",
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
    orderBy: {
      category: {
        name: "asc",
      },
    },
  },
  featuredImage: {
    select: {
      alt: true,
      caption: true,
      height: true,
      id: true,
      public_url: true,
      source_url: true,
      width: true,
    },
  },
  sourceArticle: {
    select: {
      image_url: true,
    },
  },
  publishAttempts: {
    orderBy: {
      created_at: "desc",
    },
    select: {
      completed_at: true,
      created_at: true,
      diagnostics_json: true,
      last_error_code: true,
      last_error_message: true,
      id: true,
      platform: true,
      published_at: true,
      queued_at: true,
      remote_id: true,
      retryable: true,
      retry_count: true,
      status: true,
    },
    take: 10,
  },
  translations: {
    include: {
      seoRecord: true,
    },
    orderBy: {
      locale: "asc",
    },
  },
});

function mapEditorTranslation(translation) {
  if (!translation) {
    return null;
  }

  return {
    content_html: translation.content_html,
    content_md: translation.content_md,
    id: translation.id,
    locale: translation.locale,
    seo: translation.seoRecord
      ? {
          canonical_url: translation.seoRecord.canonical_url,
          keywords: Array.isArray(translation.seoRecord.keywords_json)
            ? translation.seoRecord.keywords_json
            : [],
          meta_description: translation.seoRecord.meta_description,
          meta_title: translation.seoRecord.meta_title,
          noindex: Boolean(translation.seoRecord.noindex),
        }
      : null,
    source_attribution: translation.source_attribution,
    structured_content_json: translation.structured_content_json,
    summary: translation.summary,
    title: translation.title,
    updated_at: serializeDate(translation.updated_at),
  };
}

async function rebuildTranslationArtifacts(db, post, locale, nextCategoryIds, overrides = {}) {
  const categories = nextCategoryIds.length
    ? await db.category.findMany({
        where: {
          id: {
            in: nextCategoryIds,
          },
        },
      })
    : [];
  const currentTranslation = pickTranslation(post.translations, locale) || null;
  const title = trimText(overrides.title) || currentTranslation?.title || post.slug;
  const summary = trimText(overrides.summary) || currentTranslation?.summary || post.excerpt || title;
  const body = trimText(overrides.content_md) || currentTranslation?.content_md || summary;
  const article = buildStoryStructuredArticle({
    body,
    categoryNames: categories.map((category) => category.name),
    source_name: post.source_name,
    source_url: post.source_url,
    summary,
    title,
  });

  const translation = await db.postTranslation.upsert({
    where: {
      post_id_locale: {
        locale,
        post_id: post.id,
      },
    },
    update: {
      content_html: article.content_html,
      content_md: body,
      source_attribution: `Source: ${post.source_name} - ${post.source_url}`,
      structured_content_json: article.article,
      summary,
      title,
    },
    create: {
      content_html: article.content_html,
      content_md: body,
      locale,
      post_id: post.id,
      source_attribution: `Source: ${post.source_name} - ${post.source_url}`,
      structured_content_json: article.article,
      summary,
      title,
    },
  });
  const canonical_url = buildLocalizedPath(locale, publicRouteSegments.newsPost(post.slug));

  await db.sEORecord.upsert({
    where: {
      post_translation_id: translation.id,
    },
    update: {
      authors_json: ["NewsPub Editorial"],
      canonical_url,
      keywords_json: dedupeStrings([
        post.source_name,
        ...categories.map((category) => category.name),
      ]),
      meta_description: summary,
      meta_title: title,
      og_description: summary,
      og_image_id: post.featured_image_id || null,
      og_title: title,
      twitter_description: summary,
      twitter_title: title,
    },
    create: {
      authors_json: ["NewsPub Editorial"],
      canonical_url,
      keywords_json: dedupeStrings([
        post.source_name,
        ...categories.map((category) => category.name),
      ]),
      meta_description: summary,
      meta_title: title,
      og_description: summary,
      og_image_id: post.featured_image_id || null,
      og_title: title,
      post_translation_id: translation.id,
      twitter_description: summary,
      twitter_title: title,
    },
  });
}

async function syncPostCategories(db, post_id, categoryIds) {
  await db.postCategory.deleteMany({
    where: {
      post_id,
    },
  });

  for (const category_id of categoryIds) {
    await db.postCategory.create({
      data: {
        category_id,
        post_id,
      },
    });
  }
}

async function invalidateLinkedArticleMatchOptimizations(db, post_id) {
  if (typeof db.articleMatch?.updateMany !== "function") {
    return;
  }

  await db.articleMatch.updateMany({
    data: {
      ban_risk_score: null,
      hold_reasons_json: [],
      last_optimized_at: null,
      optimization_cache_id: null,
      optimization_hash: null,
      optimization_status: "NOT_REQUESTED",
      optimized_payload_json: null,
      policy_reasons_json: null,
      policy_status: "PASS",
      readiness_checks_json: null,
      status: "ELIGIBLE",
      workflow_stage: "INGESTED",
    },
    where: {
      canonical_post_id: post_id,
      status: {
        not: "PUBLISHED",
      },
    },
  });
}

function selectPublishableArticleMatch(post, article_match_id = null) {
  if (article_match_id) {
    return post.articleMatches.find((match) => match.id === article_match_id) || null;
  }

  return (
    post.articleMatches.find(
      (match) =>
        match.destination?.platform === "WEBSITE" &&
        !["PUBLISHED", "FAILED", "DUPLICATE", "SKIPPED"].includes(match.status),
    ) ||
    post.articleMatches.find(
      (match) => !["PUBLISHED", "FAILED", "DUPLICATE", "SKIPPED"].includes(match.status),
    ) ||
    null
  );
}

function selectRepostableArticleMatch(post, article_match_id = null) {
  if (article_match_id) {
    return post.articleMatches.find((match) => match.id === article_match_id) || null;
  }

  return (
    post.articleMatches.find((match) => match.destination?.platform === "WEBSITE")
    || post.articleMatches[0]
    || null
  );
}

async function listWebsitePublishingStreams(db) {
  const streams = await db.publishingStream.findMany({
    include: {
      activeProvider: {
        select: {
          id: true,
          provider_key: true,
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
  });

  return streams
    .filter((stream) => stream.destination?.platform === "WEBSITE" && stream.destination?.kind === "WEBSITE")
    .map((stream) => ({
      ...stream,
      validationIssues: getStreamValidationIssues({
        destination: stream.destination,
        mode: stream.mode,
        template: stream.defaultTemplate,
      }),
    }));
}

async function resolveManualPostWebsiteStream(db, stream_id = null) {
  const websiteStreams = await listWebsitePublishingStreams(db);

  if (!websiteStreams.length) {
    throw new NewsPubError("Create a website stream before creating manual stories.", {
      status: "manual_post_stream_not_found",
      statusCode: 400,
    });
  }

  const selectedStream = stream_id
    ? websiteStreams.find((stream) => stream.id === stream_id) || null
    : websiteStreams.find((stream) => !stream.validationIssues.length && stream.status === "ACTIVE")
      || websiteStreams.find((stream) => !stream.validationIssues.length)
      || null;

  if (!selectedStream) {
    throw new NewsPubError("No publish-ready website stream is available for manual stories.", {
      status: "manual_post_stream_not_ready",
      statusCode: 400,
    });
  }

  if (selectedStream.validationIssues.length) {
    throw new NewsPubError(selectedStream.validationIssues[0].message, {
      status: "manual_post_stream_not_ready",
      statusCode: 400,
    });
  }

  return selectedStream;
}

function parsePublishAt(value) {
  const rawValue = trimText(value);

  if (!rawValue) {
    return null;
  }

  const publishAt = new Date(rawValue);

  if (Number.isNaN(publishAt.getTime())) {
    throw new NewsPubError("Publish time must be a valid date.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  return publishAt;
}
/**
 * Returns the admin inventory snapshot for NewsPub canonical posts.
 */

export async function getPostInventorySnapshot(options = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const scope = normalizeScope(options.scope);
  const locale = trimText(options.locale).toLowerCase() || defaultLocale;
  const paginationPage = normalizePage(options.page);
  const where = buildInventoryWhere(scope, options.search);
  const totalItems = await db.post.count({ where });
  const pagination = createPagination(totalItems, paginationPage);
  const posts = await db.post.findMany({
    include: postInventoryInclude,
    orderBy: [{ published_at: "desc" }, { updated_at: "desc" }, { created_at: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });
  const [reviewCount, published_count, scheduledCount, archivedCount] = await Promise.all([
    db.post.count({
      where: {
        status: {
          in: ["DRAFT", "SCHEDULED"],
        },
      },
    }),
    db.post.count({
      where: {
        status: "PUBLISHED",
      },
    }),
    db.post.count({
      where: {
        status: "SCHEDULED",
      },
    }),
    db.post.count({
      where: {
        status: "ARCHIVED",
      },
    }),
  ]);

  return {
    items: posts.map((post) => mapInventoryPost(post, locale)),
    pagination,
    scope,
    summary: {
      archivedCount,
      published_count,
      reviewCount,
      scheduledCount,
      totalCount: reviewCount + published_count + archivedCount,
    },
  };
}
/**
 * Returns the data needed to render the NewsPub manual story creation flow.
 */

export async function getManualPostCreationSnapshot({ locale = defaultLocale } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const [categories, websiteStreams] = await Promise.all([
    db.category.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    listWebsitePublishingStreams(db),
  ]);
  const availableStreams = websiteStreams.filter((stream) => !stream.validationIssues.length);
  const defaultStream =
    availableStreams.find((stream) => stream.status === "ACTIVE") || availableStreams[0] || null;

  return {
    categories: categories.map((category) => mapCategory(category, locale)),
    defaultStreamId: defaultStream?.id || null,
    locale,
    websiteStreams: websiteStreams.map(mapManualPublishingStream),
  };
}

/** Returns the editor payload for one canonical post and one active locale. */
export async function getPostEditorSnapshot({ locale = defaultLocale, post_id } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const post = await db.post.findUnique({
    include: {
      ...postInventoryInclude,
      sourceArticle: {
        select: {
          author: true,
          body: true,
          id: true,
          image_url: true,
          language: true,
          provider_article_id: true,
          provider_categories_json: true,
          provider_countries_json: true,
          provider_regions_json: true,
          published_at: true,
          source_name: true,
          source_url: true,
          summary: true,
          tags_json: true,
          title: true,
        },
      },
    },
    where: {
      id: post_id,
    },
  });

  if (!post) {
    throw new NewsPubError("The requested post was not found.", {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const [categories, auditEvents] = await Promise.all([
    db.category.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
    typeof db.auditEvent?.findMany === "function"
      ? db.auditEvent.findMany({
          orderBy: [{ created_at: "desc" }],
          take: 12,
          where: {
            OR: [
              {
                entity_id: post.id,
              },
              {
                entity_id: {
                  in: post.articleMatches.map((match) => match.id),
                },
              },
              {
                entity_id: {
                  in: (post.publishAttempts || []).map((attempt) => attempt.id),
                },
              },
            ],
          },
        })
      : Promise.resolve([]),
  ]);
  const activeTranslation = selectTranslation(post, locale);

  return {
    auditEvents: auditEvents.map(mapAuditEvent),
    categories: categories.map((category) => mapCategory(category, locale)),
    editorialStageValues: editorialStageOrder,
    post: {
      articleMatches: (post.articleMatches || []).map(mapArticleMatch),
      categories: (post.categories || []).map(({ category }) => mapCategory(category, locale)),
      editorial_stage: post.editorial_stage,
      excerpt: post.excerpt,
      featuredImage: mapPostImage(post, activeTranslation?.title || post.slug),
      id: post.id,
      provider_key: post.provider_key,
      published_at: serializeDate(post.published_at),
      scheduled_publish_at: serializeDate(post.scheduled_publish_at),
      slug: post.slug,
      sourceArticle: post.sourceArticle
        ? {
            author: post.sourceArticle.author || null,
            body: post.sourceArticle.body || null,
            id: post.sourceArticle.id,
            image_url: post.sourceArticle.image_url || null,
            language: post.sourceArticle.language || null,
            provider_article_id: post.sourceArticle.provider_article_id || null,
            providerCategories: Array.isArray(post.sourceArticle.provider_categories_json)
              ? post.sourceArticle.provider_categories_json
              : [],
            providerCountries: Array.isArray(post.sourceArticle.provider_countries_json)
              ? post.sourceArticle.provider_countries_json
              : [],
            providerRegions: Array.isArray(post.sourceArticle.provider_regions_json)
              ? post.sourceArticle.provider_regions_json
              : [],
            published_at: serializeDate(post.sourceArticle.published_at),
            source_name: post.sourceArticle.source_name,
            source_url: post.sourceArticle.source_url,
            summary: post.sourceArticle.summary || null,
            tags: Array.isArray(post.sourceArticle.tags_json) ? post.sourceArticle.tags_json : [],
            title: post.sourceArticle.title,
          }
        : null,
      source_name: post.source_name,
      source_url: post.source_url,
      status: post.status,
      translations: post.translations.map(mapEditorTranslation),
      websitePath: buildLocalizedPath(
        activeTranslation?.locale || locale,
        publicRouteSegments.newsPost(post.slug),
      ),
    },
    selectedTranslation: mapEditorTranslation(activeTranslation),
    statusValues: postStatusValues,
  };
}
/**
 * Creates a manual NewsPub canonical post and routes it through the normal workflow.
 */

export async function createManualPostRecord(input = {}, { actor_id = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const action = trimText(input.action).toLowerCase();
  const requestedStatus = trimText(input.status).toUpperCase();
  const shouldSchedule = requestedStatus === "SCHEDULED" || action === "schedule";
  const shouldPublish = requestedStatus === "PUBLISHED" || shouldSchedule || action === "publish";
  const stream = await resolveManualPostWebsiteStream(db, trimText(input.stream_id) || null);
  const locale = trimText(input.locale).toLowerCase() || trimText(stream.locale).toLowerCase() || defaultLocale;
  const title = trimText(input.title);
  const source_name = trimText(input.source_name);
  const source_url = trimText(input.source_url);
  const summary = trimText(input.summary) || title;
  const content_md = trimText(input.content_md) || summary || title;
  const publishAt = parsePublishAt(input.publishAt);
  const nextCategoryIds = Array.isArray(input.categoryIds)
    ? dedupeStrings(input.categoryIds).filter(Boolean)
    : [];

  if (!title || !source_name || !source_url) {
    throw new NewsPubError("Title, source name, and source URL are required for manual stories.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  if (shouldSchedule && (!publishAt || publishAt <= new Date())) {
    throw new NewsPubError("Choose a future publish time to schedule the story.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  const slug = await createUniquePostSlug(db, input.slug || title);
  const created_at = new Date();
  const fingerprint = createContentHash(
    "manual_post",
    slug,
    source_url,
    actor_id || "",
    created_at.toISOString(),
  );
  const sourceArticle = await db.fetchedArticle.create({
    data: {
      body: content_md,
      dedupe_fingerprint: fingerprint,
      image_url: null,
      language: locale,
      normalized_title_hash: createContentHash(title),
      provider_article_id: `manual-${fingerprint.slice(0, 24)}`,
      provider_categories_json: [],
      provider_config_id: stream.activeProvider.id,
      provider_countries_json: [],
      provider_regions_json: [],
      published_at: created_at,
      raw_payload_json: {
        createdBy: actor_id,
        manualEntry: true,
        stream_id: stream.id,
      },
      source_name,
      source_url,
      source_url_hash: createContentHash(source_url),
      summary,
      tags_json: [],
      title,
    },
  });
  const post = await db.post.create({
    data: {
      author_id: actor_id || null,
      canonical_content_hash: createContentHash(title, summary, content_md, source_url),
      excerpt: summary,
      provider_key: manualProviderKey,
      slug,
      source_article_id: sourceArticle.id,
      source_name,
      source_url,
      status: "DRAFT",
    },
  });

  await syncPostCategories(db, post.id, nextCategoryIds);
  await rebuildTranslationArtifacts(
    db,
    {
      ...post,
      translations: [],
    },
    locale,
    nextCategoryIds,
    {
      content_md,
      summary,
      title,
    },
  );

  const articleMatch = await db.articleMatch.create({
    data: {
      canonical_post_id: post.id,
      destination_id: stream.destination_id,
      fetched_article_id: sourceArticle.id,
      hold_reasons_json: shouldPublish ? [] : ["manual_story_pending_editorial_review"],
      override_notes: "Created manually from the admin story form.",
      status: shouldPublish ? "ELIGIBLE" : "HELD_FOR_REVIEW",
      stream_id: stream.id,
    },
  });

  await createAuditEventRecord(
    {
      action: "MANUAL_POST_CREATED",
      actor_id,
      entity_id: post.id,
      entity_type: "post",
      payload_json: {
        destination_id: stream.destination_id,
        locale,
        source_article_id: sourceArticle.id,
        stream_id: stream.id,
      },
    },
    db,
  );

  if (shouldPublish) {
    await publishArticleMatch(articleMatch.id, publishAt ? { publishAt } : {}, db);
  }

  return {
    locale,
    post_id: post.id,
  };
}

/** Applies editorial updates and optionally publishes or schedules the linked article match. */
export async function updatePostEditorialRecord(input = {}, { actor_id = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const locale = trimText(input.locale).toLowerCase() || defaultLocale;
  const action = trimText(input.action).toLowerCase();
  const post = await db.post.findUnique({
    include: {
      articleMatches: {
        include: {
          destination: true,
          stream: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
      categories: {
        select: {
          category_id: true,
        },
      },
      translations: true,
    },
    where: {
      id: input.post_id,
    },
  });

  if (!post) {
    throw new NewsPubError("The requested post was not found.", {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const nextCategoryIds = Array.isArray(input.categoryIds)
    ? dedupeStrings(input.categoryIds).filter(Boolean)
    : post.categories.map((entry) => entry.category_id);
  const nextSlug = input.slug ? await createUniquePostSlug(db, input.slug, post.id) : post.slug;
  const requestedStatus = trimText(input.status).toUpperCase();
  const publishAt = parsePublishAt(input.publishAt);
  const shouldApprove = action === "approve";
  const shouldOptimize = action === "optimize";
  const shouldReject = action === "reject";
  const shouldSchedule = action === "schedule" || (!action && requestedStatus === "SCHEDULED");
  const shouldPublish =
    shouldSchedule ||
    action === "publish" ||
    (!action && requestedStatus === "PUBLISHED");
  const shouldInvalidateOptimizations =
    input.slug !== undefined ||
    input.title !== undefined ||
    input.summary !== undefined ||
    input.content_md !== undefined ||
    Array.isArray(input.categoryIds);

  if (shouldSchedule && (!publishAt || publishAt <= new Date())) {
    throw new NewsPubError("Choose a future publish time to schedule the story.", {
      status: "manual_post_validation_failed",
      statusCode: 400,
    });
  }

  await db.post.update({
    where: {
      id: post.id,
    },
    data: {
      editorial_stage:
        editorialStageOrder.includes(trimText(input.editorial_stage).toUpperCase())
          ? trimText(input.editorial_stage).toUpperCase()
          : post.editorial_stage,
      excerpt: trimText(input.summary) || post.excerpt,
      slug: nextSlug,
      ...(requestedStatus === "ARCHIVED"
        ? {
            published_at: post.published_at,
            status: "ARCHIVED",
          }
        : requestedStatus === "DRAFT"
          ? {
              status: "DRAFT",
            }
          : {}),
    },
  });

  await syncPostCategories(db, post.id, nextCategoryIds);
  await rebuildTranslationArtifacts(
    db,
    {
      ...post,
      slug: nextSlug,
    },
    locale,
    nextCategoryIds,
    {
      content_md: input.content_md,
      summary: input.summary,
      title: input.title,
    },
  );

  await db.post.update({
    where: {
      id: post.id,
    },
    data: {
      canonical_content_hash: createContentHash(
        trimText(input.title) || selectTranslation(post, locale)?.title || post.slug,
        trimText(input.summary) || post.excerpt,
        trimText(input.content_md) || selectTranslation(post, locale)?.content_md || post.excerpt,
        post.source_url,
      ),
    },
  });

  if (shouldInvalidateOptimizations) {
    await invalidateLinkedArticleMatchOptimizations(db, post.id);
  }

  await createAuditEventRecord(
    {
      action: "POST_EDITOR_UPDATED",
      actor_id,
      entity_id: post.id,
      entity_type: "post",
      payload_json: {
        editorial_stage: trimText(input.editorial_stage).toUpperCase() || post.editorial_stage,
        locale,
        slug: nextSlug,
        status: requestedStatus || post.status,
      },
    },
    db,
  );

  const targetArticleMatch = selectPublishableArticleMatch(post, input.article_match_id);

  if (shouldReject) {
    if (!targetArticleMatch) {
      throw new NewsPubError("Select a destination match before rejecting publication for this story.", {
        status: "article_match_not_found",
        statusCode: 400,
      });
    }

    await db.articleMatch.update({
      where: {
        id: targetArticleMatch.id,
      },
      data: {
        hold_reasons_json: dedupeStrings(["rejected_by_editor"]),
        review_notes: "Rejected during editor review.",
        status: "HELD_FOR_REVIEW",
        workflow_stage: "HELD",
      },
    });
  }

  if (shouldOptimize) {
    if (!targetArticleMatch) {
      throw new NewsPubError("Select a destination match before running optimization.", {
        status: "article_match_not_found",
        statusCode: 400,
      });
    }

    await refreshArticleMatchOptimization(targetArticleMatch.id, { force: true }, db);
  }

  if (shouldApprove) {
    if (!targetArticleMatch) {
      throw new NewsPubError("Select a destination match before approving this story.", {
        status: "article_match_not_found",
        statusCode: 400,
      });
    }

    if (targetArticleMatch.policy_status === "BLOCK") {
      throw new NewsPubError("Blocked policy findings must be fixed or re-optimized before approval.", {
        status: "article_match_policy_blocked",
        statusCode: 400,
      });
    }

    await db.articleMatch.update({
      where: {
        id: targetArticleMatch.id,
      },
      data: {
        hold_reasons_json: [],
        review_notes: "Approved during editor review.",
        status: "ELIGIBLE",
        workflow_stage: "APPROVED",
      },
    });
  }

  if (shouldPublish) {
    const refreshedPost = await db.post.findUnique({
      include: {
        articleMatches: {
          include: {
            destination: true,
            stream: true,
          },
          orderBy: {
            created_at: "desc",
          },
        },
      },
      where: {
        id: post.id,
      },
    });
    const articleMatch = selectPublishableArticleMatch(refreshedPost, input.article_match_id);

    if (!articleMatch) {
      throw new NewsPubError(
        "This post is not linked to a publishable article match. Run a stream or review the destination links first.",
        {
          status: "article_match_not_found",
          statusCode: 400,
        },
      );
    }

    await publishArticleMatch(
      articleMatch.id,
      publishAt && !Number.isNaN(publishAt.getTime()) ? { publishAt } : {},
      db,
    );
  }

  return getPostEditorSnapshot(
    {
      locale,
      post_id: post.id,
    },
    db,
  );
}
/**
 * Creates a repost request for an existing NewsPub canonical post.
 */

export async function repostPostRecord(input = {}, { actor_id = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const post_id = trimText(input.post_id);
  const article_match_id = trimText(input.article_match_id) || null;
  const post = await db.post.findUnique({
    include: {
      articleMatches: {
        include: {
          destination: true,
          stream: true,
        },
        orderBy: {
          created_at: "desc",
        },
      },
    },
    where: {
      id: post_id,
    },
  });

  if (!post) {
    throw new NewsPubError("The requested post was not found.", {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const articleMatch = selectRepostableArticleMatch(post, article_match_id);

  if (!articleMatch) {
    throw new NewsPubError(
      "This post is not linked to a destination match yet. Run a stream or create a manual publishing match first.",
      {
        status: "article_match_not_found",
        statusCode: 400,
      },
    );
  }

  const publishAttempt = await manualRepostArticleMatch(articleMatch.id, { actor_id }, db);

  return {
    article_match_id: articleMatch.id,
    attemptId: publishAttempt.id,
    post_id: post.id,
  };
}

/** Resolves a published translation by slug for public route consumption. */
export async function getPublishedPostTranslationBySlug({ locale = defaultLocale, slug } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const post = await db.post.findFirst({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      featuredImage: true,
      sourceArticle: {
        select: {
          image_url: true,
        },
      },
      publishAttempts: {
        where: {
          platform: "WEBSITE",
          status: "SUCCEEDED",
        },
      },
      translations: {
        include: {
          seoRecord: true,
        },
      },
    },
    where: {
      publishAttempts: {
        some: {
          platform: "WEBSITE",
          status: "SUCCEEDED",
        },
      },
      slug,
      status: "PUBLISHED",
    },
  });

  if (!post) {
    return null;
  }

  const translation = selectTranslation(post, locale);

  if (!translation) {
    return null;
  }

  return {
    categories: post.categories.map(({ category }) => mapCategory(category, translation.locale)),
    featuredImage: mapPostImage(post, translation.title),
    id: post.id,
    locale: translation.locale,
    path: buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug)),
    post_id: post.id,
    published_at: serializeDate(post.published_at),
    seo: translation.seoRecord
      ? {
          canonical_url: translation.seoRecord.canonical_url,
          keywords: Array.isArray(translation.seoRecord.keywords_json)
            ? translation.seoRecord.keywords_json
            : [],
          meta_description: translation.seoRecord.meta_description,
          meta_title: translation.seoRecord.meta_title,
        }
      : null,
    slug: post.slug,
    source_attribution: translation.source_attribution,
    source_name: post.source_name,
    source_url: post.source_url,
    structured_content_json: translation.structured_content_json,
    summary: translation.summary,
    title: translation.title,
  };
}

export const EditorialWorkflowError = NewsPubError;
export const LocalizedContentError = NewsPubError;
export const CategoryManagementError = NewsPubError;

export const createEditorialWorkflowErrorPayload = createPostErrorPayload;
export const createLocalizedContentErrorPayload = createPostErrorPayload;
export const createCategoryManagementErrorPayload = createPostErrorPayload;

export const getPostPublicRecordBySlug = getPublishedPostTranslationBySlug;
