/**
 * Core NewsPub ingest, filtering, optimization, review, and publication workflows.
 */

import { createAuditEventRecord, recordObservabilityEvent } from "@/lib/analytics";
import { optimizeDestinationPayload } from "@/lib/ai";
import { getDestinationSocialGuardrails } from "@/features/destinations/meta-config";
import { getDestinationManagementSnapshot } from "@/features/destinations";
import { discoverRemoteImageUrl } from "@/lib/media";
import { fetchProviderArticles } from "@/lib/news/providers";
import {
  isArticleInsideFetchWindow,
  resolveExecutionFetchWindow,
  serializeFetchWindow,
} from "@/lib/news/fetch-window";
import { planSharedFetchGroups, serializeSharedFetchGroup } from "@/lib/news/shared-fetch";
import { getStreamSocialPostSettings } from "@/lib/news/social-post";
import {
  NewsPubError,
  buildStoryStructuredArticle,
  createContentHash,
  createPagination,
  createSlug,
  dedupeStrings,
  normalizeSearchText,
  pickTranslation,
  renderTemplateString,
  resolvePrismaClient,
  serializeDate,
  trimText,
} from "@/lib/news/shared";
import { getPublishAttemptDiagnosticSummary } from "@/lib/news/publish-diagnostics";
import { revalidatePublishedPostPaths } from "@/lib/revalidation";
import { env } from "@/lib/env/server";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { isDestinationRuntimeReady } from "@/lib/news/destination-runtime";
import { DestinationPublishError, publishExternalDestination } from "@/lib/news/publishers";
import { getStreamValidationIssues } from "@/lib/validation/configuration";

function toAbsoluteUrl(path) {
  return new URL(path, env.app.url).toString();
}

function getArticleSearchText(article) {
  return normalizeSearchText(
    [
      article.title,
      article.summary,
      article.body,
      ...(article.tags || []),
      ...(article.providerCategories || []),
      ...(article.providerCountries || []),
      ...(article.providerRegions || []),
    ]
      .filter(Boolean)
      .join(" "),
  );
}

function getStreamMaxPostsPerRun(stream) {
  return Math.max(1, Number.parseInt(`${stream?.maxPostsPerRun || 5}`, 10) || 5);
}

function normalizePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value || ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function coerceDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedValue = new Date(value);

    if (!Number.isNaN(parsedValue.getTime())) {
      return parsedValue;
    }
  }

  return null;
}

function getFetchRunLeaseMs() {
  return normalizePositiveInteger(process.env.NEWS_PUB_FETCH_RUN_LEASE_MS, 5 * 60 * 1000);
}

function getPublishAttemptLeaseMs() {
  return normalizePositiveInteger(process.env.NEWS_PUB_PUBLISH_ATTEMPT_LEASE_MS, 10 * 60 * 1000);
}

function getLeaseExpiration(now, leaseMs) {
  return new Date(now.getTime() + leaseMs);
}

function createLeaseOwner(prefix) {
  return `${prefix}_${createContentHash(prefix, Date.now(), Math.random()).slice(0, 24)}`;
}

function buildInitialFetchRunExecutionDetails(fetchWindow) {
  return {
    checkpointStrategy: {
      usesExplicitBoundaries: Boolean(fetchWindow?.usesExplicitBoundaries),
      usesProviderCheckpoint: Boolean(fetchWindow?.usesProviderCheckpoint),
      writeCheckpointOnSuccess: Boolean(fetchWindow?.writeCheckpointOnSuccess),
    },
    streamFetchWindow: serializeFetchWindow(fetchWindow),
  };
}

function resolveStoredFetchWindow(fetchRun, checkpoint, now = new Date()) {
  const storedWindow = fetchRun?.executionDetailsJson?.streamFetchWindow || null;
  const storedStart = coerceDate(storedWindow?.start) || coerceDate(fetchRun?.windowStart);
  const storedEnd = coerceDate(storedWindow?.end) || coerceDate(fetchRun?.windowEnd);

  if (storedStart || storedEnd) {
    return {
      end: storedEnd || now,
      source: storedWindow?.source || (fetchRun?.triggerType === "scheduled" ? "checkpoint" : "explicit"),
      start: storedStart || checkpoint?.lastSuccessfulFetchAt || now,
      usesExplicitBoundaries: Boolean(storedWindow?.usesExplicitBoundaries),
      usesProviderCheckpoint: Boolean(storedWindow?.usesProviderCheckpoint),
      writeCheckpointOnSuccess:
        typeof storedWindow?.writeCheckpointOnSuccess === "boolean"
          ? storedWindow.writeCheckpointOnSuccess
          : fetchRun?.triggerType === "scheduled",
    };
  }

  return resolveFetchWindowForExecution({
    checkpoint,
    now,
    requestedWindow: null,
    writeCheckpointOnSuccess: fetchRun?.triggerType === "scheduled",
  });
}

/**
 * Resolves the normalized fetch window used for one NewsPub stream execution.
 */
export function resolveStreamFetchWindow({ checkpoint = null, now = new Date() } = {}) {
  return resolveExecutionFetchWindow({
    checkpoint,
    now,
  });
}

function findMatchingCategoryIds(article, streamCategories = []) {
  if (!streamCategories.length) {
    return [];
  }

  const normalizedSearch = getArticleSearchText(article);

  return streamCategories
    .filter((category) => {
      const categoryTerms = [category.name, category.slug].map((value) => normalizeSearchText(value));

      return categoryTerms.some((term) => term && normalizedSearch.includes(term));
    })
    .map((category) => category.id);
}

function evaluateArticleAgainstStream(article, stream, { fetchWindow = null } = {}) {
  const reasons = [];
  const normalizedSearch = getArticleSearchText(article);
  const includeKeywords = dedupeStrings(stream.includeKeywordsJson || []).map((keyword) =>
    normalizeSearchText(keyword),
  );
  const excludeKeywords = dedupeStrings(stream.excludeKeywordsJson || []).map((keyword) =>
    normalizeSearchText(keyword),
  );
  const languageAllowlist = dedupeStrings(stream.languageAllowlistJson || []);
  const countryAllowlist = dedupeStrings(stream.countryAllowlistJson || []);
  const regionAllowlist = dedupeStrings(stream.regionAllowlistJson || []);
  const matchedCategoryIds = findMatchingCategoryIds(
    article,
    stream.categories.map((entry) => entry.category),
  );

  if (!isArticleInsideFetchWindow(article, fetchWindow)) {
    reasons.push("outside_fetch_window");
  }

  if (languageAllowlist.length && !languageAllowlist.includes(trimText(article.language).toLowerCase())) {
    reasons.push("language_not_allowed");
  }

  if (
    countryAllowlist.length &&
    !countryAllowlist.some((country) => (article.providerCountries || []).includes(country))
  ) {
    reasons.push("country_not_allowed");
  }

  if (
    regionAllowlist.length &&
    !regionAllowlist.some((region) => (article.providerRegions || []).includes(region))
  ) {
    reasons.push("region_not_allowed");
  }

  if (includeKeywords.length && !includeKeywords.some((keyword) => normalizedSearch.includes(keyword))) {
    reasons.push("include_keywords_not_matched");
  }

  if (excludeKeywords.some((keyword) => normalizedSearch.includes(keyword))) {
    reasons.push("exclude_keyword_matched");
  }

  if (stream.categories.length && !matchedCategoryIds.length) {
    reasons.push("stream_category_not_matched");
  }

  if (reasons.length) {
    return {
      matchedCategoryIds,
      reasons,
      status: "SKIPPED",
    };
  }

  return {
    matchedCategoryIds,
    reasons: [],
    status: stream.mode === "REVIEW_REQUIRED" ? "HELD_FOR_REVIEW" : "ELIGIBLE",
  };
}

/**
 * Resolves the best available image URL for a fetched article, falling back to source discovery when needed.
 */
export async function resolveFetchedArticleImageUrl(article = {}) {
  const directImageUrl = trimText(article.imageUrl);

  if (directImageUrl) {
    return directImageUrl;
  }

  return discoverRemoteImageUrl(article.sourceUrl);
}

function buildFetchedArticleCreateData(articleCandidate, stream, resolvedImageUrl, now) {
  return {
    body: articleCandidate.body || null,
    dedupeFingerprint: articleCandidate.dedupeFingerprint,
    imageUrl: resolvedImageUrl || null,
    language: trimText(articleCandidate.language) || null,
    normalizedTitleHash: articleCandidate.normalizedTitleHash,
    providerArticleId: articleCandidate.providerArticleId || null,
    providerCategoriesJson: articleCandidate.providerCategories || [],
    providerConfigId: stream.activeProviderId,
    providerCountriesJson: articleCandidate.providerCountries || [],
    providerRegionsJson: articleCandidate.providerRegions || [],
    publishedAt: new Date(articleCandidate.publishedAt || now),
    rawPayloadJson: articleCandidate.rawPayloadJson || null,
    sourceName: articleCandidate.sourceName,
    sourceUrl: articleCandidate.sourceUrl,
    sourceUrlHash: articleCandidate.sourceUrlHash,
    summary: articleCandidate.summary || articleCandidate.title,
    tagsJson: articleCandidate.tags || [],
    title: articleCandidate.title,
  };
}

function buildFetchedArticleUpdateData(articleCandidate, stream, resolvedImageUrl, now) {
  return {
    ...(articleCandidate.body
      ? {
          body: articleCandidate.body,
        }
      : {}),
    ...(resolvedImageUrl
      ? {
          imageUrl: resolvedImageUrl,
        }
      : {}),
    ...(trimText(articleCandidate.language)
      ? {
          language: trimText(articleCandidate.language),
        }
      : {}),
    normalizedTitleHash: articleCandidate.normalizedTitleHash,
    ...(articleCandidate.providerArticleId
      ? {
          providerArticleId: articleCandidate.providerArticleId,
        }
      : {}),
    providerCategoriesJson: articleCandidate.providerCategories || [],
    providerConfigId: stream.activeProviderId,
    providerCountriesJson: articleCandidate.providerCountries || [],
    providerRegionsJson: articleCandidate.providerRegions || [],
    publishedAt: new Date(articleCandidate.publishedAt || now),
    ...(articleCandidate.rawPayloadJson
      ? {
          rawPayloadJson: articleCandidate.rawPayloadJson,
        }
      : {}),
    sourceName: articleCandidate.sourceName,
    sourceUrl: articleCandidate.sourceUrl,
    sourceUrlHash: articleCandidate.sourceUrlHash,
    summary: articleCandidate.summary || articleCandidate.title,
    tagsJson: articleCandidate.tags || [],
    title: articleCandidate.title,
  };
}

async function upsertFetchedArticle(db, articleCandidate, stream, resolvedImageUrl, now) {
  const createData = buildFetchedArticleCreateData(articleCandidate, stream, resolvedImageUrl, now);

  return db.fetchedArticle.upsert({
    where: {
      dedupeFingerprint: articleCandidate.dedupeFingerprint,
    },
    update: buildFetchedArticleUpdateData(articleCandidate, stream, resolvedImageUrl, now),
    create: createData,
  });
}

