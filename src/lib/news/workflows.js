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
  getProviderTimeBoundarySupport,
  resolveStreamProviderRequestValues,
} from "@/lib/news/provider-definitions";
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
  return Math.max(1, Number.parseInt(`${stream?.max_posts_per_run || 5}`, 10) || 5);
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
  const storedWindow = fetchRun?.execution_details_json?.streamFetchWindow || null;
  const storedStart = coerceDate(storedWindow?.start) || coerceDate(fetchRun?.window_start);
  const storedEnd = coerceDate(storedWindow?.end) || coerceDate(fetchRun?.window_end);

  if (storedStart || storedEnd) {
    return {
      end: storedEnd || now,
      source: storedWindow?.source || (fetchRun?.trigger_type === "scheduled" ? "checkpoint" : "explicit"),
      start: storedStart || checkpoint?.last_successful_fetch_at || now,
      usesExplicitBoundaries: Boolean(storedWindow?.usesExplicitBoundaries),
      usesProviderCheckpoint: Boolean(storedWindow?.usesProviderCheckpoint),
      writeCheckpointOnSuccess:
        typeof storedWindow?.writeCheckpointOnSuccess === "boolean"
          ? storedWindow.writeCheckpointOnSuccess
          : fetchRun?.trigger_type === "scheduled",
    };
  }

  return resolveFetchWindowForExecution({
    checkpoint,
    now,
    requestedWindow: null,
    writeCheckpointOnSuccess: fetchRun?.trigger_type === "scheduled",
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
      const categoryTerms = getCategorySearchTerms(category);

      return categoryTerms.some((term) => term && normalizedSearch.includes(term));
    })
    .map((category) => category.id);
}

function getCategorySearchTerms(category) {
  const normalizedTerms = [category?.name, category?.slug]
    .map((value) => normalizeSearchText(value))
    .filter(Boolean);
  const aliasTerms = normalizedTerms.map((term) => term.replace(/\s+news$/, ""));

  return dedupeStrings([...normalizedTerms, ...aliasTerms]);
}

export function resolveStreamArticleWindowPolicy(
  stream = {},
  { provider_key: providerKeyOverride = null, requestValues: requestValuesOverride = null } = {},
) {
  const provider_key = trimText(providerKeyOverride || stream?.activeProvider?.provider_key).toLowerCase();

  if (!provider_key) {
    return {
      enforceEndBoundary: true,
      enforceStartBoundary: true,
      mode: "default",
    };
  }

  const requestValues = requestValuesOverride || resolveStreamProviderRequestValues(provider_key, {
    country_allowlist_json: stream.country_allowlist_json,
    language_allowlist_json: stream.language_allowlist_json,
    locale: stream.locale,
    providerDefaults: stream.activeProvider?.request_defaults_json,
    providerFilters: stream.settings_json?.providerFilters,
  });
  const timeBoundarySupport = getProviderTimeBoundarySupport(provider_key, requestValues);

  return {
    enforceEndBoundary: true,
    enforceStartBoundary: timeBoundarySupport.mode !== "local_only",
    mode: timeBoundarySupport.mode || "default",
  };
}

function evaluateArticleAgainstStream(
  article,
  stream,
  { fetchWindow = null, fetchWindowPolicy = null } = {},
) {
  const reasons = [];
  const normalizedSearch = getArticleSearchText(article);
  const includeKeywords = dedupeStrings(stream.include_keywords_json || []).map((keyword) =>
    normalizeSearchText(keyword),
  );
  const excludeKeywords = dedupeStrings(stream.exclude_keywords_json || []).map((keyword) =>
    normalizeSearchText(keyword),
  );
  const languageAllowlist = dedupeStrings(stream.language_allowlist_json || []);
  const countryAllowlist = dedupeStrings(stream.country_allowlist_json || []);
  const regionAllowlist = dedupeStrings(stream.region_allowlist_json || []);
  const matchedCategoryIds = findMatchingCategoryIds(
    article,
    stream.categories.map((entry) => entry.category),
  );

  if (!isArticleInsideFetchWindow(article, fetchWindow, fetchWindowPolicy || undefined)) {
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
  const directImageUrl = trimText(article.image_url);

  if (directImageUrl) {
    return directImageUrl;
  }

  return discoverRemoteImageUrl(article.source_url);
}

function buildFetchedArticleCreateData(articleCandidate, stream, resolvedImageUrl, now) {
  return {
    body: articleCandidate.body || null,
    dedupe_fingerprint: articleCandidate.dedupe_fingerprint,
    image_url: resolvedImageUrl || null,
    language: trimText(articleCandidate.language) || null,
    normalized_title_hash: articleCandidate.normalized_title_hash,
    provider_article_id: articleCandidate.provider_article_id || null,
    provider_categories_json: articleCandidate.providerCategories || [],
    provider_config_id: stream.active_provider_id,
    provider_countries_json: articleCandidate.providerCountries || [],
    provider_regions_json: articleCandidate.providerRegions || [],
    published_at: new Date(articleCandidate.published_at || now),
    raw_payload_json: articleCandidate.raw_payload_json || null,
    source_name: articleCandidate.source_name,
    source_url: articleCandidate.source_url,
    source_url_hash: articleCandidate.source_url_hash,
    summary: articleCandidate.summary || articleCandidate.title,
    tags_json: articleCandidate.tags || [],
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
          image_url: resolvedImageUrl,
        }
      : {}),
    ...(trimText(articleCandidate.language)
      ? {
          language: trimText(articleCandidate.language),
        }
      : {}),
    normalized_title_hash: articleCandidate.normalized_title_hash,
    ...(articleCandidate.provider_article_id
      ? {
          provider_article_id: articleCandidate.provider_article_id,
        }
      : {}),
    provider_categories_json: articleCandidate.providerCategories || [],
    provider_config_id: stream.active_provider_id,
    provider_countries_json: articleCandidate.providerCountries || [],
    provider_regions_json: articleCandidate.providerRegions || [],
    published_at: new Date(articleCandidate.published_at || now),
    ...(articleCandidate.raw_payload_json
      ? {
          raw_payload_json: articleCandidate.raw_payload_json,
        }
      : {}),
    source_name: articleCandidate.source_name,
    source_url: articleCandidate.source_url,
    source_url_hash: articleCandidate.source_url_hash,
    summary: articleCandidate.summary || articleCandidate.title,
    tags_json: articleCandidate.tags || [],
    title: articleCandidate.title,
  };
}

async function upsertFetchedArticle(db, articleCandidate, stream, resolvedImageUrl, now) {
  const createData = buildFetchedArticleCreateData(articleCandidate, stream, resolvedImageUrl, now);

  return db.fetchedArticle.upsert({
    where: {
      dedupe_fingerprint: articleCandidate.dedupe_fingerprint,
    },
    update: buildFetchedArticleUpdateData(articleCandidate, stream, resolvedImageUrl, now),
    create: createData,
  });
}

