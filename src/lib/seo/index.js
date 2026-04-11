/**
 * SEO utilities for NewsPub canonical URLs, metadata, and structured public discovery.
 */

import { defaultLocale } from "@/features/i18n/config";
import { buildAlternateLanguageLinks, buildCanonicalPath, buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { sharedEnv } from "@/lib/env/shared";

/**
 * Shared NewsPub metadata and structured-data builders for public routes.
 */
const siteName = "NewsPub";
const defaultOpenGraphImagePath = "/opengraph-image";
const defaultTwitterImagePath = "/twitter-image";

/** Trims optional metadata strings before they are reused across tags and JSON-LD. */
function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/** Deduplicates metadata arrays while preserving their original order. */
function dedupeStrings(values = []) {
  return [...new Set((values || []).map((value) => trimText(value)).filter(Boolean))];
}

/** Detects whether a metadata value is already an absolute URL. */
function isAbsoluteUrl(value) {
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

/** Serializes metadata query params while omitting empty values. */
function createQueryString(query = {}) {
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    params.set(key, `${value}`);
  }

  return params.toString();
}

/** Appends metadata query params to either relative paths or absolute URLs. */
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

/** Normalizes metadata authors into the structure expected by the Next.js metadata API. */
function normalizeMetadataAuthors(authors = []) {
  const names = dedupeStrings(authors);

  return names.length ? names.map((name) => ({ name })) : undefined;
}

/** Maps one social image candidate into a normalized absolute-image descriptor. */
function createSocialImageEntry(image, fallbackAlt) {
  if (typeof image === "string") {
    const url = trimText(image);

    return url
      ? {
          alt: fallbackAlt,
          url: buildAbsoluteUrl(url),
        }
      : null;
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

/** Ensures social metadata always has at least one valid image fallback. */
function normalizeSocialImages(image, fallbackPath, fallbackAlt) {
  const entries = (Array.isArray(image) ? image : image ? [image] : [])
    .map((entry) => createSocialImageEntry(entry, fallbackAlt))
    .filter(Boolean);

  return entries.length
    ? entries
    : [
        {
          alt: fallbackAlt,
          url: buildAbsoluteUrl(fallbackPath),
        },
      ];
}

/** Builds alternate-language metadata only when more than one locale is active. */
function buildAlternateMetadata({ locales, query, segments }) {
  const alternateLanguageLinks = buildAlternateLanguageLinks(segments, {
    locales,
  });

  if (!alternateLanguageLinks) {
    return undefined;
  }

  const languages = Object.fromEntries(
    Object.entries(alternateLanguageLinks).map(([locale, path]) => [
      locale,
      buildAbsoluteUrl(appendQueryToPath(path, query)),
    ]),
  );

  if (languages[defaultLocale]) {
    languages["x-default"] = languages[defaultLocale];
  }

  return languages;
}

/** Removes HTML tags before body text is reused for lightweight SEO calculations. */
function extractTextContent(value) {
  return trimText(typeof value === "string" ? value.replace(/<[^>]*>/g, " ") : "").replace(/\s+/g, " ");
}

/** Counts words so article structured data can expose a real body length when content exists. */
function countWords(value) {
  const text = extractTextContent(value);

  return text ? text.split(" ").filter(Boolean).length : 0;
}

/** Heuristic that keeps newsroom-style authors represented as organizations in JSON-LD. */
function inferAuthorEntityType(name) {
  return /\b(editorial|desk|team|staff|news|media|wire)\b/i.test(name) ? "Organization" : "Person";
}

/** Builds schema.org author entries from the normalized story author list. */
function buildArticleAuthorEntries(article = {}) {
  const authors = dedupeStrings(article.authors);

  return authors.length
    ? authors.map((name) => ({
        "@type": inferAuthorEntityType(name),
        name,
      }))
    : [
        {
          "@type": "Organization",
          name: siteName,
        },
      ];
}

/** Extracts human-readable category names for article JSON-LD and keyword context. */
function getArticleCategoryNames(article = {}) {
  return dedupeStrings((article.categories || []).map((category) => category?.name));
}

/** Resolves relative NewsPub paths against the configured public app URL. */
export function buildAbsoluteUrl(pathOrUrl = "/") {
  const normalizedValue = trimText(pathOrUrl) || "/";

  if (isAbsoluteUrl(normalizedValue)) {
    return normalizedValue;
  }

  const pathname = normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`;

  return new URL(pathname, sharedEnv.app.url).toString();
}

/** Builds Next.js metadata for locale-aware NewsPub pages. */
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
  const normalizedKeywords = dedupeStrings(keywords);
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

/** Extracts FAQ entries from stored structured content for structured-data reuse. */
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

/** Builds organization structured data for the NewsPub public site. */
export function buildOrganizationJsonLd({ description, locale = defaultLocale, name = siteName } = {}) {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    description,
    name,
    url: buildAbsoluteUrl(buildLocalizedPath(locale, publicRouteSegments.home)),
  };
}

/** Builds breadcrumb structured data when the page hierarchy is deep enough to merit it. */
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

/** Builds article structured data for published story pages. */
export function buildArticleJsonLd({ article } = {}) {
  if (!article?.title || !article?.canonicalUrl) {
    return null;
  }

  const canonicalUrl = buildAbsoluteUrl(article.canonicalUrl);
  const imageUrl = article.seoImage?.url || article.image?.url;
  const categoryNames = getArticleCategoryNames(article);
  const keywordList = dedupeStrings(article.keywords);
  const wordCount = countWords(article.contentHtml || article.contentMd);

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    ...(categoryNames.length
      ? {
          about: categoryNames.map((name) => ({
            "@type": "Thing",
            name,
          })),
          articleSection: categoryNames[0],
        }
      : {}),
    ...(article.metaTitle && article.metaTitle !== article.title
      ? {
          alternativeHeadline: article.metaTitle,
        }
      : {}),
    author: buildArticleAuthorEntries(article),
    dateModified: article.updatedAt || article.publishedAt || undefined,
    datePublished: article.publishedAt || undefined,
    description: article.metaDescription || article.summary || undefined,
    headline: article.title,
    image: imageUrl ? [buildAbsoluteUrl(imageUrl)] : undefined,
    inLanguage: article.locale || defaultLocale,
    ...(keywordList.length
      ? {
          keywords: keywordList.join(", "),
        }
      : {}),
    mainEntityOfPage: canonicalUrl,
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: buildAbsoluteUrl(buildLocalizedPath(article.locale || defaultLocale, publicRouteSegments.home)),
    },
    ...(imageUrl
      ? {
          thumbnailUrl: buildAbsoluteUrl(imageUrl),
        }
      : {}),
    url: canonicalUrl,
    ...(wordCount
      ? {
          wordCount,
        }
      : {}),
  };
}
