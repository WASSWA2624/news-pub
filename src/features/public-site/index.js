import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { createPagination, pickTranslation, resolvePrismaClient } from "@/lib/news/shared";
import { sanitizeExternalUrl, sanitizeMediaUrl } from "@/lib/security";
import { buildAbsoluteUrl } from "@/lib/seo";

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

function mapImage(asset, fallbackAlt = "Story image") {
  if (!asset) {
    return null;
  }

  const url = sanitizeMediaUrl(asset.publicUrl || asset.sourceUrl || "");

  return url
    ? {
        alt: asset.alt || asset.caption || fallbackAlt,
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
  const safeUrl = sanitizeMediaUrl(url);

  return safeUrl
    ? {
        alt: metadata.alt || metadata.caption || fallbackAlt,
        caption: metadata.caption || null,
        height: metadata.height || null,
        url: safeUrl,
        width: metadata.width || null,
      }
    : null;
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
    name: category.name,
    path: buildLocalizedPath(locale, publicRouteSegments.category(category.slug)),
    slug: category.slug,
  };
}

function mapPostCard(post, locale = defaultLocale) {
  const translation = pickTranslation(post.translations || [], locale);
  const fallbackAlt = translation?.title || post.slug;
  const image = mapImage(post.featuredImage, fallbackAlt)
    || mapRemoteImage(post.sourceArticle?.imageUrl, fallbackAlt);
  const media = extractStructuredMedia(translation?.structuredContentJson, fallbackAlt);
  const primaryMedia = media[0]
    || (image ? { ...image, kind: "image", sourceUrl: image.url } : null);

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
    summary: translation?.summary || post.excerpt,
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

const publicPostInclude = Object.freeze({
  categories: {
    include: {
      category: true,
    },
  },
  featuredImage: true,
  publishAttempts: {
    where: {
      platform: "WEBSITE",
      status: "SUCCEEDED",
    },
  },
  sourceArticle: {
    select: {
      imageUrl: true,
    },
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

async function getPublishedCategoryCounts(db) {
  const categories = await db.category.findMany({
    include: {
      posts: {
        include: {
          post: {
            include: {
              publishAttempts: {
                where: {
                  platform: "WEBSITE",
                  status: "SUCCEEDED",
                },
              },
            },
          },
        },
      },
    },
    orderBy: {
      name: "asc",
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

async function getLatestPublishedPosts(db, locale, take = 7) {
  return db.post.findMany({
    include: publicPostInclude,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    take,
    where: buildPublishedWebsiteWhere({
      translations: {
        some: {
          locale,
        },
      },
    }),
  });
}

export async function getPublishedHomePageData({ locale = defaultLocale } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const [latestPosts, topCategories, publishedStoryCount] = await Promise.all([
    getLatestPublishedPosts(db, locale, 7),
    getPublishedCategoryCounts(db),
    db.post.count({
      where: buildPublishedWebsiteWhere(),
    }),
  ]);
  const cards = latestPosts.map((post) => mapPostCard(post, locale));

  return {
    featuredStory: cards[0] || null,
    latestStories: cards.slice(1),
    summary: {
      categoryCount: topCategories.length,
      publishedStoryCount,
    },
    topCategories: topCategories.slice(0, 6).map((category) => ({
      count: category.count,
      ...mapCategory(category, locale),
    })),
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
    include: publicPostInclude,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
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
    include: publicPostInclude,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
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

function buildSearchWhere(locale, search) {
  const normalizedSearch = normalizeSearch(search);

  if (!normalizedSearch) {
    return buildPublishedWebsiteWhere({
      translations: {
        some: {
          locale,
        },
      },
    });
  }

  return buildPublishedWebsiteWhere({
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
    translations: {
      some: {
        locale,
      },
    },
  });
}

export async function searchPublishedStories({ locale = defaultLocale, page = 1, search = "" } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const requestedPage = normalizePage(page);
  const where = buildSearchWhere(locale, search);
  const totalItems = await db.post.count({ where });
  const pagination = createPagination(totalItems, requestedPage, publicListingPageSize);
  const posts = await db.post.findMany({
    include: publicPostInclude,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
    skip: totalItems ? (pagination.currentPage - 1) * pagination.pageSize : 0,
    take: pagination.pageSize,
    where,
  });

  return {
    items: posts.map((post) => mapPostCard(post, locale)),
    pagination,
    query: normalizeSearch(search),
  };
}

/** Returns the published story page model plus lightweight related-story cards. */
export async function getPublishedStoryPageData({ locale = defaultLocale, slug } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const post = await db.post.findFirst({
    include: publicPostInclude,
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
    include: publicPostInclude,
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
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
    || (image ? { ...image, kind: "image", sourceUrl: image.url } : null);
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
