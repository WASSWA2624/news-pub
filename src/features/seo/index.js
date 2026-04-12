/**
 * Feature services for NewsPub SEO settings, sitemap data, and public metadata inputs.
 */

import { defaultLocale, supportedLocales } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments, publicStaticRoutes } from "@/features/i18n/routing";
import { sharedEnv } from "@/lib/env/shared";
import { resolvePrismaClient } from "@/lib/news/shared";
import { isPrismaConnectionError } from "@/lib/prisma";
import { buildAbsoluteUrl } from "@/lib/seo";

/**
 * NewsPub SEO helpers for robots, sitemap, and admin-facing SEO reporting.
 */
export const seoRobotsDisallowPaths = Object.freeze(["/admin", "/api"]);

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

async function withSeoDatabaseFallback(load, fallback) {
  try {
    return await load();
  } catch (error) {
    if (!isPrismaConnectionError(error)) {
      throw error;
    }

    return fallback(error);
  }
}

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

function getStaticSitemapEntries() {
  return supportedLocales.flatMap((locale) =>
    publicStaticRoutes
      .filter((route) => route.key !== "search")
      .map((route) => mapStaticRouteEntry(locale, route)),
  );
}
/**
 * Returns the robots configuration used by the NewsPub public site.
 */

export function getRobotsConfiguration() {
  return {
    host: sharedEnv.app.url,
    rules: [
      {
        allow: "/",
        disallow: seoRobotsDisallowPaths,
        user_agent: "*",
      },
    ],
    sitemap: `${sharedEnv.app.url.replace(/\/+$/, "")}/sitemap.xml`,
  };
}

/** Builds sitemap entries for static routes, published stories, and active category landings. */
export async function getSitemapEntries(prisma) {
  return withSeoDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const [posts, categories] = await Promise.all([
        db.post.findMany({
          select: {
            published_at: true,
            slug: true,
            translations: {
              orderBy: {
                locale: "asc",
              },
              select: {
                locale: true,
              },
            },
            updated_at: true,
          },
          orderBy: [{ published_at: "desc" }, { updated_at: "desc" }],
          where: buildPublishedWebsiteWhere(),
        }),
        db.category.findMany({
          orderBy: [{ name: "asc" }],
          select: {
            slug: true,
            updated_at: true,
          },
          where: {
            posts: {
              some: {
                post: buildPublishedWebsiteWhere(),
              },
            },
          },
        }),
      ]);
      const staticEntries = getStaticSitemapEntries();
      const postEntries = posts.flatMap((post) =>
        post.translations
          .filter((translation) => supportedLocales.includes(translation.locale))
          .map((translation) => ({
            changeFrequency: "hourly",
            lastModified: post.updated_at || post.published_at || new Date(),
            priority: 0.85,
            url: buildAbsoluteUrl(buildLocalizedPath(translation.locale, publicRouteSegments.newsPost(post.slug))),
          })),
      );
      const categoryEntries = categories.flatMap((category) =>
        supportedLocales.map((locale) => ({
          changeFrequency: "daily",
          lastModified: category.updated_at || new Date(),
          priority: 0.65,
          url: buildAbsoluteUrl(buildLocalizedPath(locale, publicRouteSegments.category(category.slug))),
        })),
      );

      return [...staticEntries, ...postEntries, ...categoryEntries];
    },
    () => getStaticSitemapEntries(),
  );
}

/** Summarizes SEO coverage for the admin SEO workspace. */
export async function getSeoManagementSnapshot(prisma) {
  return withSeoDatabaseFallback(
    async () => {
      const db = await resolvePrismaClient(prisma);
      const [posts, categoryPageCount, publishedStoryCount, storyLocalesCount] = await Promise.all([
        db.post.findMany({
          select: {
            excerpt: true,
            published_at: true,
            slug: true,
            translations: {
              include: {
                seoRecord: true,
              },
              orderBy: {
                locale: "asc",
              },
            },
            updated_at: true,
          },
          orderBy: [{ published_at: "desc" }, { updated_at: "desc" }],
          take: 25,
          where: buildPublishedWebsiteWhere(),
        }),
        db.category.count({
          where: {
            posts: {
              some: {
                post: buildPublishedWebsiteWhere(),
              },
            },
          },
        }),
        db.post.count({
          where: buildPublishedWebsiteWhere(),
        }),
        db.postTranslation.count({
          where: {
            post: buildPublishedWebsiteWhere(),
          },
        }),
      ]);

      return {
        stories: posts.map((post) => ({
          canonical_url:
            post.translations.find((translation) => translation.locale === defaultLocale)?.seoRecord?.canonical_url ||
            buildAbsoluteUrl(buildLocalizedPath(defaultLocale, publicRouteSegments.newsPost(post.slug))),
          locales: post.translations.map((translation) => translation.locale),
          meta_description:
            post.translations.find((translation) => translation.locale === defaultLocale)?.seoRecord?.meta_description ||
            post.excerpt,
          meta_title:
            post.translations.find((translation) => translation.locale === defaultLocale)?.seoRecord?.meta_title ||
            post.translations.find((translation) => translation.locale === defaultLocale)?.title ||
            post.slug,
          missingSeoRecord: post.translations.some((translation) => !translation.seoRecord),
          published_at: serializeDate(post.published_at),
          slug: post.slug,
          updated_at: serializeDate(post.updated_at),
        })),
        summary: {
          categoryPageCount,
          publishedStoryCount,
          searchRouteIndexed: false,
          storyLocalesCount,
        },
      };
    },
    () => ({
      stories: [],
      summary: {
        categoryPageCount: 0,
        publishedStoryCount: 0,
        searchRouteIndexed: false,
        storyLocalesCount: 0,
      },
    }),
  );
}
