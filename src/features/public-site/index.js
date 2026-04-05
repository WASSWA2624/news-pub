import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { createPagination, pickTranslation, resolvePrismaClient } from "@/lib/news/shared";
import { buildAbsoluteUrl } from "@/lib/seo";

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

  const url = asset.publicUrl || asset.sourceUrl || null;

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
  const image = mapImage(post.featuredImage, translation?.title || post.slug);

  return {
    categories: (post.categories || []).map(({ category }) => mapCategory(category, translation?.locale || locale)),
    id: post.id,
    image,
    locale: translation?.locale || locale,
    path: buildLocalizedPath(translation?.locale || locale, publicRouteSegments.newsPost(post.slug)),
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
  const image = mapImage(post.featuredImage, translation.title);
  const article = {
    canonicalUrl:
      translation.seoRecord?.canonicalUrl ||
      buildAbsoluteUrl(buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug))),
    categories: (post.categories || []).map(({ category }) => mapCategory(category, translation.locale)),
    contentHtml: translation.contentHtml,
    contentMd: translation.contentMd,
    id: post.id,
    image,
    keywords: Array.isArray(translation.seoRecord?.keywordsJson)
      ? translation.seoRecord.keywordsJson
      : [],
    locale: translation.locale,
    metaDescription: translation.seoRecord?.metaDescription || translation.summary,
    metaTitle: translation.seoRecord?.metaTitle || translation.title,
    path: buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug)),
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