async function findLatestDuplicateArticleMatch(db, article, stream) {
  const duplicate_window_hours = Math.max(0, Number(stream?.duplicate_window_hours || 48));
  const duplicateWindowStart = new Date(Date.now() - duplicate_window_hours * 60 * 60 * 1000);

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
          normalized_title_hash: true,
          provider_article_id: true,
          published_at: true,
          source_url_hash: true,
        },
      },
    },
    orderBy: [{ created_at: "desc" }],
    where: {
      destination_id: stream.destination_id,
      OR: [
        article.provider_article_id
          ? {
              fetchedArticle: {
                provider_article_id: article.provider_article_id,
                provider_config_id: stream.active_provider_id,
              },
            }
          : null,
        article.source_url_hash
          ? {
              fetchedArticle: {
                source_url_hash: article.source_url_hash,
              },
            }
          : null,
        {
          fetchedArticle: {
            normalized_title_hash: article.normalized_title_hash,
            published_at: {
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
    (duplicateMatch.published_at instanceof Date && duplicateMatch.published_at)
    || (duplicateMatch.created_at instanceof Date && duplicateMatch.created_at)
    || (duplicateMatch.fetchedArticle?.published_at instanceof Date && duplicateMatch.fetchedArticle.published_at)
    || null
  );
}

/**
 * Classifies how an existing article match should affect a new NewsPub publication attempt.
 */
export function classifyDuplicateCandidate(
  duplicateMatch,
  { duplicate_window_hours = 48, now = new Date() } = {},
) {
  if (!duplicateMatch) {
    return "unique";
  }

  const duplicateReferenceDate = getDuplicateMatchReferenceDate(duplicateMatch);

  if (!duplicateReferenceDate) {
    return "repost_eligible_duplicate";
  }

  const duplicateWindowStart = new Date(
    now.getTime() - Math.max(0, duplicate_window_hours) * 60 * 60 * 1000,
  );

  return duplicateReferenceDate >= duplicateWindowStart
    ? "blocked_duplicate"
    : "repost_eligible_duplicate";
}

/**
 * Selects the candidate set that a NewsPub stream run may publish within its current batch limit.
 */
export function selectStreamRunCandidates(
  { max_posts_per_run = 1, repostEligibleDuplicates = [], uniqueEligibleCandidates = [] } = {},
) {
  const resolvedMaxPostsPerRun = Math.max(1, Number.parseInt(`${max_posts_per_run || 1}`, 10) || 1);
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

async function resolveTemplate(db, stream, category_id = null) {
  if (stream.default_template_id) {
    return db.destinationTemplate.findUnique({
      where: {
        id: stream.default_template_id,
      },
    });
  }

  if (category_id) {
    const categoryTemplate = await db.destinationTemplate.findFirst({
      where: {
        category_id,
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
      is_default: true,
      platform: stream.destination.platform,
    },
  });
}

async function upsertCanonicalPost(
  db,
  article,
  stream,
  categoryIds,
  actor_id,
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
          source_article_id: article.id,
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
    source_name: article.source_name,
    source_url: article.source_url,
    summary: article.summary || article.title,
    title: article.title,
  });
  const canonicalPath = buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(canonicalSlug));
  const canonical_url = toAbsoluteUrl(canonicalPath);
  const source_attribution = `Source: ${article.source_name} - ${article.source_url}`;
  const seoKeywords = dedupeStrings([
    article.source_name,
    ...categoryRecords.map((category) => category.name),
    ...(article.tags || []),
  ]);
  let featured_image_id = existingPost?.featured_image_id || null;

  const post = existingPost
      ? await db.post.update({
        where: {
          id: existingPost.id,
        },
        data: {
          author_id: actor_id || existingPost.author_id,
          canonical_content_hash: createContentHash(
            article.title,
            article.summary || article.title,
            article.body || article.summary || article.title,
            article.source_url,
          ),
          excerpt: article.summary || article.title,
          featured_image_id,
          provider_key: article.provider_key || stream.activeProvider.provider_key,
          source_article_id: article.id,
          source_name: article.source_name,
          source_url: article.source_url,
        },
      })
      : await db.post.create({
        data: {
          author_id: actor_id || null,
          canonical_content_hash: createContentHash(
            article.title,
            article.summary || article.title,
            article.body || article.summary || article.title,
            article.source_url,
          ),
          excerpt: article.summary || article.title,
          featured_image_id,
          provider_key: article.provider_key || stream.activeProvider.provider_key,
          slug: canonicalSlug,
          source_article_id: article.id,
          source_name: article.source_name,
          source_url: article.source_url,
          status: stream.mode === "REVIEW_REQUIRED" ? "DRAFT" : "PUBLISHED",
        },
      });

  const translation = await db.postTranslation.upsert({
    where: {
      post_id_locale: {
        locale: stream.locale,
        post_id: post.id,
      },
    },
    update: {
      content_html: articleContent.content_html,
      content_md: articleContent.content_md,
      source_attribution,
      structured_content_json: articleContent.article,
      summary: article.summary || article.title,
      title: article.title,
    },
    create: {
      content_html: articleContent.content_html,
      content_md: articleContent.content_md,
      locale: stream.locale,
      post_id: post.id,
      source_attribution,
      structured_content_json: articleContent.article,
      summary: article.summary || article.title,
      title: article.title,
    },
  });

  await db.sEORecord.upsert({
    where: {
      post_translation_id: translation.id,
    },
    update: {
      authors_json: ["NewsPub Editorial"],
      canonical_url,
      keywords_json: seoKeywords,
      meta_description: article.summary || article.title,
      meta_title: article.title,
      og_description: article.summary || article.title,
      og_image_id: featured_image_id,
      og_title: article.title,
      twitter_description: article.summary || article.title,
      twitter_title: article.title,
    },
    create: {
      authors_json: ["NewsPub Editorial"],
      canonical_url,
      keywords_json: seoKeywords,
      meta_description: article.summary || article.title,
      meta_title: article.title,
      og_description: article.summary || article.title,
      og_image_id: featured_image_id,
      og_title: article.title,
      post_translation_id: translation.id,
      twitter_description: article.summary || article.title,
      twitter_title: article.title,
    },
  });

  await db.postCategory.deleteMany({
    where: {
      post_id: post.id,
    },
  });

  if (categoryIds.length) {
    await db.postCategory.createMany({
      data: categoryIds.map((category_id) => ({
        category_id,
        post_id: post.id,
      })),
    });
  }

  return post;
}

function buildTemplateContext({ articleMatch, post, stream, template, translation }) {
  const canonicalPath = buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug));
  const canonical_url = toAbsoluteUrl(canonicalPath);
  const socialPostSettings = getStreamSocialPostSettings(stream);
  const keywords = Array.isArray(translation?.seoRecord?.keywords_json)
    ? translation.seoRecord.keywords_json
    : [];
  const hashtags = dedupeStrings(keywords)
    .slice(0, 6)
    .map((keyword) => `#${createSlug(keyword, "news")}`)
    .join(" ");
  const image_url =
    post.sourceArticle?.image_url
    || translation?.seoRecord?.ogImage?.source_url
    || translation?.seoRecord?.ogImage?.public_url
    || post.featuredImage?.source_url
    || post.featuredImage?.public_url
    || null;

  return {
    body:
      post.sourceArticle?.body
      || translation?.content_md
      || translation?.summary
      || post.excerpt,
    canonicalPath,
    canonical_url,
    hashtags,
    image_url,
    locale: stream.locale,
    postLinkPlacement: socialPostSettings.linkPlacement,
    postLinkUrl: socialPostSettings.linkUrl,
    source_name: post.source_name,
    source_url: post.source_url,
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
    article_match_id: articleMatch.id,
    cacheHit: optimization.cacheHit,
    destination_id: articleMatch.destination_id,
    optimization_cache_id: optimization.cacheRecord?.id || null,
    optimization_status: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
    reasonCode: optimization.aiResolution?.reasonCode || null,
    reasonMessage: optimization.aiResolution?.reasonMessage || null,
    stream_id: articleMatch.stream_id,
    usedDeterministicFallback: Boolean(optimization.aiResolution?.usedDeterministicFallback),
  };
}

