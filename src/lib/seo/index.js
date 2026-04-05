import { defaultLocale } from "@/features/i18n/config";
import {
  buildAlternateLanguageLinks,
  buildCanonicalPath,
  buildLocalizedPath,
  publicRouteSegments,
} from "@/features/i18n/routing";
import { env } from "@/lib/env/server";

const siteName = "Equip Blog";
const defaultOpenGraphImagePath = "/opengraph-image";
const defaultTwitterImagePath = "/twitter-image";

function dedupeStrings(values) {
  return [...new Set((values || []).map((value) => `${value}`.trim()).filter(Boolean))];
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function isAbsoluteUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

function createQueryString(query = {}) {
  const searchParams = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    searchParams.set(key, `${value}`);
  }

  return searchParams.toString();
}

function appendQueryToPath(pathOrUrl, query = {}) {
  const queryString = createQueryString(query);

  if (!queryString) {
    return pathOrUrl;
  }

  if (isAbsoluteUrl(pathOrUrl)) {
    const url = new URL(pathOrUrl);

    for (const [key, value] of new URLSearchParams(queryString).entries()) {
      url.searchParams.set(key, value);
    }

    return url.toString();
  }

  return `${pathOrUrl}${pathOrUrl.includes("?") ? "&" : "?"}${queryString}`;
}

function normalizeMetadataAuthors(authors) {
  const names = dedupeStrings(authors);

  return names.length ? names.map((name) => ({ name })) : undefined;
}

function createMetaDescription(article) {
  const source = [article.excerpt, ...(article.sections || []).flatMap((section) => section.paragraphs || [])]
    .find(Boolean) || "";

  return source.length > 160 ? `${source.slice(0, 157).trim()}...` : source;
}

function createSocialImageEntry(image, fallbackAlt) {
  if (typeof image === "string") {
    const url = trimText(image);

    if (!url) {
      return null;
    }

    return {
      alt: fallbackAlt,
      url: buildAbsoluteUrl(url),
    };
  }

  if (!image || typeof image !== "object") {
    return null;
  }

  const url = trimText(image.url);

  if (!url) {
    return null;
  }

  return {
    ...(image.height ? { height: image.height } : {}),
    ...(image.width ? { width: image.width } : {}),
    alt: image.alt || image.caption || fallbackAlt,
    url: buildAbsoluteUrl(url),
  };
}

function normalizeSocialImages(image, fallbackPath, fallbackAlt) {
  const normalizedImages = (Array.isArray(image) ? image : image ? [image] : [])
    .map((entry) => createSocialImageEntry(entry, fallbackAlt))
    .filter(Boolean);

  if (normalizedImages.length) {
    return normalizedImages;
  }

  return [
    {
      alt: fallbackAlt,
      url: buildAbsoluteUrl(fallbackPath),
    },
  ];
}

function buildAlternateMetadata({ locales, query, segments }) {
  const alternateLanguageLinks = buildAlternateLanguageLinks(segments, {
    locales,
  });

  if (!alternateLanguageLinks) {
    return undefined;
  }

  const absoluteAlternates = Object.fromEntries(
    Object.entries(alternateLanguageLinks).map(([locale, path]) => [
      locale,
      buildAbsoluteUrl(appendQueryToPath(path, query)),
    ]),
  );

  if (absoluteAlternates[defaultLocale]) {
    absoluteAlternates["x-default"] = absoluteAlternates[defaultLocale];
  }

  return absoluteAlternates;
}

function buildPublisherJsonLd(locale) {
  return {
    "@type": "Organization",
    name: siteName,
    url: buildAbsoluteUrl(buildLocalizedPath(locale, publicRouteSegments.home)),
  };
}