async function findLatestDuplicateArticleMatch(db, article, stream) {
  const duplicateWindowHours = Math.max(0, Number(stream?.duplicateWindowHours || 48));
  const duplicateWindowStart = new Date(Date.now() - duplicateWindowHours * 60 * 60 * 1000);

  return db.articleMatch.findFirst({
    include: {
      canonicalPost: {
        select: {
          id: true,
          slug: true,
        },
      },
      fetchedArticle: {
        select: {
          id: true,
          normalizedTitleHash: true,
          providerArticleId: true,
          publishedAt: true,
          sourceUrlHash: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    where: {
      destinationId: stream.destinationId,
      OR: [
        article.providerArticleId
          ? {
              fetchedArticle: {
                providerArticleId: article.providerArticleId,
                providerConfigId: stream.activeProviderId,
              },
            }
          : null,
        article.sourceUrlHash
          ? {
              fetchedArticle: {
                sourceUrlHash: article.sourceUrlHash,
              },
            }
          : null,
        {
          fetchedArticle: {
            normalizedTitleHash: article.normalizedTitleHash,
            publishedAt: {
              gte: duplicateWindowStart,
            },
          },
        },
      ].filter(Boolean),
    },
  });
}

function getDuplicateMatchReferenceDate(duplicateMatch) {
  if (!duplicateMatch) {
    return null;
  }

  return (
    (duplicateMatch.publishedAt instanceof Date && duplicateMatch.publishedAt)
    || (duplicateMatch.createdAt instanceof Date && duplicateMatch.createdAt)
    || (duplicateMatch.fetchedArticle?.publishedAt instanceof Date && duplicateMatch.fetchedArticle.publishedAt)
    || null
  );
}

/**
 * Classifies how an existing article match should affect a new NewsPub publication attempt.
 */
export function classifyDuplicateCandidate(
  duplicateMatch,
  { duplicateWindowHours = 48, now = new Date() } = {},
) {
  if (!duplicateMatch) {
    return "unique";
  }

  const duplicateReferenceDate = getDuplicateMatchReferenceDate(duplicateMatch);

  if (!duplicateReferenceDate) {
    return "repost_eligible_duplicate";
  }

  const duplicateWindowStart = new Date(
    now.getTime() - Math.max(0, duplicateWindowHours) * 60 * 60 * 1000,
  );

  return duplicateReferenceDate >= duplicateWindowStart
    ? "blocked_duplicate"
    : "repost_eligible_duplicate";
}

/**
 * Selects the candidate set that a NewsPub stream run may publish within its current batch limit.
 */
export function selectStreamRunCandidates(
  { maxPostsPerRun = 1, repostEligibleDuplicates = [], uniqueEligibleCandidates = [] } = {},
) {
  const resolvedMaxPostsPerRun = Math.max(1, Number.parseInt(`${maxPostsPerRun || 1}`, 10) || 1);
  const selectedUniqueCandidates = uniqueEligibleCandidates.slice(0, resolvedMaxPostsPerRun);
  const remainingSlots = Math.max(0, resolvedMaxPostsPerRun - selectedUniqueCandidates.length);

  return [
    ...selectedUniqueCandidates,
    ...repostEligibleDuplicates.slice(0, remainingSlots),
  ];
}

async function ensureUniquePostSlug(db, baseSlug) {
  const existingPosts = await db.post.findMany({
    select: {
      slug: true,
    },
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
  });
  const existingSlugs = new Set(existingPosts.map((post) => post.slug));

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let index = 2;

  while (existingSlugs.has(`${baseSlug}-${index}`)) {
    index += 1;
  }

  return `${baseSlug}-${index}`;
}

async function resolveTemplate(db, stream, categoryId = null) {
  if (stream.defaultTemplateId) {
    return db.destinationTemplate.findUnique({
      where: {
        id: stream.defaultTemplateId,
      },
    });
  }

  if (categoryId) {
    const categoryTemplate = await db.destinationTemplate.findFirst({
      where: {
        categoryId,
        platform: stream.destination.platform,
      },
    });

    if (categoryTemplate) {
      return categoryTemplate;
    }
  }

  const localeTemplate = await db.destinationTemplate.findFirst({
    where: {
      locale: stream.locale,
      platform: stream.destination.platform,
    },
  });

  if (localeTemplate) {
    return localeTemplate;
  }

  return db.destinationTemplate.findFirst({
    where: {
      isDefault: true,
      platform: stream.destination.platform,
    },
  });
}

async function upsertCanonicalPost(
  db,
  article,
  stream,
  categoryIds,
  actorId,
  { existingPostId = null } = {},
) {
  const existingPost = existingPostId
    ? await db.post.findUnique({
        where: {
          id: existingPostId,
        },
      })
    : await db.post.findFirst({
        where: {
          sourceArticleId: article.id,
        },
      });
  const categoryRecords = categoryIds.length
    ? await db.category.findMany({
        where: {
          id: {
            in: categoryIds,
          },
        },
      })
    : [];
  const canonicalSlug = existingPost?.slug || (await ensureUniquePostSlug(db, createSlug(article.title, "story")));
  const articleContent = buildStoryStructuredArticle({
    body: article.body || article.summary || article.title,
    categoryNames: categoryRecords.map((category) => category.name),
    sourceName: article.sourceName,
    sourceUrl: article.sourceUrl,
    summary: article.summary || article.title,
    title: article.title,
  });
  const canonicalPath = buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(canonicalSlug));
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const sourceAttribution = `Source: ${article.sourceName} - ${article.sourceUrl}`;
  const seoKeywords = dedupeStrings([
    article.sourceName,
    ...categoryRecords.map((category) => category.name),
    ...(article.tags || []),
  ]);
  let featuredImageId = existingPost?.featuredImageId || null;

  const post = existingPost
      ? await db.post.update({
        where: {
          id: existingPost.id,
        },
        data: {
          authorId: actorId || existingPost.authorId,
          canonicalContentHash: createContentHash(
            article.title,
            article.summary || article.title,
            article.body || article.summary || article.title,
            article.sourceUrl,
          ),
          excerpt: article.summary || article.title,
          featuredImageId,
          providerKey: stream.activeProvider.providerKey,
          sourceArticleId: article.id,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
        },
      })
      : await db.post.create({
        data: {
          authorId: actorId || null,
          canonicalContentHash: createContentHash(
            article.title,
            article.summary || article.title,
            article.body || article.summary || article.title,
            article.sourceUrl,
          ),
          excerpt: article.summary || article.title,
          featuredImageId,
          providerKey: stream.activeProvider.providerKey,
          slug: canonicalSlug,
          sourceArticleId: article.id,
          sourceName: article.sourceName,
          sourceUrl: article.sourceUrl,
          status: stream.mode === "REVIEW_REQUIRED" ? "DRAFT" : "PUBLISHED",
        },
      });

  const translation = await db.postTranslation.upsert({
    where: {
      postId_locale: {
        locale: stream.locale,
        postId: post.id,
      },
    },
    update: {
      contentHtml: articleContent.contentHtml,
      contentMd: articleContent.contentMd,
      sourceAttribution,
      structuredContentJson: articleContent.article,
      summary: article.summary || article.title,
      title: article.title,
    },
    create: {
      contentHtml: articleContent.contentHtml,
      contentMd: articleContent.contentMd,
      locale: stream.locale,
      postId: post.id,
      sourceAttribution,
      structuredContentJson: articleContent.article,
      summary: article.summary || article.title,
      title: article.title,
    },
  });

  await db.sEORecord.upsert({
    where: {
      postTranslationId: translation.id,
    },
    update: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl,
      keywordsJson: seoKeywords,
      metaDescription: article.summary || article.title,
      metaTitle: article.title,
      ogDescription: article.summary || article.title,
      ogImageId: featuredImageId,
      ogTitle: article.title,
      twitterDescription: article.summary || article.title,
      twitterTitle: article.title,
    },
    create: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl,
      keywordsJson: seoKeywords,
      metaDescription: article.summary || article.title,
      metaTitle: article.title,
      ogDescription: article.summary || article.title,
      ogImageId: featuredImageId,
      ogTitle: article.title,
      postTranslationId: translation.id,
      twitterDescription: article.summary || article.title,
      twitterTitle: article.title,
    },
  });

  await db.postCategory.deleteMany({
    where: {
      postId: post.id,
    },
  });

  if (categoryIds.length) {
    await db.postCategory.createMany({
      data: categoryIds.map((categoryId) => ({
        categoryId,
        postId: post.id,
      })),
    });
  }

  return post;
}

function buildTemplateContext({ articleMatch, post, stream, template, translation }) {
  const canonicalPath = buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug));
  const canonicalUrl = toAbsoluteUrl(canonicalPath);
  const socialPostSettings = getStreamSocialPostSettings(stream);
  const keywords = Array.isArray(translation?.seoRecord?.keywordsJson)
    ? translation.seoRecord.keywordsJson
    : [];
  const hashtags = dedupeStrings(keywords)
    .slice(0, 6)
    .map((keyword) => `#${createSlug(keyword, "news")}`)
    .join(" ");
  const imageUrl =
    post.sourceArticle?.imageUrl
    || translation?.seoRecord?.ogImage?.sourceUrl
    || translation?.seoRecord?.ogImage?.publicUrl
    || post.featuredImage?.sourceUrl
    || post.featuredImage?.publicUrl
    || null;

  return {
    body:
      post.sourceArticle?.body
      || translation?.contentMd
      || translation?.summary
      || post.excerpt,
    canonicalPath,
    canonicalUrl,
    hashtags,
    imageUrl,
    locale: stream.locale,
    postLinkPlacement: socialPostSettings.linkPlacement,
    postLinkUrl: socialPostSettings.linkUrl,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    summary: translation?.summary || post.excerpt,
    title: translation?.title || post.slug,
  };
}

function getPolicyReasonCodes(reasons = []) {
  return (Array.isArray(reasons) ? reasons : [])
    .map((reason) => trimText(reason?.code || reason))
    .filter(Boolean);
}

function getHoldReasonCodes({ policy, stream }) {
  const reasonCodes = getPolicyReasonCodes(policy?.reasons);

  if (policy?.status === "BLOCK" || policy?.status === "HOLD") {
    reasonCodes.push(`policy_${policy.status.toLowerCase()}`);
  }

  if (stream?.mode === "REVIEW_REQUIRED") {
    reasonCodes.push("review_required_stream_mode");
  }

  return dedupeStrings(reasonCodes);
}

function getOptimizationObservabilityAction(status) {
  // AI skip and fallback states stay visible in observability instead of being
  // collapsed into a generic success or hard-failure bucket.
  if (status === "SKIPPED") {
    return "AI_OPTIMIZATION_SKIPPED";
  }

  if (status === "FALLBACK") {
    return "AI_OPTIMIZATION_FALLBACK_USED";
  }

  return null;
}

function buildOptimizationObservabilityPayload(articleMatch, optimization) {
  return {
    articleMatchId: articleMatch.id,
    cacheHit: optimization.cacheHit,
    destinationId: articleMatch.destinationId,
    optimizationCacheId: optimization.cacheRecord?.id || null,
    optimizationStatus: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
    reasonCode: optimization.aiResolution?.reasonCode || null,
    reasonMessage: optimization.aiResolution?.reasonMessage || null,
    streamId: articleMatch.streamId,
    usedDeterministicFallback: Boolean(optimization.aiResolution?.usedDeterministicFallback),
  };
}

async function applyWebsiteOptimizedPayloadToPost(db, { payload, post, stream, translation }) {
  if (!post?.id || !payload) {
    return;
  }

  const title = trimText(payload.title) || translation?.title || post.slug;
  const summary = trimText(payload.summary) || translation?.summary || post.excerpt || title;
  const contentMd = trimText(payload.body) || translation?.contentMd || summary;
  const article = buildStoryStructuredArticle({
    body: contentMd,
    categoryNames: [],
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    summary,
    title,
  });

  const nextTranslation = await db.postTranslation.upsert({
    where: {
      postId_locale: {
        locale: stream.locale,
        postId: post.id,
      },
    },
    update: {
      contentHtml: article.contentHtml,
      contentMd,
      sourceAttribution: payload.sourceAttribution || translation?.sourceAttribution || `Source: ${post.sourceName} - ${post.sourceUrl}`,
      structuredContentJson: article.article,
      summary,
      title,
    },
    create: {
      contentHtml: article.contentHtml,
      contentMd,
      locale: stream.locale,
      postId: post.id,
      sourceAttribution: payload.sourceAttribution || `Source: ${post.sourceName} - ${post.sourceUrl}`,
      structuredContentJson: article.article,
      summary,
      title,
    },
  });

  await db.sEORecord.upsert({
    where: {
      postTranslationId: nextTranslation.id,
    },
    update: {
      canonicalUrl: payload.canonicalUrl || translation?.seoRecord?.canonicalUrl || toAbsoluteUrl(buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug))),
      keywordsJson: dedupeStrings(translation?.seoRecord?.keywordsJson || []),
      metaDescription: trimText(payload.metaDescription) || summary,
      metaTitle: trimText(payload.metaTitle) || title,
      ogDescription: trimText(payload.metaDescription) || summary,
      ogImageId: post.featuredImageId || translation?.seoRecord?.ogImageId || null,
      ogTitle: trimText(payload.metaTitle) || title,
      twitterDescription: trimText(payload.metaDescription) || summary,
      twitterTitle: trimText(payload.metaTitle) || title,
    },
    create: {
      authorsJson: ["NewsPub Editorial"],
      canonicalUrl: payload.canonicalUrl || toAbsoluteUrl(buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug))),
      keywordsJson: dedupeStrings(translation?.seoRecord?.keywordsJson || []),
      metaDescription: trimText(payload.metaDescription) || summary,
      metaTitle: trimText(payload.metaTitle) || title,
      ogDescription: trimText(payload.metaDescription) || summary,
      ogImageId: post.featuredImageId || null,
      ogTitle: trimText(payload.metaTitle) || title,
      postTranslationId: nextTranslation.id,
      twitterDescription: trimText(payload.metaDescription) || summary,
      twitterTitle: trimText(payload.metaTitle) || title,
    },
  });

  await db.post.update({
    where: {
      id: post.id,
    },
    data: {
      canonicalContentHash: createContentHash(title, summary, contentMd, payload.sourceAttribution || ""),
      excerpt: summary,
    },
  });
}

