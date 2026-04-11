/**
 * Feature services that assemble NewsPub public home, collection, story, and static page data.
 */

import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { Prisma } from "@prisma/client";
import {
  formatCountryFlagEmoji as formatCountryFlag,
  formatCountryFlagImageUrl,
  formatCountryLabel,
  normalizeCountryCode as normalizeCountry,
} from "@/lib/countries";
import { createImagePlaceholderDataUrl, getRenderableImageUrl } from "@/lib/media";
import { normalizeDisplayText } from "@/lib/normalization";
import { createPagination, pickTranslation, resolvePrismaClient } from "@/lib/news/shared";
import { isPrismaConnectionError } from "@/lib/prisma";
import { sanitizeExternalUrl, sanitizeMediaUrl } from "@/lib/security";
import { buildAbsoluteUrl } from "@/lib/seo";

import { publicHomeLatestIncrementCount, publicHomeLatestInitialCount } from "./constants";
import {
  buildPublicSearchQueryContext,
  normalizePublicSearchQuery,
  normalizePublicSearchRankingText,
} from "./search-utils";

/**
 * Public-site data mappers for locale-aware NewsPub story discovery pages.
 */
export const publicDataRevalidateSeconds = 300;
export const publicListingPageSize = 12;
const publicSearchRankingCandidateLimit = 240;
const publicSearchRankingCandidateFloor = 60;

async function withPublicSiteDatabaseFallback(load, fallback) {
  try {
    return await load();
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error;
    }

    return fallback(error);
  }
}

function createEmptyPagination(page) {
  return createPagination(0, normalizePage(page), publicListingPageSize);
}

function formatSlugLabel(slug) {
  return trimText(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

/** Serializes persisted dates so public page models stay JSON-friendly. */
function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

/** Trims optional string values pulled from the database or provider payloads. */
function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Normalizes page inputs so public pagination never requests impossible pages. */
function normalizePage(value) {
  const parsedValue = Number.parseInt(`${value || 1}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

/** Clamps free-text search queries to a safe length for provider-agnostic matching. */
function normalizeSearch(value) {
  return normalizePublicSearchQuery(value);
}

/** Maps category slugs to light-touch editorial emoji used in public navigation chips. */
function getCategoryLogoEmoji(category = {}) {
  const slug = trimText(category.slug).toLowerCase();
  const name = trimText(category.name).toLowerCase();
  const text = `${slug} ${name}`;

  if (!text) {
    return "📰";
  }

  if (/(sport|football|soccer|nba|tennis|cricket|fifa|olympic)/.test(text)) {
    return "🏅";
  }

  if (/(busines|market|econom|finance|stock|trade|money)/.test(text)) {
    return "💼";
  }

  if (/(tech|ai|software|digital|cyber|startup|science)/.test(text)) {
    return "💻";
  }

  if (/(politic|election|govern|policy|diplomac|parliament)/.test(text)) {
    return "🏛️";
  }

  if (/(health|medic|hospital|disease|wellness|fitness)/.test(text)) {
    return "🩺";
  }

  if (/(entertain|movie|music|celebr|culture|art|fashion)/.test(text)) {
    return "🎬";
  }

  if (/(travel|tour|world|region|global|international)/.test(text)) {
    return "🌍";
  }

  if (/(climate|weather|environment|energy|nature)/.test(text)) {
    return "🌿";
  }

  return "📰";
}

/**
 * Maps a stored media asset into a render-safe public image payload.
 *
 * @param {object|null} asset - Prisma-selected media asset.
 * @param {string} [fallbackAlt="Story image"] - Alt text fallback when the asset metadata is incomplete.
 * @returns {{alt: string, caption: string|null, height: number|null, url: string, width: number|null}|null} Public image payload or `null`.
 */
function mapImage(asset, fallbackAlt = "Story image") {
  if (!asset) {
    return null;
  }

  const alt = asset.alt || asset.caption || fallbackAlt;
  const url = getRenderableImageUrl(asset.publicUrl || asset.sourceUrl || "", {
    alt,
    caption: asset.caption || null,
    height: asset.height,
    sourceUrl: asset.sourceUrl || asset.publicUrl || "",
    width: asset.width,
  });

  return url
    ? {
        alt,
        caption: asset.caption || null,
        height: asset.height || null,
        url,
        width: asset.width || null,
      }
    : null;
}

const imageExtensions = new Set([".avif", ".gif", ".jpeg", ".jpg", ".png", ".svg", ".webp"]);
const videoExtensions = new Set([".m4v", ".mov", ".mp4", ".ogg", ".ogv", ".webm"]);

/** Extracts a normalized pathname so media-kind inference can inspect file extensions safely. */
function getUrlPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

/** Returns the trailing extension for a remote asset URL when one is available. */
function getUrlExtension(url) {
  const pathname = getUrlPathname(url);
  const lastDotIndex = pathname.lastIndexOf(".");

  return lastDotIndex >= 0 ? pathname.slice(lastDotIndex) : "";
}

/** Heuristic used to classify rich media blocks that arrive with loose provider metadata. */
function isVideoLikeValue(value) {
  return trimText(value).toLowerCase().includes("video");
}

/** Heuristic used to classify image-like provider payloads. */
function isImageLikeValue(value) {
  return trimText(value).toLowerCase().includes("image");
}

/** Converts public YouTube URLs into embeddable URLs while rejecting unsupported shapes. */
function resolveYouTubeEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    if (host === "youtu.be") {
      const videoId = parsedUrl.pathname.split("/").filter(Boolean)[0];

      return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
    }

    if (host === "youtube.com" || host === "m.youtube.com") {
      if (parsedUrl.pathname === "/watch") {
        const videoId = parsedUrl.searchParams.get("v");

        return videoId ? `https://www.youtube.com/embed/${videoId}` : null;
      }

      if (parsedUrl.pathname.startsWith("/embed/")) {
        return parsedUrl.toString();
      }

      const pathParts = parsedUrl.pathname.split("/").filter(Boolean);

      if ((pathParts[0] === "shorts" || pathParts[0] === "live") && pathParts[1]) {
        return `https://www.youtube.com/embed/${pathParts[1]}`;
      }
    }
  } catch {
    return null;
  }

  return null;
}