async function applyWebsiteOptimizedPayloadToPost(db, { payload, post, stream, translation }) {
  if (!post?.id || !payload) {
    return;
  }

  const title = trimText(payload.title) || translation?.title || post.slug;
  const summary = trimText(payload.summary) || translation?.summary || post.excerpt || title;
  const content_md = trimText(payload.body) || translation?.content_md || summary;
  const article = buildStoryStructuredArticle({
    body: content_md,
    categoryNames: [],
    source_name: post.source_name,
    source_url: post.source_url,
    summary,
    title,
  });

  const nextTranslation = await db.postTranslation.upsert({
    where: {
      post_id_locale: {
        locale: stream.locale,
        post_id: post.id,
      },
    },
    update: {
      content_html: article.content_html,
      content_md,
      source_attribution: payload.source_attribution || translation?.source_attribution || `Source: ${post.source_name} - ${post.source_url}`,
      structured_content_json: article.article,
      summary,
      title,
    },
    create: {
      content_html: article.content_html,
      content_md,
      locale: stream.locale,
      post_id: post.id,
      source_attribution: payload.source_attribution || `Source: ${post.source_name} - ${post.source_url}`,
      structured_content_json: article.article,
      summary,
      title,
    },
  });

  await db.sEORecord.upsert({
    where: {
      post_translation_id: nextTranslation.id,
    },
    update: {
      canonical_url: payload.canonical_url || translation?.seoRecord?.canonical_url || toAbsoluteUrl(buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug))),
      keywords_json: dedupeStrings(translation?.seoRecord?.keywords_json || []),
      meta_description: trimText(payload.meta_description) || summary,
      meta_title: trimText(payload.meta_title) || title,
      og_description: trimText(payload.meta_description) || summary,
      og_image_id: post.featured_image_id || translation?.seoRecord?.og_image_id || null,
      og_title: trimText(payload.meta_title) || title,
      twitter_description: trimText(payload.meta_description) || summary,
      twitter_title: trimText(payload.meta_title) || title,
    },
    create: {
      authors_json: ["NewsPub Editorial"],
      canonical_url: payload.canonical_url || toAbsoluteUrl(buildLocalizedPath(stream.locale, publicRouteSegments.newsPost(post.slug))),
      keywords_json: dedupeStrings(translation?.seoRecord?.keywords_json || []),
      meta_description: trimText(payload.meta_description) || summary,
      meta_title: trimText(payload.meta_title) || title,
      og_description: trimText(payload.meta_description) || summary,
      og_image_id: post.featured_image_id || null,
      og_title: trimText(payload.meta_title) || title,
      post_translation_id: nextTranslation.id,
      twitter_description: trimText(payload.meta_description) || summary,
      twitter_title: trimText(payload.meta_title) || title,
    },
  });

  await db.post.update({
    where: {
      id: post.id,
    },
    data: {
      canonical_content_hash: createContentHash(title, summary, content_md, payload.source_attribution || ""),
      excerpt: summary,
    },
  });
}

function getRecentAttemptPayload(payload_json) {
  return payload_json && typeof payload_json === "object" && !Array.isArray(payload_json) ? payload_json : {};
}

