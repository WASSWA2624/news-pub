import { defaultLocale, supportedLocales } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments, publicStaticRoutes } from "@/features/i18n/routing";
import { env } from "@/lib/env/server";
import { resolvePrismaClient } from "@/lib/news/shared";
import { buildAbsoluteUrl } from "@/lib/seo";

/**
 * NewsPub SEO helpers for robots, sitemap, and admin-facing SEO reporting.
 */
export const seoRobotsDisallowPaths = Object.freeze(["/admin", "/api"]);

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function mapStaticRouteEntry(locale, route) {
  return {
    changeFrequency: route.key === "home" ? "hourly" : "daily",
    lastModified: new Date(),
    priority: route.key === "home" ? 1 : route.key === "news" ? 0.9 : 0.6,
    url: buildAbsoluteUrl(buildLocalizedPath(locale, route.segments)),
  };
}

export function getRobotsConfiguration() {
  return {
    host: env.app.url,
    rules: [
      {
        allow: "/",
        disallow: seoRobotsDisallowPaths,
        userAgent: "*",
      },
    ],
    sitemap: `${env.app.url.replace(/\/+$/, "")}/sitemap.xml`,
  };
}

/** Builds sitemap entries for static routes, published stories, and active category landings. */
export async function getSitemapEntries(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [posts, categories] = await Promise.all([
    db.post.findMany({
      include: {
        translations: {
          orderBy: {
            locale: "asc",
          },
          select: {
            locale: true,
          },
        },
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      where: {
        publishAttempts: {
          some: {
            platform: "WEBSITE",
            status: "SUCCEEDED",
          },
        },
        status: "PUBLISHED",
      },
    }),
    db.category.findMany({
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
      orderBy: [{ name: "asc" }],
    }),
  ]);
  const staticEntries = supportedLocales
    .flatMap((locale) =>
      publicStaticRoutes
        .filter((route) => route.key !== "search")
        .map((route) => mapStaticRouteEntry(locale, route)),
    );
  const postEntries = posts.flatMap((post) =>
    post.translations
      .filter((translation) => supportedLocales.includes(translation.locale))
      .map((translation) => ({
        changeFrequency: "hourly",
        lastModified: post.updatedAt || post.publishedAt || new Date(),
        priority: 0.85,
        url: buildAbsoluteUrl(buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug))),
      })),
  );
  const categoryEntries = categories.flatMap((category) => {
    const hasPublishedWebsitePosts = category.posts.some(
      ({ post }) => post.status === "PUBLISHED" && (post.publishAttempts || []).length,
    );

    if (!hasPublishedWebsitePosts) {
      return [];
    }

    return supportedLocales.map((locale) => ({
      changeFrequency: "daily",
      lastModified: category.updatedAt || new Date(),
      priority: 0.65,
      url: buildAbsoluteUrl(buildLocalizedPath(locale, publicRouteSegments.category(category.slug))),
    }));
  });

  return [...staticEntries, ...postEntries, ...categoryEntries];
}

/** Summarizes SEO coverage for the admin SEO workspace. */
export async function getSeoManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [posts, categories] = await Promise.all([
    db.post.findMany({
      include: {
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
      },
      orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }],
      take: 25,
      where: {
        status: "PUBLISHED",
      },
    }),
    db.category.findMany({
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
      orderBy: [{ name: "asc" }],
    }),
  ]);

  const publishedWebsiteStories = posts.filter((post) => post.publishAttempts.length);

  return {
    stories: publishedWebsiteStories.map((post) => ({
      canonicalUrl:
        post.translations.find((translation) => translation.locale === defaultLocale)?.seoRecord?.canonicalUrl ||
        buildAbsoluteUrl(buildLocalizedPath(defaultLocale, publicRouteSegments.newsPost(post.slug))),
      locales: post.translations.map((translation) => translation.locale),
      metaDescription:
        post.translations.find((translation) => translation.locale === defaultLocale)?.seoRecord?.metaDescription ||
        post.excerpt,
      metaTitle:
        post.translations.find((translation) => translation.locale === defaultLocale)?.seoRecord?.metaTitle ||
        post.translations.find((translation) => translation.locale === defaultLocale)?.title ||
        post.slug,
      missingSeoRecord: post.translations.some((translation) => !translation.seoRecord),
      publishedAt: serializeDate(post.publishedAt),
      slug: post.slug,
      updatedAt: serializeDate(post.updatedAt),
    })),
    summary: {
      categoryPageCount: categories.filter((category) =>
        category.posts.some(({ post }) => post.status === "PUBLISHED" && (post.publishAttempts || []).length),
      ).length,
      publishedStoryCount: publishedWebsiteStories.length,
      searchRouteIndexed: false,
      storyLocalesCount: publishedWebsiteStories.reduce(
        (total, post) => total + post.translations.length,
        0,
      ),
    },
  };
}