/** Converts public Vimeo URLs into embed URLs for the story media gallery. */
function resolveVimeoEmbedUrl(url) {
  try {
    const parsedUrl = new URL(url);
    const host = parsedUrl.hostname.toLowerCase().replace(/^www\./, "");

    if (host !== "vimeo.com" && host !== "player.vimeo.com") {
      return null;
    }

    if (host === "player.vimeo.com" && parsedUrl.pathname.startsWith("/video/")) {
      return parsedUrl.toString();
    }

    const videoId = parsedUrl.pathname.split("/").filter(Boolean).find((part) => /^\d+$/.test(part));

    return videoId ? `https://player.vimeo.com/video/${videoId}` : null;
  } catch {
    return null;
  }
}

/** Sanitizes third-party video URLs before they are rendered inside iframes. */
function resolveEmbeddableVideoUrl(url) {
  return sanitizeExternalUrl(resolveYouTubeEmbedUrl(url) || resolveVimeoEmbedUrl(url) || "");
}

/**
 * Infers the most appropriate media renderer from mixed provider metadata.
 *
 * @param {{kind?: string, mimeType?: string, type?: string, url?: string}} input - Candidate media metadata.
 * @returns {"embed"|"image"|"video"} Public media kind.
 */
function inferMediaKind({ kind, mimeType, type, url }) {
  const normalizedMimeType = trimText(mimeType).toLowerCase();

  if (isVideoLikeValue(kind) || isVideoLikeValue(type) || normalizedMimeType.startsWith("video/")) {
    return "video";
  }

  if (isImageLikeValue(kind) || isImageLikeValue(type) || normalizedMimeType.startsWith("image/")) {
    return "image";
  }

  const extension = getUrlExtension(url);

  if (videoExtensions.has(extension)) {
    return "video";
  }

  if (imageExtensions.has(extension)) {
    return "image";
  }

  if (resolveEmbeddableVideoUrl(url)) {
    return "embed";
  }

  return "image";
}

/**
 * Normalizes remote image URLs into the same payload shape as stored media assets.
 *
 * @param {string} url - Candidate source image URL.
 * @param {string} [fallbackAlt="Story image"] - Alt text fallback for the image.
 * @param {object} [metadata={}] - Supplemental metadata that can refine alt text and dimensions.
 * @returns {{alt: string, caption: string|null, height: number|null, url: string, width: number|null}|null} Public image payload or `null`.
 */
function mapRemoteImage(url, fallbackAlt = "Story image", metadata = {}) {
  const alt = metadata.alt || metadata.caption || fallbackAlt;
  const safeUrl = getRenderableImageUrl(url, {
    alt,
    caption: metadata.caption || null,
    height: metadata.height,
    sourceUrl: metadata.sourceUrl || url || "",
    width: metadata.width,
  });

  return safeUrl
    ? {
        alt,
        caption: metadata.caption || null,
        height: metadata.height || null,
        url: safeUrl,
        width: metadata.width || null,
      }
    : null;
}

/**
 * Creates a placeholder image when published story media is unavailable.
 *
 * @param {object} [options={}] - Placeholder configuration.
 * @returns {{alt: string, caption: null, height: number, kind: string, sourceUrl: string|null, url: string, width: number}} Placeholder image payload.
 */
function createFallbackPrimaryMedia({
  fallbackAlt = "Story image",
  sourceName = "",
  sourceUrl = "",
  summary = "",
} = {}) {
  const alt = trimText(fallbackAlt) || "Story image";

  return {
    alt,
    caption: null,
    height: 900,
    kind: "image",
    sourceUrl: trimText(sourceUrl) || null,
    url: createImagePlaceholderDataUrl({
      alt,
      caption: trimText(summary) || (trimText(sourceName) ? `Preview unavailable from ${sourceName}.` : ""),
      sourceUrl,
      width: 1600,
      height: 900,
    }),
    width: 1600,
  };
}

/**
 * Maps one stored or structured media item into a public gallery item.
 *
 * @param {object} rawItem - Structured content media object.
 * @param {string} [fallbackAlt="Story media"] - Alt text fallback.
 * @returns {object|null} Public gallery item or `null` when the source cannot be sanitized.
 */
function mapMediaItem(rawItem, fallbackAlt = "Story media") {
  const sourceUrl =
    rawItem?.url
    || rawItem?.src
    || rawItem?.sourceUrl
    || rawItem?.publicUrl
    || rawItem?.videoUrl
    || "";
  const mediaKind = inferMediaKind({
    kind: rawItem?.kind,
    mimeType: rawItem?.mimeType,
    type: rawItem?.type,
    url: sourceUrl,
  });

  if (mediaKind === "embed") {
    const embedUrl = resolveEmbeddableVideoUrl(sourceUrl);

    return embedUrl
      ? {
          alt: rawItem?.alt || rawItem?.title || fallbackAlt,
          caption: rawItem?.caption || rawItem?.description || null,
          embedUrl,
          kind: "embed",
          posterUrl: sanitizeMediaUrl(rawItem?.posterUrl || rawItem?.poster || rawItem?.thumbnailUrl || ""),
          sourceUrl: sanitizeExternalUrl(sourceUrl),
          title: rawItem?.title || null,
        }
      : null;
  }

  if (mediaKind === "video") {
    const safeUrl = sanitizeMediaUrl(sourceUrl);

    return safeUrl
      ? {
          alt: rawItem?.alt || rawItem?.title || fallbackAlt,
          caption: rawItem?.caption || rawItem?.description || null,
          kind: "video",
          mimeType: rawItem?.mimeType || null,
          posterUrl: sanitizeMediaUrl(rawItem?.posterUrl || rawItem?.poster || rawItem?.thumbnailUrl || ""),
          sourceUrl: safeUrl,
          title: rawItem?.title || null,
          url: safeUrl,
        }
      : null;
  }

  const image = mapRemoteImage(sourceUrl, fallbackAlt, rawItem);

  return image
    ? {
        ...image,
        kind: "image",
        sourceUrl: image.url,
      }
    : null;
}

