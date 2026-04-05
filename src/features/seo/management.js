import { PostStatus } from "@prisma/client";

import { defaultLocale, supportedLocales } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments, publicStaticRoutes } from "@/features/i18n/routing";
import { env } from "@/lib/env/server";
import { buildAbsoluteUrl, buildPageMetadata, extractFaqItemsFromSections } from "@/lib/seo";

const nonIndexableStaticRouteKeys = new Set(["search"]);

const staticRouteTitleMap = Object.freeze({
  about: "About",
  blog: "Blog",
  contact: "Contact",
  disclaimer: "Disclaimer",
  home: "Home",
  privacy: "Privacy",
  search: "Search",
});

export const seoRobotsDisallowPaths = Object.freeze(["/admin", "/api"]);

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function dedupeStrings(values) {
  return [...new Set((values || []).map((value) => `${value}`.trim()).filter(Boolean))];
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeJsonStringList(value) {
  return Array.isArray(value)
    ? value.map((entry) => `${entry}`.trim()).filter(Boolean)
    : [];
}

function getMediaUrl(media) {
  return media?.publicUrl || media?.sourceUrl || null;
}

function createMediaImage(media, fallbackAlt) {
  const url = getMediaUrl(media);

  if (!url) {
    return null;
  }

  return {
    alt: media?.alt || media?.caption || fallbackAlt,
    url,
  };
}

function createStructuredImage(image, fallbackAlt) {
  const url = trimText(image?.url);

  if (!url) {
    return null;
  }

  return {
    alt: image?.alt || image?.caption || fallbackAlt,
    url,
  };
}

function normalizeStructuredSections(translation) {
  return Array.isArray(translation?.structuredContentJson?.sections)
    ? translation.structuredContentJson.sections.filter(
        (section) => section && typeof section === "object" && section.id && section.title,
      )
    : [];
}

function getFeaturedStructuredImage(translation, fallbackAlt) {
  const featuredImageSection = normalizeStructuredSections(translation).find(
    (section) => section.id === "featured_image",
  );

  return Array.isArray(featuredImageSection?.images)
    ? featuredImageSection.images.map((image) => createStructuredImage(image, fallbackAlt)).find(Boolean) || null
    : null;
}

function getFaqItems(translation) {
  const faqItems = Array.isArray(translation?.faqJson)
    ? translation.faqJson.filter((item) => item?.question && item?.answer)
    : [];

  return faqItems.length ? faqItems : extractFaqItemsFromSections(normalizeStructuredSections(translation));
}

function getStaticRoutePath(locale, route) {
  return buildLocalizedPath(locale, route.segments);
}

function getStaticRouteSamples() {
  return publicStaticRoutes.map((route) => {
    const isIndexable = !nonIndexableStaticRouteKeys.has(route.key);
    const metadata = buildPageMetadata({
      description: `${staticRouteTitleMap[route.key] || route.key} page`,
      locale: defaultLocale,
      noindex: !isIndexable,
      segments: route.segments,
      title: staticRouteTitleMap[route.key] || route.key,
    });

    return {
      alternateLocales: metadata.alternates.languages || null,
      canonicalUrl: metadata.alternates.canonical,
      isIndexable,
      key: route.key,
      path: getStaticRoutePath(defaultLocale, route),
    };
  });
}

function getMaxIsoDate(left, right) {
  if (!left) {
    return right || null;
  }

  if (!right) {
    return left;
  }

  return left.localeCompare(right) >= 0 ? left : right;
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

async function getPublishedSeoInventory(prisma) {
  const db = await resolvePrismaClient(prisma);

  return db.post.findMany({
    orderBy: [{ publishedAt: "desc" }, { updatedAt: "desc" }, { slug: "asc" }],
    select: {
      categories: {
        orderBy: {
          category: {
            name: "asc",
          },
        },
        select: {
          category: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
      equipment: {
        select: {
          name: true,
          slug: true,
          updatedAt: true,
        },
      },
      featuredImage: {
        select: {
          alt: true,
          caption: true,
          publicUrl: true,
          sourceUrl: true,
        },
      },
      id: true,
      manufacturers: {
        orderBy: {
          manufacturer: {
            name: "asc",
          },
        },
        select: {
          manufacturer: {
            select: {
              name: true,
              slug: true,
            },
          },
        },
      },
      publishedAt: true,
      slug: true,
      translations: {
        select: {
          excerpt: true,
          faqJson: true,
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
                select: {
                  alt: true,
                  caption: true,
                  publicUrl: true,
                  sourceUrl: true,
                },
              },
              ogTitle: true,
              twitterDescription: true,
              twitterTitle: true,
            },
          },
          structuredContentJson: true,
          title: true,
          updatedAt: true,
        },
        where: {
          locale: {
            in: supportedLocales,
          },
        },
      },
      updatedAt: true,
    },
    where: {
      publishedAt: {
        not: null,
      },
      status: PostStatus.PUBLISHED,
      translations: {
        some: {
          locale: {
            in: supportedLocales,
          },
        },
      },
    },
  });
}

function createPostSeoEntries(posts) {
  return posts.flatMap((post) =>
    post.translations.map((translation) => {
      const fallbackAlt = translation.title || post.equipment.name;
      const path = buildLocalizedPath(translation.locale, publicRouteSegments.blogPost(post.slug));
      const availableLocales = dedupeStrings(post.translations.map((entry) => entry.locale));
      const image =
        createMediaImage(translation.seoRecord?.ogImage, fallbackAlt) ||
        createMediaImage(post.featuredImage, fallbackAlt) ||
        getFeaturedStructuredImage(translation, fallbackAlt);
      const metadata = buildPageMetadata({
        authors: normalizeJsonStringList(translation.seoRecord?.authorsJson),
        canonicalUrl: translation.seoRecord?.canonicalUrl || buildAbsoluteUrl(path),
        description: translation.seoRecord?.metaDescription || translation.excerpt || "",
        image,
        keywords: normalizeJsonStringList(translation.seoRecord?.keywordsJson),
        locale: translation.locale,
        locales: availableLocales,
        modifiedTime: serializeDate(translation.updatedAt || post.updatedAt),
        noindex: Boolean(translation.seoRecord?.noindex),
        openGraphDescription:
          translation.seoRecord?.ogDescription || translation.seoRecord?.metaDescription || translation.excerpt || "",
        openGraphTitle: translation.seoRecord?.ogTitle || translation.seoRecord?.metaTitle || translation.title,
        publishedTime: serializeDate(post.publishedAt),
        segments: publicRouteSegments.blogPost(post.slug),
        title: translation.seoRecord?.metaTitle || translation.title,
        twitterDescription:
          translation.seoRecord?.twitterDescription ||
          translation.seoRecord?.ogDescription ||
          translation.seoRecord?.metaDescription ||
          translation.excerpt ||
          "",
        twitterTitle:
          translation.seoRecord?.twitterTitle ||
          translation.seoRecord?.ogTitle ||
          translation.seoRecord?.metaTitle ||
          translation.title,
        type: "article",
      });
      const faqItems = getFaqItems(translation);

      return {
        alternateLocales: metadata.alternates.languages || null,
        canonicalUrl: metadata.alternates.canonical,
        hasSeoRecord: Boolean(translation.seoRecord),
        hasDedicatedOgImage: Boolean(translation.seoRecord?.ogImage),
        imageUrl: metadata.openGraph?.images?.[0]?.url || null,
        isNoindex: Boolean(translation.seoRecord?.noindex),
        keywords: normalizeJsonStringList(translation.seoRecord?.keywordsJson),
        locale: translation.locale,
        metaDescription: translation.seoRecord?.metaDescription || translation.excerpt || "",
        metaDescriptionLength: (translation.seoRecord?.metaDescription || translation.excerpt || "").length,
        metaTitle: translation.seoRecord?.metaTitle || translation.title,
        path,
        postId: post.id,
        publicUrl: buildAbsoluteUrl(path),
        publishedAt: serializeDate(post.publishedAt),
        schemaTypes: [
          "Organization",
          "BreadcrumbList",
          "Article",
          ...(faqItems.length ? ["FAQPage"] : []),
        ],
        slug: post.slug,
        title: translation.title,
        twitterCard: metadata.twitter?.card || "summary",
        updatedAt: serializeDate(translation.updatedAt || post.updatedAt),
      };
    }),
  );
}

function createEntityPageSummary(posts) {
  const categories = new Map();
  const equipment = new Map();
  const manufacturers = new Map();

  for (const post of posts) {
    const lastModified = serializeDate(post.updatedAt || post.publishedAt);

    for (const translation of post.translations) {
      const locale = translation.locale;

      for (const { category } of post.categories) {
        const categoryKey = `${locale}:${category.slug}`;
        const existingCategory = categories.get(categoryKey) || {
          locale,
          path: buildLocalizedPath(locale, publicRouteSegments.category(category.slug)),
          slug: category.slug,
          updatedAt: null,
        };

        existingCategory.updatedAt = getMaxIsoDate(existingCategory.updatedAt, lastModified);
        categories.set(categoryKey, existingCategory);
      }

      const equipmentKey = `${locale}:${post.equipment.slug}`;
      const existingEquipment = equipment.get(equipmentKey) || {
        locale,
        path: buildLocalizedPath(locale, publicRouteSegments.equipment(post.equipment.slug)),
        slug: post.equipment.slug,
        updatedAt: null,
      };

      existingEquipment.updatedAt = getMaxIsoDate(
        existingEquipment.updatedAt,
        serializeDate(post.equipment.updatedAt) || lastModified,
      );
      equipment.set(equipmentKey, existingEquipment);

      for (const { manufacturer } of post.manufacturers) {
        const manufacturerKey = `${locale}:${manufacturer.slug}`;
        const existingManufacturer = manufacturers.get(manufacturerKey) || {
          locale,
          path: buildLocalizedPath(locale, publicRouteSegments.manufacturer(manufacturer.slug)),
          slug: manufacturer.slug,
          updatedAt: null,
        };

        existingManufacturer.updatedAt = getMaxIsoDate(existingManufacturer.updatedAt, lastModified);
        manufacturers.set(manufacturerKey, existingManufacturer);
      }
    }
  }

  return {
    categories: [...categories.values()],
    equipment: [...equipment.values()],
    manufacturers: [...manufacturers.values()],
  };
}

export function getRobotsConfiguration() {
  const baseUrl = env.app.url;

  return {
    host: baseUrl,
    rules: [
      {
        allow: "/",
        disallow: [...seoRobotsDisallowPaths],
        userAgent: "*",
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}

export async function getSitemapEntries(prisma) {
  const posts = await getPublishedSeoInventory(prisma);
  const entityPages = createEntityPageSummary(posts);
  const staticEntries = supportedLocales.flatMap((locale) =>
    publicStaticRoutes
      .filter((route) => !nonIndexableStaticRouteKeys.has(route.key))
      .map((route) => ({
        changeFrequency: route.key === "home" ? "weekly" : route.key === "blog" ? "daily" : "monthly",
        lastModified: undefined,
        priority: route.key === "home" ? 1 : route.key === "blog" ? 0.85 : 0.65,
        url: buildAbsoluteUrl(getStaticRoutePath(locale, route)),
      })),
  );
  const postEntries = posts.flatMap((post) =>
    post.translations.map((translation) => ({
      changeFrequency: "weekly",
      lastModified: serializeDate(translation.updatedAt || post.updatedAt || post.publishedAt) || undefined,
      priority: 0.8,
      url: buildAbsoluteUrl(buildLocalizedPath(translation.locale, publicRouteSegments.blogPost(post.slug))),
    })),
  );
  const categoryEntries = entityPages.categories.map((entry) => ({
    changeFrequency: "weekly",
    lastModified: entry.updatedAt || undefined,
    priority: 0.65,
    url: buildAbsoluteUrl(entry.path),
  }));
  const manufacturerEntries = entityPages.manufacturers.map((entry) => ({
    changeFrequency: "weekly",
    lastModified: entry.updatedAt || undefined,
    priority: 0.65,
    url: buildAbsoluteUrl(entry.path),
  }));
  const equipmentEntries = entityPages.equipment.map((entry) => ({
    changeFrequency: "weekly",
    lastModified: entry.updatedAt || undefined,
    priority: 0.7,
    url: buildAbsoluteUrl(entry.path),
  }));

  return [
    ...staticEntries,
    ...postEntries,
    ...categoryEntries,
    ...manufacturerEntries,
    ...equipmentEntries,
  ];
}

export async function getSeoManagementSnapshot(prisma) {
  const posts = await getPublishedSeoInventory(prisma);
  const postSeoEntries = createPostSeoEntries(posts);
  const entityPages = createEntityPageSummary(posts);
  const indexableStaticRoutes = getStaticRouteSamples().filter((route) => route.isIndexable);

  return {
    crawl: {
      disallowPaths: [...seoRobotsDisallowPaths],
      robotsUrl: `${env.app.url}/robots.txt`,
      sitemapUrl: `${env.app.url}/sitemap.xml`,
    },
    routes: {
      indexableStaticRoutes,
    },
    site: {
      alternateLinksEnabled: supportedLocales.length > 1,
      appUrl: env.app.url,
      defaultLocale,
      supportedLocales,
    },
    summary: {
      categoryPageCount: entityPages.categories.length,
      equipmentPageCount: entityPages.equipment.length,
      faqPageCount: postSeoEntries.filter((entry) => entry.schemaTypes.includes("FAQPage")).length,
      manufacturerPageCount: entityPages.manufacturers.length,
      postPageCount: postSeoEntries.length,
      publishedPostCount: posts.length,
      searchableStaticPageCount: indexableStaticRoutes.length,
      seoRecordCount: postSeoEntries.filter((entry) => entry.hasSeoRecord).length,
    },
    posts: postSeoEntries,
  };
}