function getRecentAttemptPayload(payloadJson) {
  return payloadJson && typeof payloadJson === "object" && !Array.isArray(payloadJson) ? payloadJson : {};
}

function getSocialPayloadFingerprint(payload = {}) {
  return createContentHash(
    payload.platform,
    payload.destinationKind,
    payload.body,
    payload.extraLinkUrl,
    payload.title,
    payload.summary,
    payload.canonicalUrl,
    payload.hashtags,
  );
}

function getHashtagTokens(value) {
  return trimText(value)
    .split(/\s+/)
    .map((token) => token.trim())
    .filter((token) => token.startsWith("#"));
}

function limitHashtagString(value, maxCount) {
  return getHashtagTokens(value).slice(0, maxCount).join(" ");
}

/**
 * Applies destination-specific pacing and duplicate guardrails before a social publish attempt is sent.
 */
export async function applySocialPublishingGuardrails({
  bypassDuplicateCooldown = false,
  db,
  destination,
  payload,
}) {
  if (!["FACEBOOK", "INSTAGRAM"].includes(destination?.platform)) {
    return {
      adjustments: {},
      payload,
    };
  }

  const now = new Date();
  const socialGuardrails = getDestinationSocialGuardrails(destination);
  const duplicateWindowStart = new Date(
    now.getTime() - socialGuardrails.duplicateCooldownHours * 60 * 60 * 1000,
  );
  const recentWindowStart = new Date(
    now.getTime() - Math.max(24, socialGuardrails.duplicateCooldownHours) * 60 * 60 * 1000,
  );
  const recentSucceededAttempts = await db.publishAttempt.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      payloadJson: true,
      publishedAt: true,
    },
    where: {
      destinationId: destination.id,
      publishedAt: {
        gte: recentWindowStart,
      },
      status: "SUCCEEDED",
    },
  });
  const nextPayload = {
    ...payload,
  };
  const issues = [];
  const adjustments = {};
  const currentFingerprint = getSocialPayloadFingerprint(nextPayload);
  const currentCanonicalUrl = trimText(nextPayload.canonicalUrl);
  const latestSucceededAttempt = recentSucceededAttempts[0] || null;
  const maxPostsPer24Hours =
    destination.platform === "FACEBOOK"
      ? socialGuardrails.facebookMaxPostsPer24Hours
      : socialGuardrails.instagramMaxPostsPer24Hours;
  const publishedLast24Hours = recentSucceededAttempts.filter((attempt) => {
    if (!(attempt.publishedAt instanceof Date)) {
      return false;
    }

    return attempt.publishedAt >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }).length;

  if (!bypassDuplicateCooldown && latestSucceededAttempt?.publishedAt instanceof Date) {
    const nextAllowedPublishAt = new Date(
      latestSucceededAttempt.publishedAt.getTime() + socialGuardrails.minPostIntervalMinutes * 60 * 1000,
    );

    if (nextAllowedPublishAt > now) {
      issues.push({
        code: "posting_interval_too_short",
        message: `Wait until ${nextAllowedPublishAt.toISOString()} before publishing to this destination again.`,
      });
    }
  }

  if (publishedLast24Hours >= maxPostsPer24Hours) {
    issues.push({
      code: "destination_daily_cap_reached",
      message: `This destination already reached the internal cap of ${maxPostsPer24Hours} posts in the last 24 hours.`,
    });
  }

  if (destination.platform === "INSTAGRAM") {
    const limitedHashtags = limitHashtagString(
      nextPayload.hashtags,
      socialGuardrails.instagramMaxHashtags,
    );

    if (limitedHashtags !== trimText(nextPayload.hashtags)) {
      nextPayload.hashtags = limitedHashtags;
      adjustments.instagramHashtagsTrimmedTo = socialGuardrails.instagramMaxHashtags;
    }
  }

  if (!trimText(nextPayload.sourceReference)) {
    issues.push({
      code: "source_reference_missing",
      message: "Source attribution is required before publishing to Meta destinations.",
    });
  }

  if (!bypassDuplicateCooldown) {
    for (const attempt of recentSucceededAttempts) {
      if (!(attempt.publishedAt instanceof Date) || attempt.publishedAt < duplicateWindowStart) {
        continue;
      }

      const recentPayload = getRecentAttemptPayload(attempt.payloadJson);

      if (getSocialPayloadFingerprint(recentPayload) === currentFingerprint) {
        issues.push({
          code: "duplicate_social_payload",
          message: "An identical social post was already published recently for this destination.",
        });
        break;
      }

      if (currentCanonicalUrl && trimText(recentPayload.canonicalUrl) === currentCanonicalUrl) {
        issues.push({
          code: "duplicate_canonical_story",
          message: "This destination already published the same canonical story within the duplicate cooldown window.",
        });
        break;
      }
    }
  }

  if (issues.length) {
    throw new DestinationPublishError("Meta publishing guardrails blocked this post.", {
      responseJson: {
        adjustments,
        error: "destination_policy_guardrail_blocked",
        issues,
        maxPostsPer24Hours,
        publishedLast24Hours,
      },
      retryable: false,
      status: "destination_policy_guardrail_blocked",
      statusCode: 400,
    });
  }

  return {
    adjustments,
    payload: nextPayload,
  };
}

/**
 * Refreshes one article match optimization and records any non-blocking AI skip
 * or fallback outcome without interrupting the publish workflow.
 *
 * @param {string} articleMatchId - Article match id to re-optimize.
 * @param {object} [options] - Refresh options.
 * @param {boolean} [options.force=false] - When true, bypasses cache reuse.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Optimization result plus the updated article match.
 */
export async function refreshArticleMatchOptimization(
  articleMatchId,
  { force = false } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const articleMatch = await db.articleMatch.findUnique({
    include: {
      canonicalPost: {
        include: {
          featuredImage: true,
          sourceArticle: {
            select: {
              body: true,
              imageUrl: true,
              summary: true,
            },
          },
          translations: {
            include: {
              seoRecord: {
                include: {
                  ogImage: true,
                },
              },
            },
          },
        },
      },
      destination: true,
      stream: {
        include: {
          destination: true,
        },
      },
    },
    where: {
      id: articleMatchId,
    },
  });

  if (!articleMatch?.canonicalPost) {
    throw new NewsPubError("Article match does not have a canonical post.", {
      status: "post_not_ready_for_optimization",
      statusCode: 400,
    });
  }

  const translation = pickTranslation(
    articleMatch.canonicalPost.translations || [],
    articleMatch.stream.locale,
  );
  const template = await resolveTemplate(db, articleMatch.stream);
  const optimization = await optimizeDestinationPayload(
    {
      articleMatch,
      destination: articleMatch.destination,
      force,
      post: articleMatch.canonicalPost,
      stream: articleMatch.stream,
      template,
      translation,
    },
    db,
  );
  const shouldHold =
    articleMatch.stream.mode === "REVIEW_REQUIRED" ||
    ["BLOCK", "HOLD"].includes(optimization.policy.status);

  const updatedArticleMatch = await db.articleMatch.update({
    where: {
      id: articleMatch.id,
    },
    data: {
      holdReasonsJson: shouldHold ? getHoldReasonCodes({ policy: optimization.policy, stream: articleMatch.stream }) : [],
      optimizationStatus: optimization.cacheRecord.status,
      optimizedPayloadJson: optimization.payload,
      policyReasonsJson: optimization.policy.reasons,
      policyStatus: optimization.policy.status,
      readinessChecksJson: optimization.policy.readinessChecks,
      status: shouldHold ? "HELD_FOR_REVIEW" : "ELIGIBLE",
      workflowStage:
        optimization.policy.status === "BLOCK" || optimization.policy.status === "HOLD"
          ? "HELD"
          : articleMatch.stream.mode === "REVIEW_REQUIRED"
            ? "REVIEW_REQUIRED"
            : "OPTIMIZED",
    },
  });

  const optimizationObservabilityAction = getOptimizationObservabilityAction(
    optimization.aiResolution?.status || optimization.cacheRecord?.status,
  );

  if (optimizationObservabilityAction) {
    await recordObservabilityEvent(
      {
        action: optimizationObservabilityAction,
        entityId: articleMatch.id,
        entityType: "article_match",
        level: "warn",
        message: optimization.aiResolution?.reasonMessage || "NewsPub used deterministic optimization handling.",
        payload: buildOptimizationObservabilityPayload(articleMatch, optimization),
      },
      db,
    );
  }

  return {
    ...optimization,
    articleMatch: updatedArticleMatch,
  };
}

const publishAttemptExecutionInclude = {
  articleMatch: {
    include: {
      destination: true,
      stream: {
        include: {
          destination: true,
        },
      },
    },
  },
  destination: true,
  post: {
    include: {
      featuredImage: true,
      sourceArticle: {
        select: {
          body: true,
          imageUrl: true,
        },
      },
      translations: {
        include: {
          seoRecord: {
            include: {
              ogImage: true,
            },
          },
        },
      },
    },
  },
  stream: {
    include: {
      destination: true,
    },
  },
};

export async function claimPublishAttemptById(
  db,
  attemptId,
  { leaseOwner = createLeaseOwner("publish"), now = new Date() } = {},
) {
  if (typeof db.publishAttempt?.updateMany !== "function") {
    return {
      leaseOwner,
      record: await db.publishAttempt.findUnique({
        include: publishAttemptExecutionInclude,
        where: {
          id: attemptId,
        },
      }),
    };
  }

  const existingAttempt = await db.publishAttempt.findUnique({
    select: {
      availableAt: true,
      id: true,
      startedAt: true,
      status: true,
      streamId: true,
    },
    where: {
      id: attemptId,
    },
  });

  if (!existingAttempt) {
    return {
      leaseOwner,
      record: null,
    };
  }

  const claimResult = await db.publishAttempt.updateMany({
    data: {
      heartbeatAt: now,
      leaseExpiresAt: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
      leaseOwner,
      startedAt: existingAttempt.startedAt || now,
      status: "RUNNING",
    },
    where: {
      id: attemptId,
      status: "PENDING",
      availableAt: {
        lte: now,
      },
      OR: [
        {
          leaseExpiresAt: null,
        },
        {
          leaseExpiresAt: {
            lte: now,
          },
        },
      ],
    },
  });

  if (!claimResult.count) {
    return {
      leaseOwner,
      record: null,
    };
  }

  return {
    leaseOwner,
    record: await db.publishAttempt.findUnique({
      include: publishAttemptExecutionInclude,
      where: {
        id: attemptId,
      },
    }),
  };
}

async function claimNextPublishAttempt(db, { now = new Date() } = {}) {
  if (typeof db.publishAttempt?.findFirst !== "function" || typeof db.publishAttempt?.updateMany !== "function") {
    return null;
  }

  const candidate = await db.publishAttempt.findFirst({
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    where: {
      status: "PENDING",
      availableAt: {
        lte: now,
      },
      OR: [
        {
          leaseExpiresAt: null,
        },
        {
          leaseExpiresAt: {
            lte: now,
          },
        },
      ],
    },
  });

  if (!candidate) {
    return null;
  }

  return claimPublishAttemptById(db, candidate.id, { now });
}

async function refreshPublishAttemptLease(db, attemptId, leaseOwner, now = new Date()) {
  if (!leaseOwner) {
    return;
  }

  if (typeof db.publishAttempt?.updateMany === "function") {
    await db.publishAttempt.updateMany({
      data: {
        heartbeatAt: now,
        leaseExpiresAt: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
      },
      where: {
        id: attemptId,
        leaseOwner,
        status: "RUNNING",
      },
    });

    return;
  }

  if (typeof db.publishAttempt?.update === "function") {
    await db.publishAttempt.update({
      where: {
        id: attemptId,
      },
      data: {
        heartbeatAt: now,
        leaseExpiresAt: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
        leaseOwner,
      },
    });
  }
}