/** Appends media only when the item has not already been included in the gallery. */
function appendUniqueMedia(items, media) {
  if (!media?.kind) {
    return items;
  }

  const mediaKey = `${media.kind}:${media.embedUrl || media.url || media.sourceUrl || ""}`;

  if (!mediaKey || items.some((item) => `${item.kind}:${item.embedUrl || item.url || item.sourceUrl || ""}` === mediaKey)) {
    return items;
  }

  items.push(media);

  return items;
}

/**
 * Extracts gallery-ready media from stored structured content.
 *
 * @param {object|null} structuredContentJson - Stored structured content JSON.
 * @param {string} [fallbackAlt="Story media"] - Alt text fallback for extracted media.
 * @returns {Array<object>} Ordered media gallery items.
 */
function extractStructuredMedia(structuredContentJson, fallbackAlt = "Story media") {
  if (!structuredContentJson || typeof structuredContentJson !== "object") {
    return [];
  }

  const media = [];

  for (const section of Array.isArray(structuredContentJson.sections) ? structuredContentJson.sections : []) {
    const sectionAlt = trimText(section?.title) || fallbackAlt;
    const imageCandidates = Array.isArray(section?.images) ? section.images : [];
    const videoCandidates = [
      ...(Array.isArray(section?.videos) ? section.videos : []),
      ...(section?.video ? [section.video] : []),
    ];
    const mixedCandidates = Array.isArray(section?.media)
      ? section.media
      : section?.media && typeof section.media === "object"
        ? [section.media]
        : [];

    if (section?.kind === "image" || section?.kind === "video") {
      appendUniqueMedia(media, mapMediaItem(section, sectionAlt));
    }

    for (const candidate of [...imageCandidates, ...videoCandidates, ...mixedCandidates]) {
      appendUniqueMedia(media, mapMediaItem(candidate, sectionAlt));
    }
  }

  return media;
}

/** Maps a category record into the locale-aware public navigation shape. */
function mapCategory(category, locale) {
  return {
    description: category.description || null,
    id: category.id,
    logoEmoji: getCategoryLogoEmoji(category),
    name: category.name,
    path: buildLocalizedPath(locale, publicRouteSegments.category(category.slug)),
    slug: category.slug,
  };
}

/**
 * Normalizes JSON-backed SEO arrays into unique, trimmed string values.
 *
 * @param {unknown} values - Raw JSON array from the SEO record.
 * @returns {string[]} Stable string list safe for metadata and JSON-LD output.
 */
function normalizeSeoStringList(values) {
  if (!Array.isArray(values)) {
    return [];
  }

  return [...new Set(
    values
      .map((value) => {
        if (typeof value === "string") {
          return trimText(value);
        }

        if (value && typeof value === "object") {
          return trimText(value.name || value.label || value.value);
        }

        return "";
      })
      .filter(Boolean),
  )];
}

/**
 * Prefers explicit SEO authors while falling back to the source article author when needed.
 *
 * @param {object|null} seoRecord - Translation SEO record.
 * @param {string} sourceAuthor - Source article author fallback.
 * @returns {string[]} Author names suitable for metadata and structured-data output.
 */
function resolveStoryAuthors(seoRecord, sourceAuthor) {
  const seoAuthors = normalizeSeoStringList(seoRecord?.authorsJson);

  return seoAuthors.length ? seoAuthors : normalizeSeoStringList([sourceAuthor]);
}

