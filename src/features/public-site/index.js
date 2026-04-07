import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import {
  formatCountryFlagEmoji as formatCountryFlag,
  formatCountryFlagImageUrl,
  formatCountryLabel,
  normalizeCountryCode as normalizeCountry,
} from "@/lib/countries";
import { createImagePlaceholderDataUrl, getRenderableImageUrl } from "@/lib/media";
import { createPagination, pickTranslation, resolvePrismaClient } from "@/lib/news/shared";
import { sanitizeExternalUrl, sanitizeMediaUrl } from "@/lib/security";
import { buildAbsoluteUrl } from "@/lib/seo";

import { publicHomeLatestIncrementCount, publicHomeLatestInitialCount } from "./constants";

/**
 * Public-site data mappers for locale-aware NewsPub story discovery pages.
 */
export const publicDataRevalidateSeconds = 300;
export const publicListingPageSize = 12;

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizePage(value) {
  const parsedValue = Number.parseInt(`${value || 1}`.trim(), 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : 1;
}

function normalizeSearch(value) {
  return trimText(value).slice(0, 191);
}

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

function mapImage(asset, fallbackAlt = "Story image") {
  if (!asset) {
    return null;
  }

  const alt = asset.alt || asset.caption || fallbackAlt;
  const url = getRenderableImageUrl(asset.sourceUrl || asset.publicUrl || "", {
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

function getUrlPathname(url) {
  try {
    return new URL(url).pathname.toLowerCase();
  } catch {
    return "";
  }
}

function getUrlExtension(url) {
  const pathname = getUrlPathname(url);
  const lastDotIndex = pathname.lastIndexOf(".");

  return lastDotIndex >= 0 ? pathname.slice(lastDotIndex) : "";
}

function isVideoLikeValue(value) {
  return trimText(value).toLowerCase().includes("video");
}

function isImageLikeValue(value) {
  return trimText(value).toLowerCase().includes("image");
}

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

function resolveEmbeddableVideoUrl(url) {
  return sanitizeExternalUrl(resolveYouTubeEmbedUrl(url) || resolveVimeoEmbedUrl(url) || "");
}

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

function mapPostCard(post, locale = defaultLocale) {
  const translation = pickTranslation(post.translations || [], locale);
  const fallbackAlt = translation?.title || post.slug;
  const summary = translation?.summary || post.excerpt;
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

const mediaAssetSelect = Object.freeze({
  alt: true,
  caption: true,
  height: true,
  publicUrl: true,
  sourceUrl: true,
  width: true,
});

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
          canonicalUrl: true,
          keywordsJson: true,
          metaDescription: true,
          metaTitle: true,
          ogImage: {
            select: mediaAssetSelect,
          },
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

async function getPublishedCategoryCounts(db) {
  const categories = await db.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      description: true,
      id: true,
      name: true,
      posts: {
        select: {
          post: {
            select: {
              status: true,
              publishAttempts: {
                select: {
                  id: true,
                },
                where: {
                  platform: "WEBSITE",
                  status: "SUCCEEDED",
                },
              },
            },
          },
        },
      },
      slug: true,
    },
  });

  return categories
    .map((category) => ({
      count: category.posts.filter(
        ({ post }) => post.status === "PUBLISHED" && (post.publishAttempts || []).length,
      ).length,
      ...category,
    }))
    .filter((category) => category.count > 0)
    .sort((left, right) => right.count - left.count || left.name.localeCompare(right.name));
}

async function getPublishedCountryCounts(db, locale) {
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

export async function getPublishedHomePageData({ locale = defaultLocale } = {}, prisma) {
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
}

export async function getPublishedCategoryNavigationData(
  { locale = defaultLocale, limit = 8 } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const categories = await getPublishedCategoryCounts(db);
  const safeLimit = Number.isFinite(limit) ? Math.max(1, Math.trunc(limit)) : 8;

  return categories.slice(0, safeLimit).map((category) => ({
    count: category.count,
    ...mapCategory(category, locale),
  }));
}

export async function getPublishedSearchFilterData({ locale = defaultLocale } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);

  return {
    countries: await getPublishedCountryCounts(db, locale),
  };
}

export async function getPublishedHomeLatestStoriesData(
  { locale = defaultLocale, skip = 1, take = publicHomeLatestIncrementCount } = {},
  prisma,
) {
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
}

/** Returns the paginated published-story index for a locale. */
export async function getPublishedNewsIndexData({ locale = defaultLocale, page = 1 } = {}, prisma) {
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
}

/** Returns a category landing page backed by published website stories. */
export async function getPublishedCategoryPageData({ locale = defaultLocale, page = 1, slug } = {}, prisma) {
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
}

function buildSearchWhere(locale, search, country) {
  const normalizedSearch = normalizeSearch(search);
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

  if (!normalizedSearch) {
    return buildPublishedWebsiteWhere(filters.length === 1 ? filters[0] : { AND: filters });
  }

  filters.push({
    OR: [
      {
        slug: {
          contains: normalizedSearch,
        },
      },
      {
        sourceName: {
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
            locale,
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
                contentMd: {
                  contains: normalizedSearch,
                },
              },
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
                    contains: normalizedSearch,
                  },
                },
                {
                  slug: {
                    contains: normalizedSearch,
                  },
                },
              ],
            },
          },
        },
      },
    ],
  });

  return buildPublishedWebsiteWhere({
    AND: filters,
  });
}

export async function searchPublishedStories(
  { locale = defaultLocale, page = 1, search = "", country = "" } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const requestedPage = normalizePage(page);
  const normalizedCountry = normalizeCountry(country);
  const where = buildSearchWhere(locale, search, normalizedCountry);
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
    country: normalizedCountry,
    items: posts.map((post) => mapPostCard(post, locale)),
    pagination,
    query: normalizeSearch(search),
  };
}

/** Returns the published story page model plus lightweight related-story cards. */
export async function getPublishedStoryPageData({ locale = defaultLocale, slug } = {}, prisma) {
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
  const image = mapImage(post.featuredImage, translation.title)
    || mapRemoteImage(post.sourceArticle?.imageUrl, translation.title);
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
    keywords: Array.isArray(translation.seoRecord?.keywordsJson)
      ? translation.seoRecord.keywordsJson
      : [],
    locale: translation.locale,
    metaDescription: translation.seoRecord?.metaDescription || translation.summary,
    metaTitle: translation.seoRecord?.metaTitle || translation.title,
    path: buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug)),
    primaryMedia,
    providerKey: post.providerKey,
    publishedAt: serializeDate(post.publishedAt),
    seoImage:
      mapImage(translation.seoRecord?.ogImage, translation.title) ||
      image,
    slug: post.slug,
    sourceAttribution: translation.sourceAttribution,
    sourceName: post.sourceName,
    sourceUrl: post.sourceUrl,
    structuredContentJson: translation.structuredContentJson,
    summary: translation.summary,
    title: translation.title,
    updatedAt: serializeDate(post.updatedAt),
  };

  return {
    article,
    relatedStories: relatedPosts.map((relatedPost) => mapPostCard(relatedPost, translation.locale)),
  };
}

export const getPublishedLandingPageData = getPublishedCategoryPageData;
export const searchPublishedPosts = searchPublishedStories;