function getSocialPayloadFingerprint(payload = {}) {
  return createContentHash(
    payload.platform,
    payload.destination_kind,
    payload.body,
    payload.extraLinkUrl,
    payload.title,
    payload.summary,
    payload.canonical_url,
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
    orderBy: [{ published_at: "desc" }, { created_at: "desc" }],
    select: {
      id: true,
      payload_json: true,
      published_at: true,
    },
    where: {
      destination_id: destination.id,
      published_at: {
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
  const currentCanonicalUrl = trimText(nextPayload.canonical_url);
  const latestSucceededAttempt = recentSucceededAttempts[0] || null;
  const maxPostsPer24Hours =
    destination.platform === "FACEBOOK"
      ? socialGuardrails.facebookMaxPostsPer24Hours
      : socialGuardrails.instagramMaxPostsPer24Hours;
  const publishedLast24Hours = recentSucceededAttempts.filter((attempt) => {
    if (!(attempt.published_at instanceof Date)) {
      return false;
    }

    return attempt.published_at >= new Date(now.getTime() - 24 * 60 * 60 * 1000);
  }).length;

  if (!bypassDuplicateCooldown && latestSucceededAttempt?.published_at instanceof Date) {
    const nextAllowedPublishAt = new Date(
      latestSucceededAttempt.published_at.getTime() + socialGuardrails.minPostIntervalMinutes * 60 * 1000,
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
      if (!(attempt.published_at instanceof Date) || attempt.published_at < duplicateWindowStart) {
        continue;
      }

      const recentPayload = getRecentAttemptPayload(attempt.payload_json);

      if (getSocialPayloadFingerprint(recentPayload) === currentFingerprint) {
        issues.push({
          code: "duplicate_social_payload",
          message: "An identical social post was already published recently for this destination.",
        });
        break;
      }

      if (currentCanonicalUrl && trimText(recentPayload.canonical_url) === currentCanonicalUrl) {
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
      response_json: {
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
 * @param {string} article_match_id - Article match id to re-optimize.
 * @param {object} [options] - Refresh options.
 * @param {boolean} [options.force=false] - When true, bypasses cache reuse.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Optimization result plus the updated article match.
 */
export async function refreshArticleMatchOptimization(
  article_match_id,
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
              image_url: true,
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
      id: article_match_id,
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
      hold_reasons_json: shouldHold ? getHoldReasonCodes({ policy: optimization.policy, stream: articleMatch.stream }) : [],
      optimization_status: optimization.cacheRecord.status,
      optimized_payload_json: optimization.payload,
      policy_reasons_json: optimization.policy.reasons,
      policy_status: optimization.policy.status,
      readiness_checks_json: optimization.policy.readinessChecks,
      status: shouldHold ? "HELD_FOR_REVIEW" : "ELIGIBLE",
      workflow_stage:
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
        entity_id: articleMatch.id,
        entity_type: "article_match",
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
          image_url: true,
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
  { lease_owner = createLeaseOwner("publish"), now = new Date() } = {},
) {
  if (typeof db.publishAttempt?.updateMany !== "function") {
    return {
      lease_owner,
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
      available_at: true,
      id: true,
      started_at: true,
      status: true,
      stream_id: true,
    },
    where: {
      id: attemptId,
    },
  });

  if (!existingAttempt) {
    return {
      lease_owner,
      record: null,
    };
  }

  const claimResult = await db.publishAttempt.updateMany({
    data: {
      heartbeat_at: now,
      lease_expires_at: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
      lease_owner,
      started_at: existingAttempt.started_at || now,
      status: "RUNNING",
    },
    where: {
      id: attemptId,
      status: "PENDING",
      available_at: {
        lte: now,
      },
      OR: [
        {
          lease_expires_at: null,
        },
        {
          lease_expires_at: {
            lte: now,
          },
        },
      ],
    },
  });

  if (!claimResult.count) {
    return {
      lease_owner,
      record: null,
    };
  }

  return {
    lease_owner,
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
    orderBy: [{ available_at: "asc" }, { created_at: "asc" }],
    where: {
      status: "PENDING",
      available_at: {
        lte: now,
      },
      OR: [
        {
          lease_expires_at: null,
        },
        {
          lease_expires_at: {
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

async function refreshPublishAttemptLease(db, attemptId, lease_owner, now = new Date()) {
  if (!lease_owner) {
    return;
  }

  if (typeof db.publishAttempt?.updateMany === "function") {
    await db.publishAttempt.updateMany({
      data: {
        heartbeat_at: now,
        lease_expires_at: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
      },
      where: {
        id: attemptId,
        lease_owner,
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
        heartbeat_at: now,
        lease_expires_at: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
        lease_owner,
      },
    });
  }
}

async function executePublishAttempt(
  db,
  attemptId,
  { bypassSocialDuplicateCooldown = false, claimedAttempt = null, lease_owner: existingLeaseOwner = null, now = new Date() } = {},
) {
  const claimedPublishAttempt = claimedAttempt
    ? {
        lease_owner: existingLeaseOwner,
        record: claimedAttempt,
      }
    : await claimPublishAttemptById(db, attemptId, {
        lease_owner: existingLeaseOwner || createLeaseOwner("publish"),
        now,
      });
  const lease_owner = claimedPublishAttempt.lease_owner || existingLeaseOwner || createLeaseOwner("publish");
  const attempt = claimedPublishAttempt.record;

  if (!attempt) {
    throw new NewsPubError("Publish attempt was not found.", {
      status: "publish_attempt_not_found",
      statusCode: 404,
    });
  }
  const publicationMode =
    trimText(attempt.diagnostics_json?.publicationMode)
    || ((attempt.retry_count || 0) > 0
      ? "retry"
      : attempt.articleMatch?.duplicate_of_match_id
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

  const optimization = await refreshArticleMatchOptimization(attempt.article_match_id, {}, db);
  const context = buildTemplateContext({
    articleMatch: attempt.articleMatch,
    post: attempt.post,
    stream: attempt.stream,
    template,
    translation,
  });
  const optimizedPayload = optimization.payload || {};
  let payload = {
    body: trimText(optimizedPayload.body) || renderTemplateString(template?.body_template, context),
    canonical_url: optimizedPayload.canonical_url || context.canonical_url,
    caption: trimText(optimizedPayload.caption),
    destination_kind: destination.kind,
    extraLinkPlacement: context.postLinkPlacement,
    extraLinkUrl: context.postLinkUrl,
    hashtags:
      Array.isArray(optimizedPayload.hashtags) && optimizedPayload.hashtags.length
        ? optimizedPayload.hashtags.join(" ")
        : renderTemplateString(template?.hashtags_template, context),
    mediaUrl: optimizedPayload.mediaUrl || context.image_url,
    meta_description: trimText(optimizedPayload.meta_description),
    meta_title: trimText(optimizedPayload.meta_title),
    platform: attempt.platform,
    source_attribution:
      optimizedPayload.source_attribution
      || `Source: ${context.source_name}${context.source_url ? ` - ${context.source_url}` : ""}`,
    sourceReference: `Source: ${context.source_name}${context.source_url ? ` - ${context.source_url}` : ""}`,
    summary:
      trimText(optimizedPayload.summary)
      || renderTemplateString(template?.summary_template, context)
      || context.summary,
    title:
      trimText(optimizedPayload.title)
      || renderTemplateString(template?.title_template, context)
      || context.title,
    warnings: optimizedPayload.policyWarnings || optimizedPayload.warnings || [],
  };

  await refreshPublishAttemptLease(db, attempt.id, lease_owner, now);

  await db.publishAttempt.update({
    where: {
      id: attempt.id,
    },
    data: {
      diagnostics_json: {
        ...(attempt.diagnostics_json || {}),
        aiResolution: optimization.aiResolution || null,
        cacheHit: optimization.cacheHit,
        optimization_cache_id: optimization.cacheRecord?.id || null,
        optimization_hash: optimization.optimization_hash,
        optimization_status: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
        policyReasons: optimization.policy.reasons,
        policy_status: optimization.policy.status,
        policyWarnings: optimization.policy.warnings,
        readinessChecks: optimization.policy.readinessChecks,
        riskScore: optimization.policy.riskScore,
      },
      payload_json: payload,
      heartbeat_at: now,
      lease_expires_at: getLeaseExpiration(now, getPublishAttemptLeaseMs()),
      lease_owner,
      started_at: attempt.started_at || now,
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
        completed_at: new Date(),
        last_error_message: "Destination is not connected.",
        heartbeat_at: null,
        last_error_at: new Date(),
        lease_expires_at: null,
        lease_owner: null,
        response_json: {
          error: "destination_not_connected",
        },
        status: "FAILED",
      },
    });

    await db.articleMatch.update({
      where: {
        id: attempt.article_match_id,
      },
      data: {
        failed_at: new Date(),
        status: "FAILED",
      },
    });

    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entity_id: failedAttempt.id,
        entity_type: "publish_attempt",
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
            payload_json: {
              ...payload,
              guardrailAdjustments: guardrailResult.adjustments,
            },
          },
        });
      }
    }

    await refreshPublishAttemptLease(db, attempt.id, lease_owner, new Date());

    if (attempt.platform === "WEBSITE") {
      await applyWebsiteOptimizedPayloadToPost(db, {
        payload,
        post: attempt.post,
        stream: attempt.stream,
        translation,
      });
      const remote_id = `${destination.platform.toLowerCase()}_${createContentHash(
        attempt.id,
        context.title,
        Date.now(),
      ).slice(0, 14)}`;

      publishResult = {
        published_at: new Date(),
        remote_id,
        response_json: {
          canonical_url: context.canonical_url,
          remote_id,
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
    const failed_at = new Date();
    const failedAttempt = await db.publishAttempt.update({
      where: {
        id: attempt.id,
      },
      data: {
        completed_at: failed_at,
        diagnostics_json: {
          ...(attempt.diagnostics_json || {}),
          aiResolution: optimization.aiResolution || null,
          cacheHit: optimization.cacheHit,
          errorDetails:
            error instanceof DestinationPublishError
              ? error.response_json || null
              : null,
          optimization_cache_id: optimization.cacheRecord?.id || null,
          optimization_hash: optimization.optimization_hash,
          optimization_status: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
          policyReasons: optimization.policy.reasons,
          policy_status: optimization.policy.status,
          policyWarnings: optimization.policy.warnings,
          readinessChecks: optimization.policy.readinessChecks,
          riskScore: optimization.policy.riskScore,
        },
        last_error_code:
          trimText(error?.status)
          || trimText(error?.response_json?.error)
          || "destination_publish_failed",
        last_error_message: error instanceof Error ? error.message : "Destination publication failed.",
        heartbeat_at: null,
        last_error_at: failed_at,
        lease_expires_at: null,
        lease_owner: null,
        response_json:
          error instanceof DestinationPublishError
            ? {
                ...(error.response_json || {}),
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
      diagnostics_json: failedAttempt.diagnostics_json,
      last_error_code: failedAttempt.last_error_code,
      last_error_message: failedAttempt.last_error_message,
      response_json: failedAttempt.response_json,
    });

    // Jobs history, post history, and audit events all consume the same
    // flattened diagnostic reason so Meta pacing and policy blocks read alike.
    await db.articleMatch.update({
      where: {
        id: attempt.article_match_id,
      },
      data: {
        failed_at,
        status: "FAILED",
        workflow_stage: "FAILED",
      },
    });

    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entity_id: failedAttempt.id,
        entity_type: "publish_attempt",
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

  const published_at = publishResult.published_at || new Date();
  const succeededAttempt = await db.publishAttempt.update({
    where: {
      id: attempt.id,
    },
      data: {
        completed_at: published_at,
        diagnostics_json: {
          ...(attempt.diagnostics_json || {}),
          aiResolution: optimization.aiResolution || null,
          cacheHit: optimization.cacheHit,
          optimization_cache_id: optimization.cacheRecord?.id || null,
          optimization_hash: optimization.optimization_hash,
          optimization_status: optimization.cacheRecord?.status || optimization.aiResolution?.status || null,
          policyReasons: optimization.policy.reasons,
          policy_status: optimization.policy.status,
          policyWarnings: optimization.policy.warnings,
          readinessChecks: optimization.policy.readinessChecks,
          riskScore: optimization.policy.riskScore,
        },
        published_at,
        remote_id: publishResult.remote_id,
        heartbeat_at: null,
        lease_expires_at: null,
        lease_owner: null,
        response_json: publishResult.response_json || {
          canonical_url: context.canonical_url,
          remote_id: publishResult.remote_id || null,
          status: "ok",
        },
        retryable: false,
        status: "SUCCEEDED",
      },
    });

  await db.articleMatch.update({
    where: {
      id: attempt.article_match_id,
    },
      data: {
        published_at,
        queued_at: attempt.queued_at || new Date(),
        status: "PUBLISHED",
        workflow_stage: "PUBLISHED",
      },
    });

  await db.post.update({
    where: {
      id: attempt.post_id,
    },
    data: {
      editorial_stage: "APPROVED",
      published_at,
      scheduled_publish_at: null,
      status: "PUBLISHED",
    },
  });

  if (attempt.platform === "WEBSITE") {
    try {
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
                post_id: attempt.post_id,
              },
            })
          ).map((entry) => entry.category.slug),
          locales: [attempt.stream.locale],
          slug: attempt.post.slug,
        },
      );
    } catch (error) {
      await recordObservabilityEvent(
        {
          action: "PUBLICATION_REVALIDATION_FAILED",
          entity_id: attempt.post_id,
          entity_type: "post",
          error,
          level: "warn",
          message: error instanceof Error ? error.message : "Published post revalidation failed.",
          payload: {
            article_match_id: attempt.article_match_id,
            publish_attempt_id: attempt.id,
          },
        },
        db,
      );
    }
  }

  await createAuditEventRecord(
    {
      action: "PUBLISH_ATTEMPT_SUCCEEDED",
      entity_id: succeededAttempt.id,
      entity_type: "publish_attempt",
      payload_json: {
        platform: attempt.platform,
        publicationMode,
        remote_id: publishResult.remote_id || null,
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

  return articleMatch?.duplicate_of_match_id ? "repost" : "original";
}

async function createPublishAttempt(
  db,
  { articleMatch, article_match_id, now = new Date(), platform, post_id, publicationMode = "", publishAt, queueSource = "manual", retryOfAttemptId = null, stream },
) {
  const attempt_count = await db.publishAttempt.count({
    where: {
      article_match_id,
    },
  });
  const queued_at = now;
  const available_at = publishAt instanceof Date ? publishAt : queued_at;
  const resolvedPublicationMode = resolvePublicationMode(articleMatch, publicationMode);

  return db.publishAttempt.create({
    data: {
      available_at,
      article_match_id,
      attempt_number: attempt_count + 1,
      destination_id: stream.destination_id,
      diagnostics_json: {
        publicationMode: resolvedPublicationMode,
        queueSource,
        queued_at: queued_at.toISOString(),
        ...(retryOfAttemptId
          ? {
              retryOfAttemptId,
            }
          : {}),
        scheduledFor: available_at.toISOString(),
      },
      idempotency_key: createContentHash(article_match_id, platform, attempt_count + 1).slice(0, 36),
      platform,
      post_id,
      payload_json: publishAt
        ? {
            publicationMode: resolvedPublicationMode,
            scheduledFor: available_at.toISOString(),
          }
        : null,
      queued_at,
      retry_count: Math.max(0, attempt_count),
      status: "PENDING",
      stream_id: stream.id,
    },
  });
}

async function queueArticleMatchForPublication(
  db,
  articleMatch,
  { now = new Date(), publicationMode = "", publishAt = null, queueSource = "manual" } = {},
) {
  if (!articleMatch?.canonical_post_id) {
    throw new NewsPubError("Article match does not have a canonical post.", {
      status: "post_not_ready_for_publication",
      statusCode: 400,
    });
  }

  const scheduled_publish_at = publishAt instanceof Date && publishAt > now ? publishAt : null;

  if (scheduled_publish_at) {
    await db.post.update({
      where: {
        id: articleMatch.canonical_post_id,
      },
      data: {
        scheduled_publish_at,
        status: "SCHEDULED",
      },
    });
  }

  const attempt = await createPublishAttempt(db, {
    articleMatch,
    article_match_id: articleMatch.id,
    now,
    platform: articleMatch.destination.platform,
    post_id: articleMatch.canonical_post_id,
    publicationMode,
    publishAt: scheduled_publish_at,
    queueSource,
    stream: articleMatch.stream,
  });

  if (typeof db.articleMatch?.update === "function") {
    await db.articleMatch.update({
      where: {
        id: articleMatch.id,
      },
      data: {
        queued_at: now,
        status: "QUEUED",
        workflow_stage: scheduled_publish_at ? "SCHEDULED" : "APPROVED",
      },
    });
  }

  return attempt;
}

async function executeQueuedPublishAttemptForFetchRun(
  db,
  publishAttempt,
  articleMatch,
  summary,
  { now = new Date() } = {},
) {
  try {
    const completedAttempt = await executePublishAttempt(db, publishAttempt.id, {
      now,
    });

    if (completedAttempt?.status === "SUCCEEDED") {
      summary.published_count += 1;
      return completedAttempt;
    }

    if (completedAttempt?.status === "FAILED") {
      summary.failed_count += 1;
    }

    return completedAttempt;
  } catch (error) {
    summary.failed_count += 1;
    await recordObservabilityEvent(
      {
        action: "PUBLISH_ATTEMPT_FAILED",
        entity_id: publishAttempt?.id || articleMatch.id,
        entity_type: publishAttempt?.id ? "publish_attempt" : "article_match",
        error,
      },
      db,
    );

    return null;
  }
}

/**
 * Publishes one NewsPub article match through the canonical destination workflow.
 */
export async function publishArticleMatch(article_match_id, { publishAt } = {}, prisma) {
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
      id: article_match_id,
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

  if ((attempt.retry_count || 0) >= (attempt.stream?.retry_limit || 0)) {
    return false;
  }

  if (!attempt.response_json?.retryable) {
    return false;
  }

  if (
    (attempt.articleMatch?.publishAttempts || []).some(
      (candidate) => candidate.id !== attempt.id && candidate.status === "SUCCEEDED",
    )
  ) {
    return false;
  }

  const completed_at = attempt.completed_at instanceof Date ? attempt.completed_at : null;

  if (!completed_at) {
    return false;
  }

  const nextRetryAt = new Date(
    completed_at.getTime() + (attempt.stream?.retry_backoff_minutes || 0) * 60 * 1000,
  );

  return nextRetryAt <= now;
}

/** Creates and executes a new retry attempt for a previously failed publication. */
export async function retryPublishAttempt(attemptId, { actor_id = null, automated = false } = {}, prisma) {
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

  if ((attempt.retry_count || 0) >= (attempt.stream?.retry_limit || 0)) {
    throw new NewsPubError("The stream retry limit has already been reached for this publication.", {
      status: "publish_attempt_retry_limit_reached",
      statusCode: 400,
    });
  }

  const nextAttempt = await createPublishAttempt(db, {
    articleMatch: attempt.articleMatch,
    article_match_id: attempt.article_match_id,
    platform: attempt.platform,
    post_id: attempt.post_id,
    publicationMode: "retry",
    queueSource: automated ? "retry_scheduler" : "retry_request",
    retryOfAttemptId: attempt.id,
    stream: attempt.stream,
  });

  await createAuditEventRecord(
    {
      action: automated ? "PUBLISH_ATTEMPT_RETRY_SCHEDULED" : "PUBLISH_ATTEMPT_RETRY_REQUESTED",
      actor_id,
      entity_id: nextAttempt.id,
      entity_type: "publish_attempt",
      payload_json: {
        previousAttemptId: attempt.id,
        retry_count: nextAttempt.retry_count,
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
export async function manualRepostArticleMatch(article_match_id, { actor_id = null } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const articleMatch = await db.articleMatch.findUnique({
    include: {
      canonicalPost: true,
      destination: true,
      publishAttempts: {
        orderBy: [{ created_at: "desc" }],
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
      id: article_match_id,
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
    article_match_id: articleMatch.id,
    platform: articleMatch.destination.platform,
    post_id: articleMatch.canonical_post_id,
    publicationMode: "repost",
    queueSource: "manual_repost",
    stream: articleMatch.stream,
  });

  const latestSuccessfulAttempt =
    articleMatch.publishAttempts.find((attempt) => attempt.status === "SUCCEEDED") || null;

  await createAuditEventRecord(
    {
      action: "PUBLISH_ATTEMPT_MANUAL_REPOST_REQUESTED",
      actor_id,
      entity_id: nextAttempt.id,
      entity_type: "publish_attempt",
      payload_json: {
        article_match_id: articleMatch.id,
        bypassedDuplicateCooldown: true,
        canonical_post_id: articleMatch.canonical_post_id,
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
    ai_cache_hit_count: 0,
    blocked_count: 0,
    duplicate_count: 0,
    failed_count: 0,
    fetched_count: Number(providerResult?.fetched_count || 0),
    held_count: 0,
    optimized_count: 0,
    publishable_count: 0,
    published_count: 0,
    queued_count: 0,
    skipped_count: 0,
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
    max_posts_per_run: getStreamMaxPostsPerRun(stream),
    repostEligibleDuplicates,
    uniqueEligibleCandidates,
  });
}

function buildStreamValidationInput(stream) {
  return {
    country_allowlist_json: stream.country_allowlist_json,
    destination: stream.destination,
    language_allowlist_json: stream.language_allowlist_json,
    locale: stream.locale,
    mode: stream.mode,
    providerDefaults: stream.activeProvider?.request_defaults_json,
    providerFilters: stream.settings_json?.providerFilters,
    provider_key: stream.activeProvider?.provider_key,
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
  stream_id,
  {
    actor_id = null,
    existingFetchRun = null,
    now = new Date(),
    requestedWindow = null,
    trigger_type = "manual",
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
      id: stream_id,
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
    stream.checkpoints.find((entry) => entry.provider_config_id === stream.active_provider_id) || null;
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
          attempt_count: 1,
          available_at: now,
          execution_details_json: buildInitialFetchRunExecutionDetails(fetchWindow),
          heartbeat_at: now,
          lease_expires_at: getLeaseExpiration(now, getFetchRunLeaseMs()),
          lease_owner: createLeaseOwner("fetch"),
          provider_config_id: stream.active_provider_id,
          requested_by_id: actor_id,
          started_at: now,
          status: "RUNNING",
          stream_id: stream.id,
          trigger_type,
          window_end: fetchWindow.end,
          window_start: fetchWindow.start,
        },
      });

  if (!existingFetchRun) {
    await db.publishingStream.update({
      where: {
        id: stream.id,
      },
      data: {
        last_run_started_at: fetchRun.started_at,
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
  const timestamps = [stream?.last_run_completed_at, stream?.last_failure_at]
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
  if (!(stream?.last_run_started_at instanceof Date)) {
    return false;
  }

  const latestOutcomeAt = getLatestStreamOutcomeTimestamp(stream);

  if (!(latestOutcomeAt instanceof Date)) {
    return true;
  }

  return stream.last_run_started_at > latestOutcomeAt;
}

/**
 * Returns the next scheduled execution time for a stream, when one can be
 * derived from the current schedule and latest completed run.
 */
export function getStreamNextScheduledRunAt(stream) {
  if ((stream?.schedule_interval_minutes || 0) <= 0) {
    return null;
  }

  if (stream?.next_run_at instanceof Date) {
    return stream.next_run_at;
  }

  if (isStreamExecutionInProgress(stream)) {
    return null;
  }

  if (!(stream?.last_run_completed_at instanceof Date)) {
    return null;
  }

  return new Date(stream.last_run_completed_at.getTime() + stream.schedule_interval_minutes * 60 * 1000);
}

function createScheduledFetchQueueKey(stream_id, runAt) {
  return `scheduled:${stream_id}:${serializeDate(runAt)}`;
}

function getFetchRunHeartbeatIntervalMs() {
  return Math.max(50, Math.floor(getFetchRunLeaseMs() / 3));
}

async function refreshFetchRunLease(db, fetchRunId, lease_owner, now = new Date()) {
  if (!lease_owner) {
    return;
  }

  if (typeof db.fetchRun?.updateMany === "function") {
    await db.fetchRun.updateMany({
      data: {
        heartbeat_at: now,
        lease_expires_at: getLeaseExpiration(now, getFetchRunLeaseMs()),
      },
      where: {
        id: fetchRunId,
        lease_owner,
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
        heartbeat_at: now,
        lease_expires_at: getLeaseExpiration(now, getFetchRunLeaseMs()),
        lease_owner,
      },
    });
  }
}

async function refreshFetchRunLeases(db, executionContexts = [], now = new Date()) {
  const uniqueExecutionContexts = [...new Map(
    (executionContexts || [])
      .filter((executionContext) => executionContext?.fetchRun?.id && executionContext?.fetchRun?.lease_owner)
      .map((executionContext) => [executionContext.fetchRun.id, executionContext]),
  ).values()];

  await Promise.all(
    uniqueExecutionContexts.map((executionContext) =>
      refreshFetchRunLease(
        db,
        executionContext.fetchRun.id,
        executionContext.fetchRun.lease_owner,
        now,
      )),
  );
}

async function runWithFetchRunHeartbeat(db, executionContexts, task) {
  const refreshableExecutionContexts = (executionContexts || []).filter(
    (executionContext) => executionContext?.fetchRun?.id && executionContext?.fetchRun?.lease_owner,
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
  { lease_owner = createLeaseOwner("fetch"), now = new Date() } = {},
) {
  if (typeof db.fetchRun?.updateMany !== "function") {
    return {
      lease_owner,
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
      lease_owner,
      record: null,
    };
  }

  const claimResult = await db.fetchRun.updateMany({
    data: {
      attempt_count: (existingRun.attempt_count || 0) + 1,
      heartbeat_at: now,
      lease_expires_at: getLeaseExpiration(now, getFetchRunLeaseMs()),
      lease_owner,
      started_at: now,
      status: "RUNNING",
    },
    where: {
      id: fetchRunId,
      status: "PENDING",
      available_at: {
        lte: now,
      },
      OR: [
        {
          lease_expires_at: null,
        },
        {
          lease_expires_at: {
            lte: now,
          },
        },
      ],
    },
  });

  if (!claimResult.count) {
    return {
      lease_owner,
      record: null,
    };
  }

  return {
    lease_owner,
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
    orderBy: [{ available_at: "asc" }, { created_at: "asc" }],
    where: {
      status: "PENDING",
      available_at: {
        lte: now,
      },
      OR: [
        {
          lease_expires_at: null,
        },
        {
          lease_expires_at: {
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
          lease_expires_at: {
            lte: now,
          },
        },
        {
          lease_expires_at: null,
          started_at: {
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
        available_at: now,
        last_error_message: staleRun.last_error_message || "Recovered stale fetch run for retry.",
        heartbeat_at: null,
        last_error_at: now,
        last_error_code: staleRun.last_error_code || "stale_fetch_run_recovered",
        lease_expires_at: null,
        lease_owner: null,
        orphaned_at: now,
        started_at: null,
        status: "PENDING",
      },
    });

    await db.publishingStream.update({
      where: {
        id: staleRun.stream_id,
      },
      data: {
        last_run_started_at: null,
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
          scheduled_publish_at: true,
        },
      },
    },
    where: {
      status: "RUNNING",
      OR: [
        {
          lease_expires_at: {
            lte: now,
          },
        },
        {
          lease_expires_at: null,
          started_at: {
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
        available_at: staleAttempt.post?.scheduled_publish_at || now,
        last_error_code: staleAttempt.last_error_code || "stale_publish_attempt_recovered",
        last_error_message: staleAttempt.last_error_message || "Recovered stale publish attempt for retry.",
        heartbeat_at: null,
        last_error_at: now,
        lease_expires_at: null,
        lease_owner: null,
        orphaned_at: now,
        started_at: null,
        status: "PENDING",
      },
    });
  }

  return staleAttempts;
}

async function recoverStrandedStreamExecutions(db, { now = new Date() } = {}) {
  if (
    typeof db.publishingStream?.findMany !== "function"
    || typeof db.fetchRun?.findFirst !== "function"
    || typeof db.fetchRun?.upsert !== "function"
  ) {
    return [];
  }

  const streams = await db.publishingStream.findMany({
    include: {
      checkpoints: true,
    },
    where: {
      last_run_started_at: {
        not: null,
      },
      status: "ACTIVE",
    },
  });
  const recoveredRuns = [];

  for (const stream of streams) {
    if (!isStreamExecutionInProgress(stream)) {
      continue;
    }

    const existingQueuedRun = await db.fetchRun.findFirst({
      where: {
        status: {
          in: ["PENDING", "RUNNING"],
        },
        stream_id: stream.id,
      },
    });

    if (existingQueuedRun) {
      continue;
    }

    const checkpoint =
      stream.checkpoints?.find((entry) => entry.provider_config_id === stream.active_provider_id) || null;
    const writeCheckpointOnSuccess = (stream.schedule_interval_minutes || 0) > 0;
    const fetchWindow = resolveFetchWindowForExecution({
      checkpoint,
      now,
      writeCheckpointOnSuccess,
    });
    const queue_key = `recovered:${stream.id}:${serializeDate(stream.last_run_started_at)}`;
    const queuedRun = await db.fetchRun.upsert({
      where: {
        queue_key,
      },
      update: {
        available_at: now,
        status: "PENDING",
      },
      create: {
        available_at: now,
        execution_details_json: buildInitialFetchRunExecutionDetails(fetchWindow),
        provider_config_id: stream.active_provider_id,
        queue_key,
        status: "PENDING",
        stream_id: stream.id,
        trigger_type: "recovery",
        window_end: fetchWindow.end,
        window_start: fetchWindow.start,
      },
    });

    recoveredRuns.push(queuedRun);
  }

  return recoveredRuns;
}

async function recoverStrandedAutoPublishAttempts(db, { now = new Date() } = {}) {
  if (typeof db.articleMatch?.findMany !== "function") {
    return [];
  }

  const strandedMatches = await db.articleMatch.findMany({
    include: {
      canonicalPost: {
        select: {
          scheduled_publish_at: true,
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
      canonical_post_id: {
        not: null,
      },
      published_at: null,
      queued_at: {
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
      publishAt: articleMatch.canonicalPost?.scheduled_publish_at || now,
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
      schedule_interval_minutes: {
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
            stream_id: stream.id,
          },
        })
      : null;

    if (existingQueuedRun) {
      continue;
    }

    const checkpoint =
      stream.checkpoints.find((entry) => entry.provider_config_id === stream.active_provider_id) || null;
    const fetchWindow = resolveFetchWindowForExecution({
      checkpoint,
      now,
      writeCheckpointOnSuccess: true,
    });
    const queue_key = createScheduledFetchQueueKey(stream.id, scheduledRunAt);
    const queuedRun = await db.fetchRun.upsert({
      where: {
        queue_key,
      },
      update: {
        available_at: now,
      },
      create: {
        available_at: now,
        execution_details_json: buildInitialFetchRunExecutionDetails(fetchWindow),
        provider_config_id: stream.active_provider_id,
        queue_key,
        status: "PENDING",
        stream_id: stream.id,
        trigger_type: "scheduled",
        window_end: fetchWindow.end,
        window_start: fetchWindow.start,
      },
    });

    await db.publishingStream.update({
      where: {
        id: stream.id,
      },
      data: {
        next_run_at: new Date(
          scheduledRunAt.getTime() + stream.schedule_interval_minutes * 60 * 1000,
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
      duplicate_count: summary.duplicate_count,
      fetched_count: summary.fetched_count,
      held_count: summary.held_count,
      publishable_count: summary.publishable_count,
      published_count: summary.published_count,
      queued_count: summary.queued_count,
      skipped_count: summary.skipped_count,
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
  { actor_id = null, now = new Date() } = {},
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
        stream_id_provider_config_id: {
          provider_config_id: executionContext.stream.active_provider_id,
          stream_id: executionContext.stream.id,
        },
      },
      update: {
        cursor_json: checkpointCursor,
        last_successful_fetch_at: executionContext.fetchWindow.end,
      },
      create: {
        cursor_json: checkpointCursor,
        last_successful_fetch_at: executionContext.fetchWindow.end,
        provider_config_id: executionContext.stream.active_provider_id,
        stream_id: executionContext.stream.id,
      },
    });
  }

  const completedRun = await db.fetchRun.update({
    where: {
      id: executionContext.fetchRun.id,
    },
    data: {
      ai_cache_hit_count: summary.ai_cache_hit_count,
      available_at: now,
      blocked_count: summary.blocked_count,
      duplicate_count: summary.duplicate_count,
      execution_details_json: executionDetails,
      failed_count: summary.failed_count,
      fetched_count: summary.fetched_count,
      finished_at: new Date(),
      heartbeat_at: null,
      held_count: summary.held_count,
      lease_expires_at: null,
      lease_owner: null,
      optimized_count: summary.optimized_count,
      provider_cursor_after_json: checkpointCursor,
      provider_cursor_before_json: executionContext.checkpoint?.cursor_json || null,
      publishable_count: summary.publishable_count,
      published_count: summary.published_count,
      queued_count: summary.queued_count,
      skipped_count: summary.skipped_count,
      status: "SUCCEEDED",
    },
  });

  await db.publishingStream.update({
    where: {
      id: executionContext.stream.id,
    },
    data: {
      consecutive_failure_count: 0,
      last_run_completed_at: now,
      last_run_started_at: executionContext.fetchRun.started_at,
    },
  });

  await createAuditEventRecord(
    {
      action: "FETCH_RUN_COMPLETED",
      actor_id,
      entity_id: completedRun.id,
      entity_type: "fetch_run",
      payload_json: {
        ai_cache_hit_count: summary.ai_cache_hit_count,
        blocked_count: summary.blocked_count,
        duplicate_count: summary.duplicate_count,
        executionMode: executionGroup?.executionMode || "single",
        fetched_count: summary.fetched_count,
        groupId: executionGroup?.id || null,
        held_count: summary.held_count,
        optimized_count: summary.optimized_count,
        partitionReasonCodes: executionGroup?.partitionReasonCodes || [],
        provider_key:
          providerResult?.provider_key
          || executionGroup?.provider_key
          || executionContext.stream.activeProvider?.provider_key
          || null,
        publishable_count: summary.publishable_count,
        published_count: summary.published_count,
        sharedStreamIds: executionGroup?.streamIds || [executionContext.stream.id],
        skipped_count: summary.skipped_count,
        stream_id: executionContext.stream.id,
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
  { actor_id = null, executionGroup = null } = {},
) {
  const failedRun = await db.fetchRun.update({
    where: {
      id: executionContext.fetchRun.id,
    },
    data: {
      available_at: new Date(),
      last_error_message: error instanceof Error ? error.message : `${error}`,
      execution_details_json: {
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
      finished_at: new Date(),
      heartbeat_at: null,
      last_error_at: new Date(),
      last_error_code: trimText(error?.status) || "fetch_run_failed",
      lease_expires_at: null,
      lease_owner: null,
      status: "FAILED",
    },
  });
  const nextFailureCount = executionContext.stream.consecutive_failure_count + 1;
  const nextStatus = nextFailureCount >= executionContext.stream.retry_limit ? "PAUSED" : executionContext.stream.status;

  await db.publishingStream.update({
    where: {
      id: executionContext.stream.id,
    },
    data: {
      consecutive_failure_count: nextFailureCount,
      last_failure_at: new Date(),
      last_run_started_at: executionContext.fetchRun.started_at,
      status: nextStatus,
    },
  });

  await recordObservabilityEvent(
    {
      action: nextStatus === "PAUSED" ? "STREAM_EXECUTION_PAUSED" : "FETCH_RUN_FAILED",
      actor_id,
      entity_id: failedRun.id,
      entity_type: "fetch_run",
      error,
      message: error instanceof Error ? error.message : "Fetch run failed.",
      payload: {
        executionMode: executionGroup?.executionMode || "single",
        groupId: executionGroup?.id || null,
        partitionReasonCodes: executionGroup?.partitionReasonCodes || [],
        stream_id: executionContext.stream.id,
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
  { actor_id = null, executionGroup = null, now = new Date() } = {},
) {
  const summary = createFetchRunSummary(providerResult);
  const uniqueEligibleCandidates = [];
  const repostEligibleDuplicates = [];
  const fetchWindowPolicy = resolveStreamArticleWindowPolicy(executionContext.stream, {
    provider_key: providerResult?.provider_key || null,
    requestValues: providerResult?.requestValues || null,
  });

  for (const articleCandidate of providerResult.articles) {
    const evaluation = evaluateArticleAgainstStream(articleCandidate, executionContext.stream, {
      fetchWindow: executionContext.fetchWindow,
      fetchWindowPolicy,
    });

    if (evaluation.status === "SKIPPED") {
      summary.skipped_count += 1;
      continue;
    }

    const duplicateMatch = await findLatestDuplicateArticleMatch(db, articleCandidate, executionContext.stream);
    const duplicateClassification = classifyDuplicateCandidate(duplicateMatch, {
      duplicate_window_hours: executionContext.stream.duplicate_window_hours,
      now,
    });

    if (duplicateClassification === "blocked_duplicate") {
      summary.duplicate_count += 1;
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
        fetched_article_id_stream_id: {
          fetched_article_id: fetchedArticle.id,
          stream_id: executionContext.stream.id,
        },
      },
    });

    // Shared upstream fetches can legitimately fan the same article into many
    // streams, but a rerun must still stay idempotent for the same stream.
    if (existingArticleMatch) {
      summary.duplicate_count += 1;
      continue;
    }

    const post = await upsertCanonicalPost(
      db,
      {
        ...fetchedArticle,
        provider_key:
          articleCandidate.provider_key
          || providerResult?.provider_key
          || executionContext.stream.activeProvider?.provider_key
          || null,
      },
      executionContext.stream,
      evaluation.matchedCategoryIds,
      actor_id,
      {
        existingPostId:
          duplicateClassification === "repost_eligible_duplicate"
            ? duplicateMatch?.canonicalPost?.id || null
            : null,
      },
    );
    const articleMatch = await db.articleMatch.create({
      data: {
        canonical_post_id: post.id,
        destination_id: executionContext.stream.destination_id,
        duplicate_fingerprint:
          duplicateClassification === "repost_eligible_duplicate"
            ? articleCandidate.dedupe_fingerprint
            : null,
        duplicate_of_match_id:
          duplicateClassification === "repost_eligible_duplicate"
            ? duplicateMatch?.id || null
            : null,
        fetched_article_id: fetchedArticle.id,
        filter_reasons_json: evaluation.reasons,
        override_notes:
          duplicateClassification === "repost_eligible_duplicate"
            ? "Repost-eligible duplicate selected after unique candidates were exhausted."
            : null,
        queued_at: executionContext.stream.mode === "AUTO_PUBLISH" ? new Date() : null,
        status: evaluation.status,
        stream_id: executionContext.stream.id,
      },
    });

    const optimization = await refreshArticleMatchOptimization(articleMatch.id, {}, db);
    const shouldHoldForReview =
      executionContext.stream.mode === "REVIEW_REQUIRED"
      || ["BLOCK", "HOLD"].includes(optimization.policy.status);

    summary.publishable_count += 1;
    summary.optimized_count += 1;

    if (optimization.cacheHit) {
      summary.ai_cache_hit_count += 1;
    }

    if (shouldHoldForReview) {
      summary.held_count += 1;

      if (optimization.policy.status !== "PASS") {
        summary.blocked_count += 1;
      }

      continue;
    }

    summary.queued_count += 1;

    try {
      const publishAttempt = await queueArticleMatchForPublication(
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

      await executeQueuedPublishAttemptForFetchRun(db, publishAttempt, articleMatch, summary, {
        now,
      });
    } catch (error) {
      summary.failed_count += 1;
      await recordObservabilityEvent(
        {
          action: "PUBLISH_ATTEMPT_FAILED",
          entity_id: articleMatch.id,
          entity_type: "article_match",
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
      actor_id,
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
      fetchRun.stream_id,
      {
        actor_id: fetchRun.requested_by_id || null,
        existingFetchRun: fetchRun,
        now,
        trigger_type: fetchRun.trigger_type,
      },
    );
    executionGroup = planSharedFetchGroups([executionContext])[0];
    return await runWithFetchRunHeartbeat(db, [executionContext], async () => {
      const providerResult = await fetchProviderArticles({
        checkpoint: executionContext.checkpoint,
        fetchWindow: executionContext.fetchWindow,
        maxArticlesHint: getGroupMaxArticlesHint(executionGroup),
        now,
        provider_key: executionContext.stream.activeProvider.provider_key,
        stream: executionContext.stream,
      });

      return processFetchedArticlesForStream(
        db,
        executionContext,
        providerResult,
        {
          actor_id: fetchRun.requested_by_id || null,
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
          last_error_message: error instanceof Error ? error.message : `${error}`,
          finished_at: new Date(),
          heartbeat_at: null,
          last_error_at: new Date(),
          last_error_code: trimText(error?.status) || "fetch_run_failed",
          lease_expires_at: null,
          lease_owner: null,
          status: "FAILED",
        },
      });
    }

    return finalizeFailedFetchRun(
      db,
      executionContext,
      error,
      {
        actor_id: fetchRun.requested_by_id || null,
        executionGroup,
      },
    );
  }
}

/** Runs one publishing stream end to end, including fetch, filtering, dedupe, and publication. */
export async function runStreamFetch(
  stream_id,
  { actor_id = null, fetchWindow = null, now = new Date(), trigger_type = "manual", writeCheckpointOnSuccess = null } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const executionContext = await loadStreamExecutionContext(
    db,
    stream_id,
    {
      actor_id,
      now,
      requestedWindow: fetchWindow,
      trigger_type,
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
        provider_key: executionContext.stream.activeProvider.provider_key,
        stream: executionContext.stream,
      });

      return processFetchedArticlesForStream(
        db,
        executionContext,
        providerResult,
        {
          actor_id,
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
        actor_id,
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
 * @param {string|null} [options.actor_id] - Acting admin id.
 * @param {object|null} [options.fetchWindow] - Optional explicit bounded window.
 * @param {Date} [options.now] - Execution timestamp.
 * @param {string} [options.trigger_type] - Execution trigger label.
 * @param {boolean|null} [options.writeCheckpointOnSuccess] - Explicit checkpoint write override.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Batch execution summary with per-stream results.
 */
export async function runMultipleStreamFetches(
  streamIds,
  { actor_id = null, fetchWindow = null, now = new Date(), trigger_type = "manual", writeCheckpointOnSuccess = null } = {},
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

  for (const stream_id of requestedStreamIds) {
    streamExecutions.push(
      await loadStreamExecutionContext(
        db,
        stream_id,
        {
          actor_id,
          now,
          requestedWindow: fetchWindow,
          trigger_type,
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
          actor_id,
          entity_id: executionGroup.id,
          entity_type: "fetch_run_group",
          payload_json: serializeSharedFetchGroup(executionGroup),
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
          provider_key: executionGroup.provider_key,
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
                actor_id,
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
                actor_id,
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
            actor_id,
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
  if ((stream?.schedule_interval_minutes || 0) <= 0) {
    return false;
  }

  if (isStreamExecutionInProgress(stream)) {
    return false;
  }

  const next_run_at = getStreamNextScheduledRunAt(stream);

  if (next_run_at instanceof Date) {
    return next_run_at <= now;
  }

  return !(stream?.last_run_completed_at instanceof Date);
}

/** Executes all due scheduled stream runs and any pending scheduled publish attempts. */
export async function runScheduledStreams({ now = new Date() } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const recoveredFetchRuns = await reconcileStaleFetchRuns(db, { now });
  const recoveredPublishAttempts = await reconcileStalePublishAttempts(db, { now });
  const recoveredStreamExecutions = await recoverStrandedStreamExecutions(db, { now });
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
    orderBy: [{ completed_at: "desc" }, { created_at: "desc" }],
    where: {
      status: "FAILED",
    },
    })
    : [];
  const latestAttemptByMatch = new Map();

  for (const attempt of failedAttempts) {
    if (!latestAttemptByMatch.has(attempt.article_match_id)) {
      latestAttemptByMatch.set(attempt.article_match_id, attempt);
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
        lease_owner: claimedPublishAttempt.lease_owner,
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
    recoveredStreamExecutionCount: recoveredStreamExecutions.length,
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
    orderBy: [{ created_at: "desc" }],
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
        orderBy: [{ created_at: "desc" }],
      },
      translations: {
        include: {
          seoRecord: true,
        },
      },
    },
    orderBy: [{ published_at: "desc" }, { updated_at: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });

  return {
    pagination,
    posts,
  };
}