function createSummaryFallback(value, maxLength = 180) {
  const collapsed = normalizeDisplayText(
    `${value || ""}`
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
      .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
      .replace(/[`#>*_~-]+/g, " "),
  );

  if (!collapsed) {
    return "";
  }

  if (collapsed.length <= maxLength) {
    return collapsed;
  }

  const preview = collapsed.slice(0, maxLength).trim();
  const safePreview = preview.includes(" ")
    ? preview.slice(0, preview.lastIndexOf(" "))
    : preview;

  return `${safePreview || preview}...`;
}

function buildPostCardSummary(post, translation) {
  return (
    trimText(translation?.summary)
    || trimText(post.excerpt)
    || createSummaryFallback(translation?.contentMd)
  );
}

/**
 * Maps a published post into the compact card model reused across public listings and related-story modules.
 *
 * @param {object} post - Prisma-selected published post.
 * @param {string} [locale=defaultLocale] - Requested locale.
 * @returns {object} Locale-aware story card.
 */
function mapPostCard(post, locale = defaultLocale) {
  const translation = pickTranslation(post.translations || [], locale);
  const fallbackAlt = translation?.title || post.slug;
  const summary = buildPostCardSummary(post, translation);
  const image = mapImage(post.featuredImage, fallbackAlt)
    || mapRemoteImage(post.sourceArticle?.imageUrl, fallbackAlt);
  const media = extractStructuredMedia(translation?.structuredContentJson, fallbackAlt);
  const primaryMedia = media[0]
    || (image
      ? { ...image, kind: "image", sourceUrl: image.url }
      : createFallbackPrimaryMedia({
          fallbackAlt,
          sourceName: post.sourceName,
          sourceUrl: post.sourceUrl,
          summary,
        }));

  return {
    categories: (post.categories || []).map(({ category }) => mapCategory(category, translation?.locale || locale)),
    id: post.id,
    image,
    locale: translation?.locale || locale,
    path: buildLocalizedPath(translation?.locale || locale, publicRouteSegments.newsPost(post.slug)),
    primaryMedia,
    providerKey: post.providerKey,
    publishedAt: serializeDate(post.publishedAt),
    slug: post.slug,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    summary,
    title: translation?.title || post.slug,
    updatedAt: serializeDate(post.updatedAt),
  };
}

/** Builds the shared public-story filter for website-published posts. */
function buildPublishedWebsiteWhere(extraWhere = {}) {
  return {
    publishAttempts: {
      some: {
        platform: "WEBSITE",
        status: "SUCCEEDED",
      },
    },
    status: "PUBLISHED",
    ...extraWhere,
  };
}

/** Narrows the published-story filter to one locale without changing publication rules. */
function buildPublishedLocaleWhere(locale, extraWhere = {}) {
  return buildPublishedWebsiteWhere({
    translations: {
      some: {
        locale,
      },
    },
    ...extraWhere,
  });
}

/** Shared media selection used by story cards, story detail pages, and SEO images. */
const mediaAssetSelect = Object.freeze({
  alt: true,
  caption: true,
  height: true,
  publicUrl: true,
  sourceUrl: true,
  width: true,
});

/**
 * Shared published-post selection for public pages.
 *
 * The selection intentionally includes richer SEO fields than most listing pages need so the story-detail route can
 * build metadata, structured data, and on-page fallbacks from one consistent record shape.
 */
const publicPostSelect = Object.freeze({
  categories: {
    select: {
      category: {
        select: {
          description: true,
          id: true,
          name: true,
          slug: true,
        },
      },
      categoryId: true,
    },
  },
  excerpt: true,
  featuredImage: {
    select: mediaAssetSelect,
  },
  id: true,
  providerKey: true,
  publishAttempts: {
    select: {
      id: true,
      platform: true,
      status: true,
    },
    where: {
      platform: "WEBSITE",
      status: "SUCCEEDED",
    },
  },
  publishedAt: true,
  slug: true,
  sourceArticle: {
    select: {
      author: true,
      imageUrl: true,
    },
  },
  sourceName: true,
  sourceUrl: true,
  translations: {
    orderBy: {
      locale: "asc",
    },
    select: {
      contentHtml: true,
      contentMd: true,
      locale: true,
      seoRecord: {
        select: {
          authorsJson: true,
          canonicalUrl: true,
          keywordsJson: true,
          metaDescription: true,
          metaTitle: true,
          noindex: true,
          ogDescription: true,
          ogImage: {
            select: mediaAssetSelect,
          },
          ogTitle: true,
          twitterDescription: true,
          twitterTitle: true,
        },
      },
      sourceAttribution: true,
      structuredContentJson: true,
      summary: true,
      title: true,
    },
  },
  updatedAt: true,
});

function buildPublicSearchSelect(locale) {
  return {
    categories: publicPostSelect.categories,
    excerpt: true,
    featuredImage: {
      select: mediaAssetSelect,
    },
    id: true,
    providerKey: true,
    publishedAt: true,
    slug: true,
    sourceArticle: {
      select: {
        imageUrl: true,
      },
    },
    sourceName: true,
    sourceUrl: true,
    translations: {
      orderBy: {
        locale: "asc",
      },
      select: {
        contentMd: true,
        locale: true,
        structuredContentJson: true,
        summary: true,
        title: true,
      },
      where: {
        locale: {
          in: [...new Set([locale, defaultLocale].filter(Boolean))],
        },
      },
    },
    updatedAt: true,
  };
}

const searchFieldWeights = Object.freeze({
  body: Object.freeze({ allTermsBonus: 24, exact: 32, max: 124, phrase: 18, prefix: 10, term: 24 }),
  category: Object.freeze({ allTermsBonus: 110, exact: 220, phrase: 90, prefix: 95, term: 115 }),
  slug: Object.freeze({ allTermsBonus: 125, exact: 260, phrase: 105, prefix: 145, term: 125 }),
  source: Object.freeze({ allTermsBonus: 90, exact: 185, phrase: 82, prefix: 90, term: 105 }),
  summary: Object.freeze({ allTermsBonus: 95, exact: 190, phrase: 88, prefix: 110, term: 108 }),
  title: Object.freeze({ allTermsBonus: 165, exact: 340, phrase: 126, prefix: 176, term: 156 }),
});

const searchFieldPriority = Object.freeze({
  body: 1,
  category: 4,
  slug: 5,
  source: 3,
  summary: 6,
  title: 7,
});

function buildSearchFieldFilters(locale, value, { includeBody = true } = {}) {
  const normalizedValue = normalizeSearch(value);
  const { slugText } = buildPublicSearchQueryContext(value);
  const slugNeedle = slugText ? slugText.replace(/\s+/g, "-") : "";

  if (!normalizedValue) {
    return [];
  }

  return [
    {
      slug: {
        contains: slugNeedle || normalizedValue,
      },
    },
    {
      sourceName: {
        contains: normalizedValue,
      },
    },
    {
      excerpt: {
        contains: normalizedValue,
      },
    },
    {
      translations: {
        some: {
          locale,
          OR: [
            {
              title: {
                contains: normalizedValue,
              },
            },
            {
              summary: {
                contains: normalizedValue,
              },
            },
            ...(includeBody
              ? [
                  {
                    contentMd: {
                      contains: normalizedValue,
                    },
                  },
                ]
              : []),
          ],
        },
      },
    },
    {
      categories: {
        some: {
          category: {
            OR: [
              {
                name: {
                  contains: normalizedValue,
                },
              },
              {
                slug: {
                  contains: slugNeedle || normalizedValue,
                },
              },
            ],
          },
        },
      },
    },
  ];
}

function resolveSearchFieldScore(value, queryContext, weights) {
  const text = normalizePublicSearchRankingText(value, {
    maxLength: weights === searchFieldWeights.body ? 7000 : 1800,
  });

  if (!text || !queryContext.terms.length) {
    return {
      matchedTerms: 0,
      score: 0,
    };
  }

  const matchedTerms = queryContext.terms.reduce(
    (count, term) => count + (text.includes(term) ? 1 : 0),
    0,
  );
  const hasPhrase = queryContext.searchText ? text.includes(queryContext.searchText) : false;
  const isExact = queryContext.searchText ? text === queryContext.searchText : false;
  const isPrefix = queryContext.searchText ? text.startsWith(queryContext.searchText) : false;

  if (!matchedTerms && !hasPhrase) {
    return {
      matchedTerms: 0,
      score: 0,
    };
  }

  let score = matchedTerms * weights.term;

  if (isExact) {
    score += weights.exact;
  } else if (isPrefix) {
    score += weights.prefix;
  } else if (hasPhrase) {
    score += weights.phrase;
  }

  if (matchedTerms === queryContext.terms.length && queryContext.terms.length > 1) {
    score += weights.allTermsBonus;
  }

  return {
    matchedTerms,
    score: weights.max ? Math.min(score, weights.max) : score,
  };
}

function rankPublishedSearchPost(post, locale, queryContext) {
  const translation = pickTranslation(post.translations || [], locale);
  const summary = buildPostCardSummary(post, translation);
  const combinedStrongText = normalizePublicSearchRankingText([
    translation?.title,
    summary,
    post.slug ? post.slug.replace(/-/g, " ") : "",
    post.sourceName,
    ...(post.categories || []).flatMap(({ category }) => [category?.name, category?.slug]),
  ].join(" "));
  const combinedText = normalizePublicSearchRankingText([
    combinedStrongText,
    translation?.contentMd,
  ].join(" "), {
    maxLength: 9000,
  });
  const fieldScores = [
    {
      key: "title",
      ...resolveSearchFieldScore(translation?.title, queryContext, searchFieldWeights.title),
    },
    {
      key: "summary",
      ...resolveSearchFieldScore(summary, queryContext, searchFieldWeights.summary),
    },
    {
      key: "slug",
      ...resolveSearchFieldScore(post.slug ? post.slug.replace(/-/g, " ") : "", queryContext, searchFieldWeights.slug),
    },
    {
      key: "category",
      ...resolveSearchFieldScore(
        (post.categories || [])
          .flatMap(({ category }) => [category?.name, category?.slug])
          .join(" "),
        queryContext,
        searchFieldWeights.category,
      ),
    },
    {
      key: "source",
      ...resolveSearchFieldScore(post.sourceName, queryContext, searchFieldWeights.source),
    },
    {
      key: "body",
      ...resolveSearchFieldScore(translation?.contentMd, queryContext, searchFieldWeights.body),
    },
  ]
    .filter((entry) => entry.score > 0)
    .sort(
      (left, right) =>
        right.score - left.score
        || right.matchedTerms - left.matchedTerms
        || searchFieldPriority[right.key] - searchFieldPriority[left.key],
    );
  const matchedTerms = queryContext.terms.reduce(
    (count, term) => count + (combinedText.includes(term) ? 1 : 0),
    0,
  );
  const primaryMatch = fieldScores[0] || {
    key: "body",
    matchedTerms: 0,
    score: 0,
  };
  const secondaryScore = fieldScores.slice(1).reduce(
    (sum, entry) => sum + Math.min(entry.key === "body" ? 12 : 34, Math.round(entry.score * 0.18)),
    0,
  );
  let score = primaryMatch.score + secondaryScore + matchedTerms * 28;

  if (matchedTerms === queryContext.terms.length && queryContext.terms.length > 1) {
    score += 78;
  }

  if (queryContext.searchText && combinedStrongText.includes(queryContext.searchText)) {
    score += 38;
  }

  return {
    matchedTerms,
    primaryReason: primaryMatch.key,
    score,
  };
}

function resolveSortableDateValue(value) {
  if (value instanceof Date) {
    return value.getTime();
  }

  if (typeof value === "string" && value) {
    const parsedValue = Date.parse(value);

    return Number.isFinite(parsedValue) ? parsedValue : 0;
  }

  return 0;
}

function compareRankedSearchPosts(left, right) {
  return (
    right.ranking.score - left.ranking.score
    || right.ranking.matchedTerms - left.ranking.matchedTerms
    || resolveSortableDateValue(right.post.publishedAt) - resolveSortableDateValue(left.post.publishedAt)
    || resolveSortableDateValue(right.post.updatedAt) - resolveSortableDateValue(left.post.updatedAt)
    || `${left.post.slug || ""}`.localeCompare(`${right.post.slug || ""}`)
  );
}

function dedupeSearchCandidates(posts = []) {
  const seenPostIds = new Set();
  const candidates = [];

  for (const post of posts) {
    const key = post?.id || post?.slug;

    if (!key || seenPostIds.has(key)) {
      continue;
    }

    seenPostIds.add(key);
    candidates.push(post);
  }

  return candidates;
}

function rankSearchCandidates(posts, locale, queryContext) {
  return posts
    .map((post) => ({
      post,
      ranking: rankPublishedSearchPost(post, locale, queryContext),
    }))
    .sort(compareRankedSearchPosts);
}

function mapRankedSearchResult({ post, ranking }, locale) {
  return {
    ...mapPostCard(post, locale),
    searchMeta: {
      matchedTerms: ranking.matchedTerms,
      primaryReason: ranking.primaryReason,
    },
  };
}

function getSearchCandidateLimit(pagination) {
  const endIndex = ((pagination.currentPage - 1) * pagination.pageSize) + pagination.pageSize;
  const requestedWindow = Math.max(endIndex * 2, publicSearchRankingCandidateFloor);

  return Math.min(requestedWindow, publicSearchRankingCandidateLimit);
}

async function getPublishedCategoryCounts(db) {
  const [categories, categoryPostCounts] = await Promise.all([
    db.category.findMany({
      orderBy: {
        name: "asc",
      },
      select: {
        description: true,
        id: true,
        name: true,
        slug: true,
      },
    }),
    db.postCategory.groupBy({
      by: ["categoryId"],
      _count: {
        _all: true,
      },
      where: {
        post: buildPublishedWebsiteWhere(),
      },
    }),
  ]);
  const countByCategoryId = new Map(
    categoryPostCounts.map((entry) => [entry.categoryId, entry._count?._all || 0]),
  );

  return categories
    .map((category) => ({
      count: countByCategoryId.get(category.id) || 0,
      ...category,
    }))
    .filter((category) => category.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

async function getPublishedCountryCounts(db, locale) {
  if (typeof db.$queryRaw === "function") {
    try {
      const countryRows = await db.$queryRaw(Prisma.sql`
        SELECT LOWER(country_codes.country_code) AS value, COUNT(*) AS count
        FROM \`FetchedArticle\` AS article
        INNER JOIN \`Post\` AS post ON post.\`sourceArticleId\` = article.\`id\`
        INNER JOIN \`PostTranslation\` AS translation
          ON translation.\`postId\` = post.\`id\`
          AND translation.\`locale\` = ${locale}
        INNER JOIN JSON_TABLE(
          article.\`providerCountriesJson\`,
          '$[*]' COLUMNS (country_code VARCHAR(8) PATH '$')
        ) AS country_codes
        WHERE post.\`status\` = 'PUBLISHED'
          AND EXISTS (
            SELECT 1
            FROM \`PublishAttempt\` AS publish_attempt
            WHERE publish_attempt.\`postId\` = post.\`id\`
              AND publish_attempt.\`platform\` = 'WEBSITE'
              AND publish_attempt.\`status\` = 'SUCCEEDED'
          )
        GROUP BY LOWER(country_codes.country_code)
        ORDER BY count DESC
      `);

      return countryRows
        .map((row) => {
          const value = normalizeCountry(row.value);

          return {
            count: Number(row.count || 0),
            flagEmoji: formatCountryFlag(value),
            flagImageUrl: formatCountryFlagImageUrl(value),
            label: formatCountryLabel(value, locale),
            value,
          };
        })
        .filter((country) => country.value && country.count > 0)
        .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
    } catch (error) {
      if (isPrismaConnectionError(error)) {
        throw error;
      }
    }
  }

  const publishedArticles = await db.fetchedArticle.findMany({
    select: {
      providerCountriesJson: true,
    },
    where: {
      posts: {
        some: buildPublishedLocaleWhere(locale),
      },
    },
  });
  const counts = new Map();

  for (const article of publishedArticles) {
    const countryCodes = Array.isArray(article.providerCountriesJson) ? article.providerCountriesJson : [];

    for (const countryCode of countryCodes) {
      const normalizedCountry = normalizeCountry(countryCode);

      if (!normalizedCountry) {
        continue;
      }

      counts.set(normalizedCountry, (counts.get(normalizedCountry) || 0) + 1);
    }
  }

  return [...counts.entries()]
    .map(([value, count]) => ({
      count,
      flagEmoji: formatCountryFlag(value),
      flagImageUrl: formatCountryFlagImageUrl(value),
      label: formatCountryLabel(value, locale),
      value,
    }))
    .sort((left, right) => right.count - left.count || left.label.localeCompare(right.label));
}