export function buildAbsoluteUrl(pathOrUrl = "/") {
  const normalizedValue = trimText(pathOrUrl) || "/";

  if (isAbsoluteUrl(normalizedValue)) {
    return normalizedValue;
  }

  const pathname = normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`;

  return new URL(pathname, env.app.url).toString();
}

export function buildSeoPayload(article, { locale = "en", ogImageId = null } = {}) {
  const canonicalPath = buildLocalizedPath(locale, publicRouteSegments.blogPost(article.slug));
  const canonicalUrl = buildAbsoluteUrl(canonicalPath);
  const keywords = dedupeStrings([
    article.equipmentName,
    ...(article.equipmentAliases || []),
    ...(article.relatedKeywords || []),
    ...(article.sections
      .filter((section) => section.kind === "models_by_manufacturer")
      .flatMap((section) => section.groups.map((group) => group.manufacturer))),
  ]);
  const metaDescription = createMetaDescription(article);

  return {
    authors: ["Equip Blog Editorial"],
    canonicalUrl,
    keywords,
    metaDescription,
    metaTitle: article.title,
    noindex: false,
    ogDescription: metaDescription,
    ogImageId,
    ogTitle: article.title,
    twitterDescription: metaDescription,
    twitterTitle: article.title,
  };
}

export function buildPageMetadata({
  authors,
  canonicalUrl,
  description,
  image,
  keywords,
  locale,
  locales,
  modifiedTime,
  noindex = false,
  openGraphDescription,
  openGraphTitle,
  publishedTime,
  query,
  segments = [],
  title,
  twitterDescription,
  twitterTitle,
  type = "website",
} = {}) {
  const canonical = buildAbsoluteUrl(
    appendQueryToPath(canonicalUrl || buildCanonicalPath(locale, segments), query),
  );
  const metadataAuthors = normalizeMetadataAuthors(authors);
  const openGraphImages = normalizeSocialImages(image, defaultOpenGraphImagePath, title || siteName);
  const twitterImages = normalizeSocialImages(
    image,
    image ? defaultOpenGraphImagePath : defaultTwitterImagePath,
    title || siteName,
  );
  const alternateMetadata = buildAlternateMetadata({
    locales,
    query,
    segments,
  });
  const normalizedKeywords = dedupeStrings(keywords);

  return {
    alternates: {
      canonical,
      ...(alternateMetadata ? { languages: alternateMetadata } : {}),
    },
    ...(metadataAuthors ? { authors: metadataAuthors } : {}),
    ...(normalizedKeywords.length ? { keywords: normalizedKeywords } : {}),
    description,
    openGraph: {
      ...(metadataAuthors ? { authors: metadataAuthors.map((author) => author.name) } : {}),
      ...(modifiedTime ? { modifiedTime } : {}),
      ...(publishedTime ? { publishedTime } : {}),
      description: openGraphDescription || description,
      images: openGraphImages,
      siteName,
      title: openGraphTitle || title,
      type,
      url: canonical,
    },
    ...(noindex
      ? {
          robots: {
            follow: true,
            googleBot: {
              follow: true,
              index: false,
            },
            index: false,
          },
        }
      : {}),
    title,
    twitter: {
      card: twitterImages.length ? "summary_large_image" : "summary",
      description: twitterDescription || openGraphDescription || description,
      images: twitterImages.map((entry) => entry.url),
      title: twitterTitle || openGraphTitle || title,
    },
  };
}

export function extractFaqItemsFromSections(sections = []) {
  return (sections || [])
    .filter((section) => section?.kind === "faq")
    .flatMap((section) => section.items || [])
    .filter((item) => item?.question && item?.answer)
    .map((item) => ({
      answer: item.answer,
      question: item.question,
    }));
}

export function buildOrganizationJsonLd({ description, locale = defaultLocale, name = siteName } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    description,
    name,
    url: buildAbsoluteUrl(buildLocalizedPath(locale, publicRouteSegments.home)),
  };
}

export function buildBreadcrumbJsonLd(items = []) {
  const breadcrumbItems = (items || []).filter((item) => item?.label && item?.href);

  if (breadcrumbItems.length < 2) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: breadcrumbItems.map((item, index) => ({
      "@type": "ListItem",
      item: buildAbsoluteUrl(item.href),
      name: item.label,
      position: index + 1,
    })),
  };
}

export function buildArticleJsonLd({ article, locale = defaultLocale } = {}) {
  if (!article?.title || !article?.url) {
    return null;
  }

  const imageUrls = normalizeSocialImages(
    article.metadata?.ogImage || article.heroImages || [],
    defaultOpenGraphImagePath,
    article.title,
  ).map((entry) => entry.url);
  const keywordList = dedupeStrings([
    ...(article.metadata?.keywords || []),
    article.equipment?.name,
    ...(article.categories || []).map((category) => category.name),
    ...(article.manufacturers || []).map((manufacturer) => manufacturer.name),
  ]);
  const aboutItems = dedupeStrings([
    article.equipment?.name,
    ...(article.categories || []).map((category) => category.name),
    ...(article.manufacturers || []).map((manufacturer) => manufacturer.name),
  ]);

  return {
    "@context": "https://schema.org",
    "@type": "Article",
    ...(aboutItems.length
      ? {
          about: aboutItems.map((name) => ({
            "@type": "Thing",
            name,
          })),
        }
      : {}),
    ...(article.authorName
      ? {
          author: {
            "@type": "Organization",
            name: article.authorName,
          },
        }
      : {}),
    ...(article.publishedAt ? { datePublished: article.publishedAt } : {}),
    ...(article.updatedAt ? { dateModified: article.updatedAt } : {}),
    articleSection: (article.bodySections || []).map((section) => section.title).filter(Boolean),
    description: article.metadata?.description || article.excerpt || "",
    headline: article.metadata?.title || article.title,
    image: imageUrls,
    inLanguage: locale,
    isAccessibleForFree: true,
    keywords: keywordList.join(", "),
    mainEntityOfPage: article.url,
    publisher: buildPublisherJsonLd(locale),
    url: article.url,
  };
}

export function buildFaqJsonLd(items = []) {
  const faqItems = (items || []).filter((item) => item?.question && item?.answer);

  if (!faqItems.length) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqItems.map((item) => ({
      "@type": "Question",
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
      name: item.question,
    })),
  };
}