async function executePublishAttempt(
  db,
  attemptId,
  { bypassSocialDuplicateCooldown = false, claimedAttempt = null, leaseOwner: existingLeaseOwner = null, now = new Date() } = {},
) {
  const claimedPublishAttempt = claimedAttempt
    ? {
        leaseOwner: existingLeaseOwner,
        record: claimedAttempt,
      }
    : await claimPublishAttemptById(db, attemptId, {
        leaseOwner: existingLeaseOwner || createLeaseOwner("publish"),
        now,
      });
  const leaseOwner = claimedPublishAttempt.leaseOwner || existingLeaseOwner || createLeaseOwner("publish");
  const attempt = claimedPublishAttempt.record;

  if (!attempt) {
    throw new NewsPubError("Publish attempt was not found.", {
      status: "publish_attempt_not_found",
      statusCode: 404,
    });
  }
  const publicationMode =
    trimText(attempt.diagnosticsJson?.publicationMode)
    || ((attempt.retryCount || 0) > 0
      ? "retry"
      : attempt.articleMatch?.duplicateOfMatchId
        ? "repost"
        : "original");

  const destination = attempt.destination;
  const translation = pickTranslation(attempt.post?.translations || [], attempt.stream.locale);
  const template = await resolveTemplate(db, attempt.stream);
  const configurationIssues = getStreamValidationIssues({
    destination,
    mode: attempt.stream.mode,
    template,
  });

  if (configurationIssues.length) {
    throw new NewsPubError(configurationIssues[0].message, {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const optimization = await refreshArticleMatchOptimization(attempt.articleMatchId, {}, db);
  const context = buildTemplateContext({
    articleMatch: attempt.articleMatch,
    post: attempt.post,
    stream: attempt.stream,
    template,
    translation,
  });
  const optimizedPayload = optimization.payload || {};
  let payload = {
    body: trimText(optimizedPayload.body) || renderTemplateString(template?.bodyTemplate, context),
    canonicalUrl: optimizedPayload.canonicalUrl || context.canonicalUrl,
    caption: trimText(optimizedPayload.caption),
    destinationKind: destination.kind,
    extraLinkPlacement: context.postLinkPlacement,
    extraLinkUrl: context.postLinkUrl,
    hashtags:
      Array.isArray(optimizedPayload.hashtags) && optimizedPayload.hashtags.length
        ? optimizedPayload.hashtags.join(" ")
        : renderTemplateString(template?.hashtagsTemplate, context),
    mediaUrl: optimizedPayload.mediaUrl || context.imageUrl,
    metaDescription: trimText(optimizedPayload.metaDescription),
    metaTitle: trimText(optimizedPayload.metaTitle),
    platform: attempt.platform,
    sourceAttribution:
      optimizedPayload.sourceAttribution
      || `Source: ${context.sourceName}${context.sourceUrl ? ` - ${context.sourceUrl}` : ""}`,
    sourceReference: `Source: ${context.sourceName}${context.sourceUrl ? ` - ${context.sourceUrl}` : ""}`,
    summary:
      trimText(optimizedPayload.summary)
      || renderTemplateString(template?.summaryTemplate, context)
      || context.summary,
    title:
      trimText(optimizedPayload.title)
      || renderTemplateString(template?.titleTemplate, context)
      || context.title,
    warnings: optimizedPayload.policyWarnings || optimizedPayload.warnings || [],
  };

  await refreshPublishAttemptLease(db, attempt.id, leaseOwner, now);

  await db.publishAttempt.update({
    where: {
      id: attempt.id,
    },
    data: {
      diagnosticsJson: {
        ...(attempt.diagnosticsJson || {}),
        aiResolution: optimization.aiResolution || null,
        cacheHit: optimization.cacheHit,
        optimizationCacheId: optimization.cacheRecord?.id || null,
        optimizationHash: optimization.optimizationHash,
        optimizationStatus: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
        policyReasons: optimization.policy.reasons,
        policyStatus: optimization.policy.status,
        policyWarnings: optimization.policy.warnings,
        readinessChecks: optimization.policy.readinessChecks,
        riskScore: optimization.policy.riskScore,
      },
      payloadJson: payload,
      heartbeatAt: now,
      leaseExpiresAt: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
      leaseOwner,
      startedAt: attempt.startedAt || now,
      status: "RUNNING",
    },
  });

  const needsToken = destination.platform !== "WEBSITE";

  if (needsToken && !isDestinationRuntimeReady(destination)) {
    const failedAttempt = await db.publishAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        completedAt: new Date(),
        errorMessage: "Destination is not connected.",
        heartbeatAt: null,
        lastErrorAt: new Date(),
        leaseExpiresAt: null,
        leaseOwner: null,
        responseJson: {
          error: "destination_not_connected",
        },
        status: "FAILED",
      },
    });

    await db.articleMatch.update({
      where: {
        id: attempt.articleMatchId,
      },
      data: {
        failedAt: new Date(),
        status: "FAILED",
      },
    });

    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entityId: failedAttempt.id,
        entityType: "publish_attempt",
        message: "Destination is not connected.",
        payload: {
          publicationMode,
        },
      },
      db,
    );

    return failedAttempt;
  }

  let publishResult;

  try {
    if (optimization.policy.status === "BLOCK") {
      throw new NewsPubError("This post is blocked by the current destination policy checks and must be edited before publishing.", {
        status: "destination_policy_review_blocked",
        statusCode: 400,
      });
    }

    if (destination.platform !== "WEBSITE") {
      const guardrailResult = await applySocialPublishingGuardrails({
        bypassDuplicateCooldown: bypassSocialDuplicateCooldown,
        db,
        destination,
        payload,
      });

      payload = guardrailResult.payload;

      if (Object.keys(guardrailResult.adjustments).length) {
        await db.publishAttempt.update({
          where: {
            id: attempt.id,
          },
          data: {
            payloadJson: {
              ...payload,
              guardrailAdjustments: guardrailResult.adjustments,
            },
          },
        });
      }
    }

    await refreshPublishAttemptLease(db, attempt.id, leaseOwner, new Date());

    if (attempt.platform === "WEBSITE") {
      await applyWebsiteOptimizedPayloadToPost(db, {
        payload,
        post: attempt.post,
        stream: attempt.stream,
        translation,
      });
      const remoteId = `${destination.platform.toLowerCase()}_${createContentHash(
        attempt.id,
        context.title,
        Date.now(),
      ).slice(0, 14)}`;

      publishResult = {
        publishedAt: new Date(),
        remoteId,
        responseJson: {
          canonicalUrl: context.canonicalUrl,
          remoteId,
          status: "ok",
        },
      };
    } else {
      publishResult = await publishExternalDestination({
        destination,
        payload,
        prisma: db,
      });
    }
  } catch (error) {
    const failedAt = new Date();
    const failedAttempt = await db.publishAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        completedAt: failedAt,
        diagnosticsJson: {
          ...(attempt.diagnosticsJson || {}),
          aiResolution: optimization.aiResolution || null,
          cacheHit: optimization.cacheHit,
          errorDetails:
            error instanceof DestinationPublishError
              ? error.responseJson || null
              : null,
          optimizationCacheId: optimization.cacheRecord?.id || null,
          optimizationHash: optimization.optimizationHash,
          optimizationStatus: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
          policyReasons: optimization.policy.reasons,
          policyStatus: optimization.policy.status,
          policyWarnings: optimization.policy.warnings,
          readinessChecks: optimization.policy.readinessChecks,
          riskScore: optimization.policy.riskScore,
        },
        errorCode:
          trimText(error?.status)
          || trimText(error?.responseJson?.error)
          || "destination_publish_failed",
        errorMessage: error instanceof Error ? error.message : "Destination publication failed.",
        heartbeatAt: null,
        lastErrorAt: failedAt,
        leaseExpiresAt: null,
        leaseOwner: null,
        responseJson:
          error instanceof DestinationPublishError
            ? {
                ...(error.responseJson || {}),
                retryable: error.retryable,
                status: error.status,
              }
            : {
                retryable: false,
                status: "destination_publish_failed",
              },
        retryable: error instanceof DestinationPublishError ? error.retryable : false,
        status: "FAILED",
      },
    });
    const diagnosticSummary = getPublishAttemptDiagnosticSummary({
      diagnosticsJson: failedAttempt.diagnosticsJson,
      errorCode: failedAttempt.errorCode,
      errorMessage: failedAttempt.errorMessage,
      responseJson: failedAttempt.responseJson,
    });

    // Jobs history, post history, and audit events all consume the same
    // flattened diagnostic reason so Meta pacing and policy blocks read alike.
    await db.articleMatch.update({
      where: {
        id: attempt.articleMatchId,
      },
      data: {
        failedAt,
        status: "FAILED",
        workflowStage: "FAILED",
      },
    });

    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entityId: failedAttempt.id,
        entityType: "publish_attempt",
        error,
        message:
          diagnosticSummary.reasonMessage
          || (error instanceof Error ? error.message : "Destination publication failed."),
        payload: {
          issueCodes: diagnosticSummary.issueCodes,
          platform: attempt.platform,
          publicationMode,
          reasonCode: diagnosticSummary.reasonCode,
          reasonMessage: diagnosticSummary.reasonMessage,
          retryable: error instanceof DestinationPublishError ? error.retryable : false,
        },
      },
      db,
    );

    return failedAttempt;
  }

  const publishedAt = publishResult.publishedAt || new Date();
  const succeededAttempt = await db.publishAttempt.update({
    where: {
      id: attempt.id,
    },
      data: {
        completedAt: publishedAt,
        diagnosticsJson: {
          ...(attempt.diagnosticsJson || {}),
          aiResolution: optimization.aiResolution || null,
          cacheHit: optimization.cacheHit,
          optimizationCacheId: optimization.cacheRecord?.id || null,
          optimizationHash: optimization.optimizationHash,
          optimizationStatus: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
          policyReasons: optimization.policy.reasons,
          policyStatus: optimization.policy.status,
          policyWarnings: optimization.policy.warnings,
          readinessChecks: optimization.policy.readinessChecks,
          riskScore: optimization.policy.riskScore,
        },
        publishedAt,
        remoteId: publishResult.remoteId,
        heartbeatAt: null,
        leaseExpiresAt: null,
        leaseOwner: null,
        responseJson: publishResult.responseJson || {
          canonicalUrl: context.canonicalUrl,
          remoteId: publishResult.remoteId || null,
          status: "ok",
        },
        retryable: false,
        status: "SUCCEEDED",
      },
    });

  await db.articleMatch.update({
    where: {
      id: attempt.articleMatchId,
    },
      data: {
        publishedAt,
        queuedAt: attempt.queuedAt || new Date(),
        status: "PUBLISHED",
        workflowStage: "PUBLISHED",
      },
    });

  await db.post.update({
    where: {
      id: attempt.postId,
    },
    data: {
      editorialStage: "APPROVED",
      publishedAt,
      scheduledPublishAt: null,
      status: "PUBLISHED",
    },
  });

  if (attempt.platform === "WEBSITE") {
    await revalidatePublishedPostPaths(
      {
        categorySlugs: (
          await db.postCategory.findMany({
            include: {
              category: {
                select: {
                  slug: true,
                },
              },
            },
            where: {
              postId: attempt.postId,
            },
          })
        ).map((entry) => entry.category.slug),
        locales: [attempt.stream.locale],
        slug: attempt.post.slug,
      },
    );
  }

  await createAuditEventRecord(
    {
      action: "PUBLISH_ATTEMPT_SUCCEEDED",
      entityId: succeededAttempt.id,
      entityType: "publish_attempt",
      payloadJson: {
        platform: attempt.platform,
        publicationMode,
        remoteId: publishResult.remoteId || null,
      },
    },
    db,
  );

  return succeededAttempt;
}

function resolvePublicationMode(articleMatch, publicationMode = "") {
  if (trimText(publicationMode)) {
    return trimText(publicationMode);
  }

  return articleMatch?.duplicateOfMatchId ? "repost" : "original";
}