async function getLatestPublishedPosts(
  db,
  locale,
  { skip = 0, take = publicHomeLatestInitialCount + 1 } = {},
) {
  return db.post.findMany({
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    select: publicPostSelect,
    skip,
    take,
    where: buildPublishedLocaleWhere(locale),
  });
}

/**
 * Builds the localized home-page payload with a featured story, latest-story list, and ranked category summary.
 *
 * @param {{locale?: string}} [options={}] - Home-page query options.
 * @param {object} prisma - Optional Prisma client override used by tests and server routes.
 * @returns {Promise<object>} Public home-page view model.
 */
export async function getPublishedHomePageData({ locale = defaultLocale } = {}, prisma) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const [latestPosts, localizedPublishedStoryCount, topCategories, publishedStoryCount] = await Promise.all([
        getLatestPublishedPosts(db, locale, {
          take: publicHomeLatestInitialCount + 1,
        }),
        db.post.count({
          where: buildPublishedLocaleWhere(locale),
        }),
        getPublishedCategoryCounts(db),
        db.post.count({
          where: buildPublishedWebsiteWhere(),
        }),
      ]);
      const cards = latestPosts.map((post) => mapPostCard(post, locale));
      const featuredStory = cards[0] || null;
      const latestStories = cards.slice(1, publicHomeLatestInitialCount + 1);
      const latestStoryCount = Math.max(localizedPublishedStoryCount - (featuredStory ? 1 : 0), 0);

      return {
        featuredStory,
        hasMoreLatestStories: latestStoryCount > latestStories.length,
        latestStories,
        summary: {
          categoryCount: topCategories.length,
          latestStoryCount,
          publishedStoryCount,
        },
        topCategories: topCategories.slice(0, 6).map((category) => ({
          count: category.count,
          ...mapCategory(category, locale),
        })),
      };
    },
    () => ({
      featuredStory: null,
      hasMoreLatestStories: false,
      latestStories: [],
      summary: {
        categoryCount: 0,
        latestStoryCount: 0,
        publishedStoryCount: 0,
      },
      topCategories: [],
    }),
  );
}

/**
 * Returns a compact category navigation set for public headers and landing-page sidebars.
 *
 * @param {{locale?: string, limit?: number}} [options={}] - Navigation query options.
 * @param {object} prisma - Optional Prisma client override used by tests and server routes.
 * @returns {Promise<Array<object>>} Locale-aware category navigation items.
 */
export async function getPublishedCategoryNavigationData(
  { locale = defaultLocale, limit = 8 } = {},
  prisma,
) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const categories = await getPublishedCategoryCounts(db);
      const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.trunc(limit)) : 8;

      return categories.slice(0, safeLimit).map((category) => ({
        count: category.count,
        ...mapCategory(category, locale),
      }));
    },
    () => [],
  );
}

/**
 * Builds the public search-filter payload backed by published-story coverage.
 *
 * @param {{locale?: string}} [options={}] - Search-filter query options.
 * @param {object} prisma - Optional Prisma client override used by tests and server routes.
 * @returns {Promise<{countries: Array<object>}>} Search-filter data.
 */
export async function getPublishedSearchFilterData({ locale = defaultLocale } = {}, prisma) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);

      return {
        countries: await getPublishedCountryCounts(db, locale),
      };
    },
    () => ({
      countries: [],
    }),
  );
}

/**
 * Loads one incremental batch of latest stories for the public home page.
 *
 * @param {{locale?: string, skip?: number, take?: number}} [options={}] - Batch query options.
 * @param {object} prisma - Optional Prisma client override used by tests and server routes.
 * @returns {Promise<{hasMore: boolean, items: Array<object>}>} Paginated latest-story batch.
 */