async function createPublishAttempt(
  db,
  { articleMatch, articleMatchId, now = new Date(), platform, postId, publicationMode = "", publishAt, queueSource = "manual", retryOfAttemptId = null, stream },
) {
  const attemptCount = await db.publishAttempt.count({
    where: {
      articleMatchId,
    },
  });
  const queuedAt = now;
  const availableAt = publishAt instanceof Date ? publishAt : queuedAt;
  const resolvedPublicationMode = resolvePublicationMode(articleMatch, publicationMode);

  return db.publishAttempt.create({
    data: {
      availableAt,
      articleMatchId,
      attemptNumber: attemptCount + 1,
      destinationId: stream.destinationId,
      diagnosticsJson: {
        publicationMode: resolvedPublicationMode,
        queueSource,
        queuedAt: queuedAt.toISOString(),
        ...(retryOfAttemptId
          ? {
              retryOfAttemptId,
            }
          : {}),
        scheduledFor: availableAt.toISOString(),
      },
      idempotencyKey: createContentHash(articleMatchId, platform, attemptCount + 1).slice(0, 36),
      platform,
      postId,
      payloadJson: publishAt
        ? {
            publicationMode: resolvedPublicationMode,
            scheduledFor: availableAt.toISOString(),
          }
        : null,
      queuedAt,
      retryCount: Math.max(0, attemptCount),
      status: "PENDING",
      streamId: stream.id,
    },
  });
}

async function queueArticleMatchForPublication(
  db,
  articleMatch,
  { now = new Date(), publicationMode = "", publishAt = null, queueSource = "manual" } = {},
) {
  if (!articleMatch?.canonicalPostId) {
    throw new NewsPubError("Article match does not have a canonical post.", {
      status: "post_not_ready_for_publication",
      statusCode: 400,
    });
  }

  const scheduledPublishAt = publishAt instanceof Date && publishAt > now ? publishAt : null;

  if (scheduledPublishAt) {
    await db.post.update({
      where: {
        id: articleMatch.canonicalPostId,
      },
      data: {
        scheduledPublishAt,
        status: "SCHEDULED",
      },
    });
  }

  const attempt = await createPublishAttempt(db, {
    articleMatch,
    articleMatchId: articleMatch.id,
    now,
    platform: articleMatch.destination.platform,
    postId: articleMatch.canonicalPostId,
    publicationMode,
    publishAt: scheduledPublishAt,
    queueSource,
    stream: articleMatch.stream,
  });

  if (typeof db.articleMatch?.update === "function") {
    await db.articleMatch.update({
      where: {
        id: articleMatch.id,
      },
      data: {
        queuedAt: now,
        status: "QUEUED",
        workflowStage: scheduledPublishAt ? "SCHEDULED" : "APPROVED",
      },
    });
  }

  return attempt;
}

/**
 * Publishes one NewsPub article match through the canonical destination workflow.
 */
export async function publishArticleMatch(articleMatchId, { publishAt } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const articleMatch = await db.articleMatch.findUnique({
    include: {
      canonicalPost: true,
      destination: true,
      stream: {
        include: {
          destination: true,
        },
      },
    },
    where: {
      id: articleMatchId,
    },
  });

  if (!articleMatch?.canonicalPost) {
    throw new NewsPubError("Article match does not have a canonical post.", {
      status: "post_not_ready_for_publication",
      statusCode: 400,
    });
  }

  const attempt = await queueArticleMatchForPublication(db, articleMatch, {
    now: new Date(),
    publishAt,
    queueSource: publishAt && publishAt > new Date() ? "manual_schedule" : "manual_publish",
  });

  if (publishAt && publishAt > new Date()) {
    return attempt;
  }

  return executePublishAttempt(db, attempt.id);
}

function isRetryablePublishAttempt(attempt, now = new Date()) {
  if (attempt.status !== "FAILED") {
    return false;
  }

  if ((attempt.retryCount || 0) >= (attempt.stream?.retryLimit || 0)) {
    return false;
  }

  if (!attempt.responseJson?.retryable) {
    return false;
  }

  if (
    (attempt.articleMatch?.publishAttempts || []).some(
      (candidate) => candidate.id !== attempt.id && candidate.status === "SUCCEEDED",
    )
  ) {
    return false;
  }

  const completedAt = attempt.completedAt instanceof Date ? attempt.completedAt : null;

  if (!completedAt) {
    return false;
  }

  const nextRetryAt = new Date(
    completedAt.getTime() + (attempt.stream?.retryBackoffMinutes || 0) * 60 * 1000,
  );

  return nextRetryAt <= now;
}