export async function getPublishedHomeLatestStoriesData(
  { locale = defaultLocale, skip = 1, take = publicHomeLatestIncrementCount } = {},
  prisma,
) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const safeSkip = Number.isFinite(skip) ? Math.max(0, Math.trunc(skip)) : 1;
      const safeTake = Number.isFinite(take) ? Math.max(1, Math.trunc(take)) : publicHomeLatestIncrementCount;
      const posts = await getLatestPublishedPosts(db, locale, {
        skip: safeSkip,
        take: safeTake + 1,
      });
      const cards = posts.map((post) => mapPostCard(post, locale));

      return {
        hasMore: cards.length > safeTake,
        items: cards.slice(0, safeTake),
      };
    },
    () => ({
      hasMore: false,
      items: [],
    }),
  );
}

/** Returns the paginated published-story index for a locale. */
export async function getPublishedNewsIndexData({ locale = defaultLocale, page = 1 } = {}, prisma) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const requestedPage = normalizePage(page);
      const totalItems = await db.post.count({
        where: buildPublishedWebsiteWhere({
          translations: {
            some: {
              locale,
            },
          },
        }),
      });
      const pagination = createPagination(totalItems, requestedPage, publicListingPageSize);
      const posts = await db.post.findMany({
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        select: publicPostSelect,
        skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
        take: pagination.pageSize,
        where: buildPublishedWebsiteWhere({
          translations: {
            some: {
              locale,
            },
          },
        }),
      });

      return {
        items: posts.map((post) => mapPostCard(post, locale)),
        pagination,
      };
    },
    () => ({
      items: [],
      pagination: createEmptyPagination(page),
    }),
  );
}

/** Returns a category landing page backed by published website stories. */
export async function getPublishedCategoryPageData({ locale = defaultLocale, page = 1, slug } = {}, prisma) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const category = await db.category.findUnique({
        where: {
          slug,
        },
      });

      if (!category) {
        return null;
      }

      const requestedPage = normalizePage(page);
      const where = buildPublishedWebsiteWhere({
        categories: {
          some: {
            category: {
              slug,
            },
          },
        },
        translations: {
          some: {
            locale,
          },
        },
      });
      const totalItems = await db.post.count({ where });
      const pagination = createPagination(totalItems, requestedPage, publicListingPageSize);
      const posts = await db.post.findMany({
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        select: publicPostSelect,
        skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
        take: pagination.pageSize,
        where,
      });

      return {
        entity: mapCategory(category, locale),
        items: posts.map((post) => mapPostCard(post, locale)),
        pagination,
      };
    },
    () => {
      const categoryName = formatSlugLabel(slug) || "Category";

      return {
        databaseUnavailable: true,
        entity: {
          description: "Published stories for this category are temporarily unavailable.",
          id: null,
          logoEmoji: "ðŸ“°",
          name: categoryName,
          path: buildLocalizedPath(locale, publicRouteSegments.category(slug || "")),
          slug: slug || "",
        },
        items: [],
        pagination: createEmptyPagination(page),
      };
    },
  );
}

function buildSearchWhere(locale, search, country, { includeBody = true } = {}) {
  const queryContext = buildPublicSearchQueryContext(search);
  const normalizedCountry = normalizeCountry(country);
  const filters = [
    {
      translations: {
        some: {
          locale,
        },
      },
    },
  ];

  if (normalizedCountry) {
    filters.push({
      sourceArticle: {
        is: {
          providerCountriesJson: {
            array_contains: normalizedCountry,
          },
        },
      },
    });
  }

  if (!queryContext.query) {
    return buildPublishedWebsiteWhere(filters.length === 1 ? filters[0] : { AND: filters });
  }

  filters.push({
    OR: [
      ...buildSearchFieldFilters(locale, queryContext.query, { includeBody }),
      ...queryContext.terms.flatMap((term) => buildSearchFieldFilters(locale, term, { includeBody })),
    ],
  });

  return buildPublishedWebsiteWhere({
    AND: filters,
  });
}

/**
 * Searches published public stories by locale, free-text query, and optional country coverage.
 *
 * @param {{locale?: string, page?: number|string, search?: string, country?: string}} [options={}] - Search options.
 * @param {object} prisma - Optional Prisma client override used by tests and server routes.
 * @returns {Promise<object>} Paginated search result model.
 */
export async function searchPublishedStories(
  { locale = defaultLocale, page = 1, search = "", country = "" } = {},
  prisma,
) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const requestedPage = normalizePage(page);
      const normalizedCountry = normalizeCountry(country);
      const queryContext = buildPublicSearchQueryContext(search);
      const where = buildSearchWhere(locale, search, normalizedCountry);
      const totalItems = await db.post.count({ where });
      const pagination = createPagination(totalItems, requestedPage, publicListingPageSize);
      let items = [];

      if (queryContext.query) {
        const startIndex = totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0;
        const endIndex = startIndex + pagination.pageSize;
        const candidateLimit = getSearchCandidateLimit(pagination);
        const strongWhere = buildSearchWhere(locale, search, normalizedCountry, {
          includeBody: false,
        });
        const strongCandidatePosts = await db.post.findMany({
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          select: buildPublicSearchSelect(locale),
          take: candidateLimit,
          where: strongWhere,
        });
        let candidatePosts = strongCandidatePosts;

        if (strongCandidatePosts.length < Math.min(totalItems, endIndex, candidateLimit)) {
          const fallbackCandidatePosts = await db.post.findMany({
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            select: buildPublicSearchSelect(locale),
            take: candidateLimit,
            where,
          });

          candidatePosts = dedupeSearchCandidates([...strongCandidatePosts, ...fallbackCandidatePosts]);
        }

        const rankedPosts = rankSearchCandidates(candidatePosts, locale, queryContext);

        if (rankedPosts.length >= endIndex || rankedPosts.length >= totalItems || candidateLimit >= totalItems) {
          items = rankedPosts.slice(startIndex, endIndex).map((rankedPost) =>
            mapRankedSearchResult(rankedPost, locale),
          );
        } else {
          const pagePosts = await db.post.findMany({
            orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
            select: buildPublicSearchSelect(locale),
            skip: startIndex,
            take: pagination.pageSize,
            where,
          });

          items = rankSearchCandidates(pagePosts, locale, queryContext).map((rankedPost) =>
            mapRankedSearchResult(rankedPost, locale),
          );
        }
      } else {
        const posts = await db.post.findMany({
          orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
          select: publicPostSelect,
          skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
          take: pagination.pageSize,
          where,
        });

        items = posts.map((post) => mapPostCard(post, locale));
      }

      return {
        country: normalizedCountry,
        countryLabel: normalizedCountry ? formatCountryLabel(normalizedCountry, locale) : "",
        items,
        pagination,
        query: queryContext.query,
      };
    },
    () => {
      const normalizedCountry = normalizeCountry(country);
      const queryContext = buildPublicSearchQueryContext(search);

      return {
        country: normalizedCountry,
        countryLabel: normalizedCountry ? formatCountryLabel(normalizedCountry, locale) : "",
        items: [],
        pagination: createEmptyPagination(page),
        query: queryContext.query,
      };
    },
  );
}