/** Creates and executes a new retry attempt for a previously failed publication. */
export async function retryPublishAttempt(attemptId, { actorId = null, automated = false } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const attempt = await db.publishAttempt.findUnique({
    include: {
      articleMatch: {
        include: {
          publishAttempts: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      stream: true,
    },
    where: {
      id: attemptId,
    },
  });

  if (!attempt) {
    throw new NewsPubError("Publish attempt was not found.", {
      status: "publish_attempt_not_found",
      statusCode: 404,
    });
  }

  if (attempt.status !== "FAILED") {
    throw new NewsPubError("Only failed publish attempts can be retried.", {
      status: "publish_attempt_retry_invalid",
      statusCode: 400,
    });
  }

  if (
    (attempt.articleMatch?.publishAttempts || []).some(
      (candidate) => candidate.id !== attempt.id && candidate.status === "SUCCEEDED",
    )
  ) {
    throw new NewsPubError("This article match already has a successful publish attempt.", {
      status: "publish_attempt_already_succeeded",
      statusCode: 400,
    });
  }

  if ((attempt.retryCount || 0) >= (attempt.stream?.retryLimit || 0)) {
    throw new NewsPubError("The stream retry limit has already been reached for this publication.", {
      status: "publish_attempt_retry_limit_reached",
      statusCode: 400,
    });
  }

  const nextAttempt = await createPublishAttempt(db, {
    articleMatch: attempt.articleMatch,
    articleMatchId: attempt.articleMatchId,
    platform: attempt.platform,
    postId: attempt.postId,
    publicationMode: "retry",
    queueSource: automated ? "retry_scheduler" : "retry_request",
    retryOfAttemptId: attempt.id,
    stream: attempt.stream,
  });

  await createAuditEventRecord(
    {
      action: automated ? "PUBLISH_ATTEMPT_RETRY_SCHEDULED" : "PUBLISH_ATTEMPT_RETRY_REQUESTED",
      actorId,
      entityId: nextAttempt.id,
      entityType: "publish_attempt",
      payloadJson: {
        previousAttemptId: attempt.id,
        retryCount: nextAttempt.retryCount,
      },
    },
    db,
  );

  if (automated) {
    return nextAttempt;
  }

  return executePublishAttempt(db, nextAttempt.id);
}

/**
 * Triggers a manual repost flow for an existing NewsPub article match.
 */
export async function manualRepostArticleMatch(articleMatchId, { actorId = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const articleMatch = await db.articleMatch.findUnique({
    include: {
      canonicalPost: true,
      destination: true,
      publishAttempts: {
        orderBy: [{ createdAt: "desc" }],
        select: {
          id: true,
          status: true,
        },
      },
      stream: {
        include: {
          destination: true,
        },
      },
    },
    where: {
      id: articleMatchId,
    },
  });

  if (!articleMatch?.canonicalPost) {
    throw new NewsPubError("Article match does not have a canonical post.", {
      status: "post_not_ready_for_publication",
      statusCode: 400,
    });
  }

  const nextAttempt = await createPublishAttempt(db, {
    articleMatch,
    articleMatchId: articleMatch.id,
    platform: articleMatch.destination.platform,
    postId: articleMatch.canonicalPostId,
    publicationMode: "repost",
    queueSource: "manual_repost",
    stream: articleMatch.stream,
  });

  const latestSuccessfulAttempt =
    articleMatch.publishAttempts.find((attempt) => attempt.status === "SUCCEEDED") || null;

  await createAuditEventRecord(
    {
      action: "PUBLISH_ATTEMPT_MANUAL_REPOST_REQUESTED",
      actorId,
      entityId: nextAttempt.id,
      entityType: "publish_attempt",
      payloadJson: {
        articleMatchId: articleMatch.id,
        bypassedDuplicateCooldown: true,
        canonicalPostId: articleMatch.canonicalPostId,
        previousSuccessfulAttemptId: latestSuccessfulAttempt?.id || null,
      },
    },
    db,
  );

  return executePublishAttempt(db, nextAttempt.id, {
    bypassSocialDuplicateCooldown: true,
  });
}

function createFetchRunSummary(providerResult = null) {
  return {
    aiCacheHitCount: 0,
    blockedCount: 0,
    duplicateCount: 0,
    failedCount: 0,
    fetchedCount: Number(providerResult?.fetchedCount || 0),
    heldCount: 0,
    optimizedCount: 0,
    publishableCount: 0,
    publishedCount: 0,
    queuedCount: 0,
    skippedCount: 0,
  };
}

function shouldPublishAllEligibleCandidates(stream) {
  return stream?.destination?.platform === "WEBSITE";
}

function selectCandidatesForStreamRun(stream, { repostEligibleDuplicates = [], uniqueEligibleCandidates = [] } = {}) {
  if (shouldPublishAllEligibleCandidates(stream)) {
    return [...uniqueEligibleCandidates, ...repostEligibleDuplicates];
  }

  return selectStreamRunCandidates({
    maxPostsPerRun: getStreamMaxPostsPerRun(stream),
    repostEligibleDuplicates,
    uniqueEligibleCandidates,
  });
}

function buildStreamValidationInput(stream) {
  return {
    countryAllowlistJson: stream.countryAllowlistJson,
    destination: stream.destination,
    languageAllowlistJson: stream.languageAllowlistJson,
    locale: stream.locale,
    mode: stream.mode,
    providerDefaults: stream.activeProvider?.requestDefaultsJson,
    providerFilters: stream.settingsJson?.providerFilters,
    providerKey: stream.activeProvider?.providerKey,
    template: stream.defaultTemplate,
  };
}

function resolveFetchWindowForExecution({ checkpoint, now, requestedWindow, writeCheckpointOnSuccess }) {
  try {
    return resolveExecutionFetchWindow({
      checkpoint,
      now,
      requestedWindow,
      writeCheckpointOnSuccess,
    });
  } catch (error) {
    if (error instanceof Error && error.message === "fetch_window_start_after_end") {
      throw new NewsPubError("Fetch window start must be earlier than or equal to the end boundary.", {
        status: "fetch_window_invalid",
        statusCode: 400,
      });
    }

    throw error;
  }
}

async function loadStreamExecutionContext(
  db,
  streamId,
  {
    actorId = null,
    existingFetchRun = null,
    now = new Date(),
    requestedWindow = null,
    triggerType = "manual",
    writeCheckpointOnSuccess = null,
  } = {},
) {
  const stream = await db.publishingStream.findUnique({
    include: {
      activeProvider: true,
      categories: {
        include: {
          category: true,
        },
      },
      checkpoints: true,
      destination: true,
      defaultTemplate: true,
    },
    where: {
      id: streamId,
    },
  });

  if (!stream) {
    throw new NewsPubError("Publishing stream not found.", {
      status: "stream_not_found",
      statusCode: 404,
    });
  }

  if (stream.status !== "ACTIVE") {
    throw new NewsPubError("Publishing stream must be active before it can run.", {
      status: "stream_not_active",
      statusCode: 400,
    });
  }

  const streamValidationIssues = getStreamValidationIssues(buildStreamValidationInput(stream));

  if (streamValidationIssues.length) {
    throw new NewsPubError(streamValidationIssues[0].message, {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const checkpoint =
    stream.checkpoints.find((entry) => entry.providerConfigId === stream.activeProviderId) || null;
  const fetchWindow = existingFetchRun
    ? resolveStoredFetchWindow(existingFetchRun, checkpoint, now)
    : resolveFetchWindowForExecution({
        checkpoint,
        now,
        requestedWindow,
        writeCheckpointOnSuccess,
      });
  const fetchRun = existingFetchRun
    ? existingFetchRun
    : await db.fetchRun.create({
        data: {
          attemptCount: 1,
          availableAt: now,
          executionDetailsJson: buildInitialFetchRunExecutionDetails(fetchWindow),
          heartbeatAt: now,
          leaseExpiresAt: getLeaseExpiration(now, getFetchRunLeaseMs()),
          leaseOwner: createLeaseOwner("fetch"),
          providerConfigId: stream.activeProviderId,
          requestedById: actorId,
          startedAt: now,
          status: "RUNNING",
          streamId: stream.id,
          triggerType,
          windowEnd: fetchWindow.end,
          windowStart: fetchWindow.start,
        },
      });

  if (!existingFetchRun) {
    await db.publishingStream.update({
      where: {
        id: stream.id,
      },
      data: {
        lastRunStartedAt: fetchRun.startedAt,
      },
    });
  }

  return {
    checkpoint,
    fetchRun,
    fetchWindow,
    stream,
  };
}

function getLatestStreamOutcomeTimestamp(stream) {
  const timestamps = [stream?.lastRunCompletedAt, stream?.lastFailureAt]
    .filter((value) => value instanceof Date)
    .map((value) => value.getTime());

  if (!timestamps.length) {
    return null;
  }

  return new Date(Math.max(...timestamps));
}

/**
 * Returns whether a NewsPub stream currently has an execution in flight.
 */
export function isStreamExecutionInProgress(stream) {
  if (!(stream?.lastRunStartedAt instanceof Date)) {
    return false;
  }

  const latestOutcomeAt = getLatestStreamOutcomeTimestamp(stream);

  if (!(latestOutcomeAt instanceof Date)) {
    return true;
  }

  return stream.lastRunStartedAt > latestOutcomeAt;
}

/**
 * Returns the next scheduled execution time for a stream, when one can be
 * derived from the current schedule and latest completed run.
 */
export function getStreamNextScheduledRunAt(stream) {
  if ((stream?.scheduleIntervalMinutes || 0) <= 0) {
    return null;
  }

  if (stream?.nextRunAt instanceof Date) {
    return stream.nextRunAt;
  }

  if (isStreamExecutionInProgress(stream)) {
    return null;
  }

  if (!(stream?.lastRunCompletedAt instanceof Date)) {
    return null;
  }

  return new Date(stream.lastRunCompletedAt.getTime() + stream.scheduleIntervalMinutes * 60 * 1000);
}

function createScheduledFetchQueueKey(streamId, runAt) {
  return `scheduled:${streamId}:${serializeDate(runAt)}`;
}

function getFetchRunHeartbeatIntervalMs() {
  return Math.max(50, Math.floor(getFetchRunLeaseMs() / 3));
}

async function refreshFetchRunLease(db, fetchRunId, leaseOwner, now = new Date()) {
  if (!leaseOwner) {
    return;
  }

  if (typeof db.fetchRun?.updateMany === "function") {
    await db.fetchRun.updateMany({
      data: {
        heartbeatAt: now,
        leaseExpiresAt: getLeaseExpiration(now, getFetchRunLeaseMs()),
      },
      where: {
        id: fetchRunId,
        leaseOwner,
        status: "RUNNING",
      },
    });

    return;
  }

  if (typeof db.fetchRun?.update === "function") {
    await db.fetchRun.update({
      where: {
        id: fetchRunId,
      },
      data: {
        heartbeatAt: now,
        leaseExpiresAt: getLeaseExpiration(now, getFetchRunLeaseMs()),
        leaseOwner,
      },
    });
  }
}

async function refreshFetchRunLeases(db, executionContexts = [], now = new Date()) {
  const uniqueExecutionContexts = [...new Map(
    (executionContexts || [])
      .filter((executionContext) => executionContext?.fetchRun?.id && executionContext?.fetchRun?.leaseOwner)
      .map((executionContext) => [executionContext.fetchRun.id, executionContext]),
  ).values()];

  await Promise.all(
    uniqueExecutionContexts.map((executionContext) =>
      refreshFetchRunLease(
        db,
        executionContext.fetchRun.id,
        executionContext.fetchRun.leaseOwner,
        now,
      )),
  );
}

async function runWithFetchRunHeartbeat(db, executionContexts, task) {
  const refreshableExecutionContexts = (executionContexts || []).filter(
    (executionContext) => executionContext?.fetchRun?.id && executionContext?.fetchRun?.leaseOwner,
  );

  if (!refreshableExecutionContexts.length) {
    return task();
  }

  await refreshFetchRunLeases(db, refreshableExecutionContexts, new Date());
  const heartbeatTimer = setInterval(() => {
    void refreshFetchRunLeases(db, refreshableExecutionContexts, new Date()).catch(() => {});
  }, getFetchRunHeartbeatIntervalMs());

  heartbeatTimer.unref?.();

  try {
    return await task();
  } finally {
    clearInterval(heartbeatTimer);
  }
}

export async function claimFetchRunById(
  db,
  fetchRunId,
  { leaseOwner = createLeaseOwner("fetch"), now = new Date() } = {},
) {
  if (typeof db.fetchRun?.updateMany !== "function") {
    return {
      leaseOwner,
      record: await db.fetchRun.findUnique({
        where: {
          id: fetchRunId,
        },
      }),
    };
  }

  const existingRun = await db.fetchRun.findUnique({
    where: {
      id: fetchRunId,
    },
  });

  if (!existingRun) {
    return {
      leaseOwner,
      record: null,
    };
  }

  const claimResult = await db.fetchRun.updateMany({
    data: {
      attemptCount: (existingRun.attemptCount || 0) + 1,
      heartbeatAt: now,
      leaseExpiresAt: getLeaseExpiration(now, getFetchRunLeaseMs()),
      leaseOwner,
      startedAt: now,
      status: "RUNNING",
    },
    where: {
      id: fetchRunId,
      status: "PENDING",
      availableAt: {
        lte: now,
      },
      OR: [
        {
          leaseExpiresAt: null,
        },
        {
          leaseExpiresAt: {
            lte: now,
          },
        },
      ],
    },
  });

  if (!claimResult.count) {
    return {
      leaseOwner,
      record: null,
    };
  }

  return {
    leaseOwner,
    record: await db.fetchRun.findUnique({
      where: {
        id: fetchRunId,
      },
    }),
  };
}

async function claimNextFetchRun(db, { now = new Date() } = {}) {
  if (typeof db.fetchRun?.findFirst !== "function" || typeof db.fetchRun?.updateMany !== "function") {
    return null;
  }

  const candidate = await db.fetchRun.findFirst({
    orderBy: [{ availableAt: "asc" }, { createdAt: "asc" }],
    where: {
      status: "PENDING",
      availableAt: {
        lte: now,
      },
      OR: [
        {
          leaseExpiresAt: null,
        },
        {
          leaseExpiresAt: {
            lte: now,
          },
        },
      ],
    },
  });

  if (!candidate) {
    return null;
  }

  return claimFetchRunById(db, candidate.id, { now });
}

async function reconcileStaleFetchRuns(db, { now = new Date() } = {}) {
  if (typeof db.fetchRun?.findMany !== "function") {
    return [];
  }

  const staleRuns = await db.fetchRun.findMany({
    where: {
      status: "RUNNING",
      OR: [
        {
          leaseExpiresAt: {
            lte: now,
          },
        },
        {
          leaseExpiresAt: null,
          startedAt: {
            lte: new Date(now.getTime() - getFetchRunLeaseMs()),
          },
        },
      ],
    },
  });

  for (const staleRun of staleRuns) {
    await db.fetchRun.update({
      where: {
        id: staleRun.id,
      },
      data: {
        availableAt: now,
        errorMessage: staleRun.errorMessage || "Recovered stale fetch run for retry.",
        heartbeatAt: null,
        lastErrorAt: now,
        lastErrorCode: staleRun.lastErrorCode || "stale_fetch_run_recovered",
        leaseExpiresAt: null,
        leaseOwner: null,
        orphanedAt: now,
        startedAt: null,
        status: "PENDING",
      },
    });

    await db.publishingStream.update({
      where: {
        id: staleRun.streamId,
      },
      data: {
        lastRunStartedAt: null,
      },
    });
  }

  return staleRuns;
}

async function reconcileStalePublishAttempts(db, { now = new Date() } = {}) {
  if (typeof db.publishAttempt?.findMany !== "function") {
    return [];
  }

  const staleAttempts = await db.publishAttempt.findMany({
    include: {
      post: {
        select: {
          scheduledPublishAt: true,
        },
      },
    },
    where: {
      status: "RUNNING",
      OR: [
        {
          leaseExpiresAt: {
            lte: now,
          },
        },
        {
          leaseExpiresAt: null,
          startedAt: {
            lte: new Date(now.getTime() - getPublishAttemptLeaseMs()),
          },
        },
      ],
    },
  });

  for (const staleAttempt of staleAttempts) {
    await db.publishAttempt.update({
      where: {
        id: staleAttempt.id,
      },
      data: {
        availableAt: staleAttempt.post?.scheduledPublishAt || now,
        errorCode: staleAttempt.errorCode || "stale_publish_attempt_recovered",
        errorMessage: staleAttempt.errorMessage || "Recovered stale publish attempt for retry.",
        heartbeatAt: null,
        lastErrorAt: now,
        leaseExpiresAt: null,
        leaseOwner: null,
        orphanedAt: now,
        startedAt: null,
        status: "PENDING",
      },
    });
  }

  return staleAttempts;
}

async function recoverStrandedAutoPublishAttempts(db, { now = new Date() } = {}) {
  if (typeof db.articleMatch?.findMany !== "function") {
    return [];
  }

  const strandedMatches = await db.articleMatch.findMany({
    include: {
      canonicalPost: {
        select: {
          scheduledPublishAt: true,
        },
      },
      destination: true,
      stream: {
        include: {
          destination: true,
        },
      },
    },
    where: {
      canonicalPostId: {
        not: null,
      },
      publishedAt: null,
      queuedAt: {
        not: null,
      },
      publishAttempts: {
        none: {},
      },
      stream: {
        mode: "AUTO_PUBLISH",
        status: "ACTIVE",
      },
    },
  });

  for (const articleMatch of strandedMatches) {
    await queueArticleMatchForPublication(db, articleMatch, {
      now,
      publishAt: articleMatch.canonicalPost?.scheduledPublishAt || now,
      queueSource: "orphan_recovery",
    });
  }

  return strandedMatches;
}

async function enqueueDueStreamFetchRuns(db, { now = new Date() } = {}) {
  if (typeof db.publishingStream?.findMany !== "function" || typeof db.fetchRun?.upsert !== "function") {
    return [];
  }

  const streams = await db.publishingStream.findMany({
    include: {
      checkpoints: true,
    },
    where: {
      scheduleIntervalMinutes: {
        gt: 0,
      },
      status: "ACTIVE",
    },
  });
  const queuedRuns = [];

  for (const stream of streams) {
    const scheduledRunAt = getStreamNextScheduledRunAt(stream) || now;

    if (!(scheduledRunAt instanceof Date) || scheduledRunAt > now) {
      continue;
    }

    const existingQueuedRun = typeof db.fetchRun?.findFirst === "function"
      ? await db.fetchRun.findFirst({
          where: {
            status: {
              in: ["PENDING", "RUNNING"],
            },
            streamId: stream.id,
          },
        })
      : null;

    if (existingQueuedRun) {
      continue;
    }

    const checkpoint =
      stream.checkpoints.find((entry) => entry.providerConfigId === stream.activeProviderId) || null;
    const fetchWindow = resolveFetchWindowForExecution({
      checkpoint,
      now,
      writeCheckpointOnSuccess: true,
    });
    const queueKey = createScheduledFetchQueueKey(stream.id, scheduledRunAt);
    const queuedRun = await db.fetchRun.upsert({
      where: {
        queueKey,
      },
      update: {
        availableAt: now,
      },
      create: {
        availableAt: now,
        executionDetailsJson: buildInitialFetchRunExecutionDetails(fetchWindow),
        providerConfigId: stream.activeProviderId,
        queueKey,
        status: "PENDING",
        streamId: stream.id,
        triggerType: "scheduled",
        windowEnd: fetchWindow.end,
        windowStart: fetchWindow.start,
      },
    });

    await db.publishingStream.update({
      where: {
        id: stream.id,
      },
      data: {
        nextRunAt: new Date(
          scheduledRunAt.getTime() + stream.scheduleIntervalMinutes * 60 * 1000,
        ),
      },
    });

    queuedRuns.push(queuedRun);
  }

  return queuedRuns;
}

function getSharedFetchCursorForCheckpoint(executionGroup, providerResult) {
  if ((executionGroup?.streamIds || []).length !== 1) {
    return null;
  }

  return providerResult?.cursor || null;
}

function buildFetchRunExecutionDetails(executionContext, executionGroup, providerResult, summary) {
  const timeBoundarySupport = executionGroup?.timeBoundarySupport || null;

  return {
    checkpointStrategy: {
      usesExplicitBoundaries: Boolean(executionContext.fetchWindow?.usesExplicitBoundaries),
      usesProviderCheckpoint: Boolean(executionContext.fetchWindow?.usesProviderCheckpoint),
      writeCheckpointOnSuccess: Boolean(executionContext.fetchWindow?.writeCheckpointOnSuccess),
    },
    endpoint: executionGroup?.endpoint || null,
    executionMode: executionGroup?.executionMode || "single",
    fanOutCounts: {
      duplicateCount: summary.duplicateCount,
      fetchedCount: summary.fetchedCount,
      heldCount: summary.heldCount,
      publishableCount: summary.publishableCount,
      publishedCount: summary.publishedCount,
      queuedCount: summary.queuedCount,
      skippedCount: summary.skippedCount,
    },
    groupId: executionGroup?.id || null,
    groupSize: executionGroup?.streamIds?.length || 1,
    partitionReasonCodes: executionGroup?.partitionReasonCodes || [],
    providerDiagnostics: providerResult?.diagnostics || null,
    sharedRequest: executionGroup ? serializeSharedFetchGroup(executionGroup) : null,
    streamFetchWindow: serializeFetchWindow(executionContext.fetchWindow),
    timeBoundarySupport: timeBoundarySupport
      ? {
          endpoint: timeBoundarySupport.endpoint,
          mode: timeBoundarySupport.mode,
          precision: timeBoundarySupport.precision,
          summary: timeBoundarySupport.summary,
        }
      : null,
  };
}

function getGroupMaxArticlesHint(executionGroup) {
  return executionGroup.streamExecutions.reduce((total, executionContext) => {
    const streamLimit = shouldPublishAllEligibleCandidates(executionContext.stream)
      ? Math.max(getStreamMaxPostsPerRun(executionContext.stream), 10)
      : getStreamMaxPostsPerRun(executionContext.stream);

    return total + streamLimit;
  }, 0);
}

async function finalizeSuccessfulFetchRun(
  db,
  executionContext,
  executionGroup,
  providerResult,
  summary,
  { actorId = null, now = new Date() } = {},
) {
  const checkpointCursor = getSharedFetchCursorForCheckpoint(executionGroup, providerResult);
  const executionDetails = buildFetchRunExecutionDetails(
    executionContext,
    executionGroup,
    providerResult,
    summary,
  );

  // Manual and diagnostic windows stay checkpoint-neutral unless the caller
  // explicitly opts in to advancing the stream checkpoint on success.
  if (executionContext.fetchWindow.writeCheckpointOnSuccess) {
    await db.providerFetchCheckpoint.upsert({
      where: {
        streamId_providerConfigId: {
          providerConfigId: executionContext.stream.activeProviderId,
          streamId: executionContext.stream.id,
        },
      },
      update: {
        cursorJson: checkpointCursor,
        lastSuccessfulFetchAt: executionContext.fetchWindow.end,
      },
      create: {
        cursorJson: checkpointCursor,
        lastSuccessfulFetchAt: executionContext.fetchWindow.end,
        providerConfigId: executionContext.stream.activeProviderId,
        streamId: executionContext.stream.id,
      },
    });
  }

  const completedRun = await db.fetchRun.update({
    where: {
      id: executionContext.fetchRun.id,
    },
    data: {
      aiCacheHitCount: summary.aiCacheHitCount,
      availableAt: now,
      blockedCount: summary.blockedCount,
      duplicateCount: summary.duplicateCount,
      executionDetailsJson: executionDetails,
      failedCount: summary.failedCount,
      fetchedCount: summary.fetchedCount,
      finishedAt: new Date(),
      heartbeatAt: null,
      heldCount: summary.heldCount,
      leaseExpiresAt: null,
      leaseOwner: null,
      optimizedCount: summary.optimizedCount,
      providerCursorAfterJson: checkpointCursor,
      providerCursorBeforeJson: executionContext.checkpoint?.cursorJson || null,
      publishableCount: summary.publishableCount,
      publishedCount: summary.publishedCount,
      queuedCount: summary.queuedCount,
      skippedCount: summary.skippedCount,
      status: "SUCCEEDED",
    },
  });

  await db.publishingStream.update({
    where: {
      id: executionContext.stream.id,
    },
    data: {
      consecutiveFailureCount: 0,
      lastRunCompletedAt: now,
      lastRunStartedAt: executionContext.fetchRun.startedAt,
    },
  });

  await createAuditEventRecord(
    {
      action: "FETCH_RUN_COMPLETED",
      actorId,
      entityId: completedRun.id,
      entityType: "fetch_run",
      payloadJson: {
        aiCacheHitCount: summary.aiCacheHitCount,
        blockedCount: summary.blockedCount,
        duplicateCount: summary.duplicateCount,
        executionMode: executionGroup?.executionMode || "single",
        fetchedCount: summary.fetchedCount,
        groupId: executionGroup?.id || null,
        heldCount: summary.heldCount,
        optimizedCount: summary.optimizedCount,
        partitionReasonCodes: executionGroup?.partitionReasonCodes || [],
        providerKey: executionGroup?.providerKey || executionContext.stream.activeProvider?.providerKey || null,
        publishableCount: summary.publishableCount,
        publishedCount: summary.publishedCount,
        sharedStreamIds: executionGroup?.streamIds || [executionContext.stream.id],
        skippedCount: summary.skippedCount,
        streamId: executionContext.stream.id,
        streamWindow: serializeFetchWindow(executionContext.fetchWindow),
      },
    },
    db,
  );

  return completedRun;
}

async function finalizeFailedFetchRun(
  db,
  executionContext,
  error,
  { actorId = null, executionGroup = null } = {},
) {
  const failedRun = await db.fetchRun.update({
    where: {
      id: executionContext.fetchRun.id,
    },
    data: {
      availableAt: new Date(),
      errorMessage: error instanceof Error ? error.message : `${error}`,
      executionDetailsJson: {
        checkpointStrategy: {
          usesExplicitBoundaries: Boolean(executionContext.fetchWindow?.usesExplicitBoundaries),
          usesProviderCheckpoint: Boolean(executionContext.fetchWindow?.usesProviderCheckpoint),
          writeCheckpointOnSuccess: Boolean(executionContext.fetchWindow?.writeCheckpointOnSuccess),
        },
        endpoint: executionGroup?.endpoint || null,
      executionMode: executionGroup?.executionMode || "single",
      groupId: executionGroup?.id || null,
      partitionReasonCodes: executionGroup?.partitionReasonCodes || [],
      providerDiagnostics: error?.providerDiagnostics || null,
      streamFetchWindow: serializeFetchWindow(executionContext.fetchWindow),
    },
      finishedAt: new Date(),
      heartbeatAt: null,
      lastErrorAt: new Date(),
      lastErrorCode: trimText(error?.status) || "fetch_run_failed",
      leaseExpiresAt: null,
      leaseOwner: null,
      status: "FAILED",
    },
  });
  const nextFailureCount = executionContext.stream.consecutiveFailureCount + 1;
  const nextStatus = nextFailureCount >= executionContext.stream.retryLimit ? "PAUSED" : executionContext.stream.status;

  await db.publishingStream.update({
    where: {
      id: executionContext.stream.id,
    },
    data: {
      consecutiveFailureCount: nextFailureCount,
      lastFailureAt: new Date(),
      lastRunStartedAt: executionContext.fetchRun.startedAt,
      status: nextStatus,
    },
  });

  await recordObservabilityEvent(
    {
      action: nextStatus === "PAUSED" ? "STREAM_EXECUTION_PAUSED" : "FETCH_RUN_FAILED",
      actorId,
      entityId: failedRun.id,
      entityType: "fetch_run",
      error,
      message: error instanceof Error ? error.message : "Fetch run failed.",
      payload: {
        executionMode: executionGroup?.executionMode || "single",
        groupId: executionGroup?.id || null,
        partitionReasonCodes: executionGroup?.partitionReasonCodes || [],
        streamId: executionContext.stream.id,
      },
    },
    db,
  );

  return failedRun;
}

async function processFetchedArticlesForStream(
  db,
  executionContext,
  providerResult,
  { actorId = null, executionGroup = null, now = new Date() } = {},
) {
  const summary = createFetchRunSummary(providerResult);
  const uniqueEligibleCandidates = [];
  const repostEligibleDuplicates = [];

  for (const articleCandidate of providerResult.articles) {
    const evaluation = evaluateArticleAgainstStream(articleCandidate, executionContext.stream, {
      fetchWindow: executionContext.fetchWindow,
    });

    if (evaluation.status === "SKIPPED") {
      summary.skippedCount += 1;
      continue;
    }

    const duplicateMatch = await findLatestDuplicateArticleMatch(db, articleCandidate, executionContext.stream);
    const duplicateClassification = classifyDuplicateCandidate(duplicateMatch, {
      duplicateWindowHours: executionContext.stream.duplicateWindowHours,
      now,
    });

    if (duplicateClassification === "blocked_duplicate") {
      summary.duplicateCount += 1;
      continue;
    }

    const candidateRecord = {
      articleCandidate,
      duplicateClassification,
      duplicateMatch,
      evaluation,
    };

    if (duplicateClassification === "repost_eligible_duplicate") {
      repostEligibleDuplicates.push(candidateRecord);
    } else {
      uniqueEligibleCandidates.push(candidateRecord);
    }
  }

  const selectedCandidates = selectCandidatesForStreamRun(executionContext.stream, {
    repostEligibleDuplicates,
    uniqueEligibleCandidates,
  });

  for (const selectedCandidate of selectedCandidates) {
    const {
      articleCandidate,
      duplicateClassification,
      duplicateMatch,
      evaluation,
    } = selectedCandidate;
    const resolvedImageUrl = await resolveFetchedArticleImageUrl(articleCandidate);
    const fetchedArticle = await upsertFetchedArticle(
      db,
      articleCandidate,
      executionContext.stream,
      resolvedImageUrl,
      now,
    );
    const existingArticleMatch = await db.articleMatch.findUnique({
      where: {
        fetchedArticleId_streamId: {
          fetchedArticleId: fetchedArticle.id,
          streamId: executionContext.stream.id,
        },
      },
    });

    // Shared upstream fetches can legitimately fan the same article into many
    // streams, but a rerun must still stay idempotent for the same stream.
    if (existingArticleMatch) {
      summary.duplicateCount += 1;
      continue;
    }

    const post = await upsertCanonicalPost(
      db,
      fetchedArticle,
      executionContext.stream,
      evaluation.matchedCategoryIds,
      actorId,
      {
        existingPostId:
          duplicateClassification === "repost_eligible_duplicate"
            ? duplicateMatch?.canonicalPost?.id || null
            : null,
      },
    );
    const articleMatch = await db.articleMatch.create({
      data: {
        canonicalPostId: post.id,
        destinationId: executionContext.stream.destinationId,
        duplicateFingerprint:
          duplicateClassification === "repost_eligible_duplicate"
            ? articleCandidate.dedupeFingerprint
            : null,
        duplicateOfMatchId:
          duplicateClassification === "repost_eligible_duplicate"
            ? duplicateMatch?.id || null
            : null,
        fetchedArticleId: fetchedArticle.id,
        filterReasonsJson: evaluation.reasons,
        overrideNotes:
          duplicateClassification === "repost_eligible_duplicate"
            ? "Repost-eligible duplicate selected after unique candidates were exhausted."
            : null,
        queuedAt: executionContext.stream.mode === "AUTO_PUBLISH" ? new Date() : null,
        status: evaluation.status,
        streamId: executionContext.stream.id,
      },
    });

    const optimization = await refreshArticleMatchOptimization(articleMatch.id, {}, db);
    const shouldHoldForReview =
      executionContext.stream.mode === "REVIEW_REQUIRED"
      || ["BLOCK", "HOLD"].includes(optimization.policy.status);

    summary.publishableCount += 1;
    summary.optimizedCount += 1;

    if (optimization.cacheHit) {
      summary.aiCacheHitCount += 1;
    }

    if (shouldHoldForReview) {
      summary.heldCount += 1;

      if (optimization.policy.status !== "PASS") {
        summary.blockedCount += 1;
      }

      continue;
    }

    summary.queuedCount += 1;

    try {
      await queueArticleMatchForPublication(
        db,
        {
          ...articleMatch,
          destination: executionContext.stream.destination,
          stream: executionContext.stream,
        },
        {
          now,
          publicationMode:
            duplicateClassification === "repost_eligible_duplicate" ? "repost" : "original",
          queueSource: "fetch_auto_publish",
        },
      );
    } catch (error) {
      summary.failedCount += 1;
      await recordObservabilityEvent(
        {
          action: "PUBLISH_ATTEMPT_FAILED",
          entityId: articleMatch.id,
          entityType: "article_match",
          error,
        },
        db,
      );
    }
  }

  return finalizeSuccessfulFetchRun(
    db,
    executionContext,
    executionGroup,
    providerResult,
    summary,
    {
      actorId,
      now,
    },
  );
}

async function runClaimedFetchRun(db, fetchRun, { now = new Date() } = {}) {
  let executionContext = null;
  let executionGroup = null;

  try {
    executionContext = await loadStreamExecutionContext(
      db,
      fetchRun.streamId,
      {
        actorId: fetchRun.requestedById || null,
        existingFetchRun: fetchRun,
        now,
        triggerType: fetchRun.triggerType,
      },
    );
    executionGroup = planSharedFetchGroups([executionContext])[0];
    return await runWithFetchRunHeartbeat(db, [executionContext], async () => {
      const providerResult = await fetchProviderArticles({
        checkpoint: executionContext.checkpoint,
        fetchWindow: executionContext.fetchWindow,
        maxArticlesHint: getGroupMaxArticlesHint(executionGroup),
        now,
        providerKey: executionContext.stream.activeProvider.providerKey,
        stream: executionContext.stream,
      });

      return processFetchedArticlesForStream(
        db,
        executionContext,
        providerResult,
        {
          actorId: fetchRun.requestedById || null,
          executionGroup,
          now,
        },
      );
    });
  } catch (error) {
    if (!executionContext) {
      return db.fetchRun.update({
        where: {
          id: fetchRun.id,
        },
        data: {
          errorMessage: error instanceof Error ? error.message : `${error}`,
          finishedAt: new Date(),
          heartbeatAt: null,
          lastErrorAt: new Date(),
          lastErrorCode: trimText(error?.status) || "fetch_run_failed",
          leaseExpiresAt: null,
          leaseOwner: null,
          status: "FAILED",
        },
      });
    }

    return finalizeFailedFetchRun(
      db,
      executionContext,
      error,
      {
        actorId: fetchRun.requestedById || null,
        executionGroup,
      },
    );
  }
}

/** Runs one publishing stream end to end, including fetch, filtering, dedupe, and publication. */
export async function runStreamFetch(
  streamId,
  { actorId = null, fetchWindow = null, now = new Date(), triggerType = "manual", writeCheckpointOnSuccess = null } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const executionContext = await loadStreamExecutionContext(
    db,
    streamId,
    {
      actorId,
      now,
      requestedWindow: fetchWindow,
      triggerType,
      writeCheckpointOnSuccess,
    },
  );
  const executionGroup = planSharedFetchGroups([executionContext])[0];

  try {
    return runWithFetchRunHeartbeat(db, [executionContext], async () => {
      const providerResult = await fetchProviderArticles({
        checkpoint: executionContext.checkpoint,
        fetchWindow: executionContext.fetchWindow,
        maxArticlesHint: getGroupMaxArticlesHint(executionGroup),
        now,
        providerKey: executionContext.stream.activeProvider.providerKey,
        stream: executionContext.stream,
      });

      return processFetchedArticlesForStream(
        db,
        executionContext,
        providerResult,
        {
          actorId,
          executionGroup,
          now,
        },
      );
    });
  } catch (error) {
    await finalizeFailedFetchRun(
      db,
      executionContext,
      error,
      {
        actorId,
        executionGroup,
      },
    );

    throw error;
  }
}

/**
 * Runs several publishing streams in one execution request, sharing provider
 * fetches only when the streams remain compatible for a safe widened request.
 *
 * @param {string[]} streamIds - Stream ids requested for execution.
 * @param {object} [options] - Batch execution options.
 * @param {string|null} [options.actorId] - Acting admin id.
 * @param {object|null} [options.fetchWindow] - Optional explicit bounded window.
 * @param {Date} [options.now] - Execution timestamp.
 * @param {string} [options.triggerType] - Execution trigger label.
 * @param {boolean|null} [options.writeCheckpointOnSuccess] - Explicit checkpoint write override.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Batch execution summary with per-stream results.
 */
export async function runMultipleStreamFetches(
  streamIds,
  { actorId = null, fetchWindow = null, now = new Date(), triggerType = "manual", writeCheckpointOnSuccess = null } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const requestedStreamIds = [...new Set((streamIds || []).filter(Boolean))];

  if (!requestedStreamIds.length) {
    return {
      groups: [],
      requestedStreamCount: 0,
      results: [],
      upstreamRequestCount: 0,
    };
  }

  const streamExecutions = [];

  for (const streamId of requestedStreamIds) {
    streamExecutions.push(
      await loadStreamExecutionContext(
        db,
        streamId,
        {
          actorId,
          now,
          requestedWindow: fetchWindow,
          triggerType,
          writeCheckpointOnSuccess,
        },
      ),
    );
  }

  const plannedGroups = planSharedFetchGroups(streamExecutions);
  const results = [];

  for (const executionGroup of plannedGroups) {
    if (executionGroup.streamIds.length > 1) {
      await createAuditEventRecord(
        {
          action: "FETCH_SHARED_BATCH_PLANNED",
          actorId,
          entityId: executionGroup.id,
          entityType: "fetch_run_group",
          payloadJson: serializeSharedFetchGroup(executionGroup),
        },
        db,
      );
    }

    try {
      await runWithFetchRunHeartbeat(db, executionGroup.streamExecutions, async () => {
        const providerResult = await fetchProviderArticles({
          checkpoint:
            executionGroup.streamExecutions.length === 1
              ? executionGroup.streamExecutions[0].checkpoint
              : null,
          fetchWindow: executionGroup.sharedFetchWindow,
          maxArticlesHint: getGroupMaxArticlesHint(executionGroup),
          now,
          providerKey: executionGroup.providerKey,
          requestValues: executionGroup.sharedRequestValues,
          stream: executionGroup.streamExecutions[0].stream,
        });

        for (const executionContext of executionGroup.streamExecutions) {
          try {
            const completedRun = await processFetchedArticlesForStream(
              db,
              executionContext,
              providerResult,
              {
                actorId,
                executionGroup,
                now,
              },
            );

            results.push({
              run: completedRun,
              stream: executionContext.stream,
            });
          } catch (error) {
            const failedRun = await finalizeFailedFetchRun(
              db,
              executionContext,
              error,
              {
                actorId,
                executionGroup,
              },
            );

            results.push({
              error: error instanceof Error ? error.message : `${error}`,
              run: failedRun,
              stream: executionContext.stream,
            });
          }
        }
      });
    } catch (error) {
      for (const executionContext of executionGroup.streamExecutions) {
        const failedRun = await finalizeFailedFetchRun(
          db,
          executionContext,
          error,
          {
            actorId,
            executionGroup,
          },
        );

        results.push({
          error: error instanceof Error ? error.message : `${error}`,
          run: failedRun,
          stream: executionContext.stream,
        });
      }

      continue;
    }
  }

  return {
    groups: plannedGroups.map(serializeSharedFetchGroup),
    requestedStreamCount: requestedStreamIds.length,
    results,
    upstreamRequestCount: plannedGroups.length,
  };
}

/**
 * Returns whether a NewsPub stream is due for another scheduled execution.
 */
export function isStreamDueForScheduledRun(stream, now = new Date()) {
  if ((stream?.scheduleIntervalMinutes || 0) <= 0) {
    return false;
  }

  if (isStreamExecutionInProgress(stream)) {
    return false;
  }

  const nextRunAt = getStreamNextScheduledRunAt(stream);

  if (nextRunAt instanceof Date) {
    return nextRunAt <= now;
  }

  return !(stream?.lastRunCompletedAt instanceof Date);
}

/** Executes all due scheduled stream runs and any pending scheduled publish attempts. */
export async function runScheduledStreams({ now = new Date() } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const recoveredFetchRuns = await reconcileStaleFetchRuns(db, { now });
  const recoveredPublishAttempts = await reconcileStalePublishAttempts(db, { now });
  const recoveredArticleMatches = await recoverStrandedAutoPublishAttempts(db, { now });
  const queuedStreamRuns = await enqueueDueStreamFetchRuns(db, { now });
  const failedAttempts = typeof db.publishAttempt?.findMany === "function"
    ? await db.publishAttempt.findMany({
    include: {
      articleMatch: {
        include: {
          publishAttempts: {
            select: {
              id: true,
              status: true,
            },
          },
        },
      },
      stream: true,
    },
    orderBy: [{ completedAt: "desc" }, { createdAt: "desc" }],
    where: {
      status: "FAILED",
    },
    })
    : [];
  const latestAttemptByMatch = new Map();

  for (const attempt of failedAttempts) {
    if (!latestAttemptByMatch.has(attempt.articleMatchId)) {
      latestAttemptByMatch.set(attempt.articleMatchId, attempt);
    }
  }

  const dueRetryAttempts = [...latestAttemptByMatch.values()].filter((attempt) =>
    isRetryablePublishAttempt(attempt, now),
  );

  for (const attempt of dueRetryAttempts) {
    try {
      await retryPublishAttempt(
        attempt.id,
        {
          automated: true,
        },
        db,
      );
    } catch {
      // Retry failures are already recorded through the destination publish flow.
    }
  }

  const results = [];

  while (true) {
    const claimedFetchRun = await claimNextFetchRun(db, { now });

    if (!claimedFetchRun?.record) {
      break;
    }

    results.push(await runClaimedFetchRun(db, claimedFetchRun.record, { now }));
  }

  let processedPublishAttempts = 0;

  while (true) {
    const claimedPublishAttempt = await claimNextPublishAttempt(db, { now });

    if (!claimedPublishAttempt?.record) {
      break;
    }

    processedPublishAttempts += 1;

    try {
      await executePublishAttempt(db, claimedPublishAttempt.record.id, {
        claimedAttempt: claimedPublishAttempt.record,
        leaseOwner: claimedPublishAttempt.leaseOwner,
        now,
      });
    } catch {
      // The failure is already recorded in audit and observability layers.
    }
  }

  return {
    dueStreamCount: queuedStreamRuns.length,
    processedPublishAttempts,
    processedScheduledAttempts: processedPublishAttempts,
    recoveredArticleMatchCount: recoveredArticleMatches.length,
    recoveredFetchRunCount: recoveredFetchRuns.length,
    recoveredPublishAttemptCount: recoveredPublishAttempts.length,
    retriedPublishAttempts: dueRetryAttempts.length,
    results,
  };
}

/**
 * Returns the destination connection snapshot reused by NewsPub jobs and settings surfaces.
 */
export async function getDestinationConnectionSnapshot(prisma) {
  return getDestinationManagementSnapshot(prisma);
}

/** Returns held-for-review matches for the admin review queue. */
export async function listReviewableArticleMatches(
  { page = 1, pageSize = 20, search = "" } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const normalizedSearch = normalizeSearchText(search);
  const where = {
    status: "HELD_FOR_REVIEW",
    ...(normalizedSearch
      ? {
          OR: [
            {
              canonicalPost: {
                translations: {
                  some: {
                    title: {
                      contains: normalizedSearch,
                    },
                  },
                },
              },
            },
            {
              fetchedArticle: {
                title: {
                  contains: normalizedSearch,
                },
              },
            },
          ],
        }
      : {}),
  };
  const totalItems = await db.articleMatch.count({ where });
  const pagination = createPagination(totalItems, page, pageSize);
  const items = await db.articleMatch.findMany({
    include: {
      canonicalPost: {
        include: {
          translations: true,
        },
      },
      destination: true,
      fetchedArticle: true,
      stream: true,
    },
    orderBy: [{ createdAt: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });

  return {
    items,
    pagination,
  };
}

/** Returns the published-post inventory used by admin listing surfaces. */
export async function listPublishedPostsForInventory(
  { locale, page = 1, pageSize = 20, search = "" } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const normalizedSearch = trimText(search);
  const where = {
    status: "PUBLISHED",
    ...(normalizedSearch
      ? {
          OR: [
            {
              slug: {
                contains: normalizedSearch,
              },
            },
            {
              translations: {
                some: {
                  title: {
                    contains: normalizedSearch,
                  },
                },
              },
            },
          ],
        }
      : {}),
  };
  const totalItems = await db.post.count({ where });
  const pagination = createPagination(totalItems, page, pageSize);
  const posts = await db.post.findMany({
    include: {
      categories: {
        include: {
          category: true,
        },
      },
      publishAttempts: {
        orderBy: [{ createdAt: "desc" }],
      },
      translations: {
        include: {
          seoRecord: true,
        },
      },
    },
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });

  return {
    pagination,
    posts,
  };
}