/** Returns the published story page model plus lightweight related-story cards. */
export async function getPublishedStoryPageData({ locale = defaultLocale, slug } = {}, prisma) {
  return withPublicSiteDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const post = await db.post.findFirst({
        select: publicPostSelect,
        where: buildPublishedWebsiteWhere({
          slug,
        }),
      });

      if (!post) {
        return null;
      }

      const translation = pickTranslation(post.translations || [], locale);

      if (!translation) {
        return null;
      }

      const relatedPosts = await db.post.findMany({
        orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
        select: publicPostSelect,
        take: 4,
        where: buildPublishedWebsiteWhere({
          id: {
            not: post.id,
          },
          OR: [
            {
              categories: {
                some: {
                  categoryId: {
                    in: post.categories.map(({ categoryId }) => categoryId),
                  },
                },
              },
            },
            {
              sourceName: post.sourceName,
            },
          ],
        }),
      });
      const seoKeywords = normalizeSeoStringList(translation.seoRecord?.keywordsJson);
      const storyAuthors = resolveStoryAuthors(translation.seoRecord, post.sourceArticle?.author);
      const image = mapImage(post.featuredImage, translation.title)
        || mapRemoteImage(post.sourceArticle?.imageUrl, translation.title);
      const seoImage = mapImage(translation.seoRecord?.ogImage, translation.title)
        || image;
      const media = extractStructuredMedia(translation.structuredContentJson, translation.title);
      const primaryMedia = media[0]
        || (image
          ? { ...image, kind: "image", sourceUrl: image.url }
          : createFallbackPrimaryMedia({
              fallbackAlt: translation.title,
              sourceName: post.sourceName,
              sourceUrl: post.sourceUrl,
              summary: translation.summary,
            }));
      const article = {
        canonicalUrl:
          translation.seoRecord?.canonicalUrl ||
          buildAbsoluteUrl(buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug))),
        categories: (post.categories || []).map(({ category }) => mapCategory(category, translation.locale)),
        contentHtml: translation.contentHtml,
        contentMd: translation.contentMd,
        id: post.id,
        image,
        media,
        authors: storyAuthors,
        keywords: seoKeywords,
        locale: translation.locale,
        metaDescription: translation.seoRecord?.metaDescription || translation.summary,
        metaTitle: translation.seoRecord?.metaTitle || translation.title,
        noindex: Boolean(translation.seoRecord?.noindex),
        openGraphDescription:
          translation.seoRecord?.ogDescription ||
          translation.seoRecord?.metaDescription ||
          translation.summary,
        openGraphTitle:
          translation.seoRecord?.ogTitle ||
          translation.seoRecord?.metaTitle ||
          translation.title,
        path: buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug)),
        primaryMedia,
        providerKey: post.providerKey,
        publishedAt: serializeDate(post.publishedAt),
        seoImage,
        slug: post.slug,
        sourceAttribution: translation.sourceAttribution,
        sourceName: post.sourceName,
        sourceUrl: post.sourceUrl,
        structuredContentJson: translation.structuredContentJson,
        summary: translation.summary,
        title: translation.title,
        twitterDescription:
          translation.seoRecord?.twitterDescription ||
          translation.seoRecord?.metaDescription ||
          translation.summary,
        twitterTitle:
          translation.seoRecord?.twitterTitle ||
          translation.seoRecord?.metaTitle ||
          translation.title,
        updatedAt: serializeDate(post.updatedAt),
      };

      return {
        article,
        relatedStories: relatedPosts.map((relatedPost) => mapPostCard(relatedPost, translation.locale)),
      };
    },
    () => {
      const title = formatSlugLabel(slug) || "Story";
      const path = buildLocalizedPath(locale, publicRouteSegments.newsPost(slug || ""));

      return {
        databaseUnavailable: true,
        article: {
          authors: [],
          canonicalUrl: buildAbsoluteUrl(path),
          categories: [],
          contentHtml: "",
          contentMd: "",
          id: null,
          image: null,
          keywords: [],
          locale,
          media: [],
          metaDescription: "This story is temporarily unavailable because NewsPub could not reach the database.",
          metaTitle: `${title} temporarily unavailable`,
          noindex: true,
          openGraphDescription: "This story is temporarily unavailable because NewsPub could not reach the database.",
          openGraphTitle: `${title} temporarily unavailable`,
          path,
          primaryMedia: null,
          providerKey: null,
          publishedAt: null,
          seoImage: null,
          slug: slug || "",
          sourceAttribution: "",
          sourceName: "",
          sourceUrl: "",
          structuredContentJson: null,
          summary: "This story is temporarily unavailable because NewsPub could not reach the database.",
          title: `${title} temporarily unavailable`,
          twitterDescription: "This story is temporarily unavailable because NewsPub could not reach the database.",
          twitterTitle: `${title} temporarily unavailable`,
          updatedAt: null,
        },
        relatedStories: [],
      };
    },
  );
}

/** Alias kept for route-level readability when category pages are used as landing pages. */
export const getPublishedLandingPageData = getPublishedCategoryPageData;
/** Alias kept for API handlers that still reference the older search helper name. */
export const searchPublishedPosts = searchPublishedStories;
