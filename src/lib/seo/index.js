import { defaultLocale } from "@/features/i18n/config";
import { buildAlternateLanguageLinks, buildCanonicalPath, buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { env } from "@/lib/env/server";

const siteName = "NewsPub";
const defaultOpenGraphImagePath = "/opengraph-image";
const defaultTwitterImagePath = "/twitter-image";

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function dedupeStrings(values = []) {
  return [...new Set((values || []).map((value) => trimText(value)).filter(Boolean))];
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
  const params = new URLSearchParams();

  for (const [key, value] of Object.entries(query || {})) {
    if (value === undefined || value === null || value === "" || value === false) {
      continue;
    }

    params.set(key, `${value}`);
  }

  return params.toString();
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

function normalizeMetadataAuthors(authors = []) {
  const names = dedupeStrings(authors);

  return names.length ? names.map((name) => ({ name })) : undefined;
}

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

export function buildAbsoluteUrl(pathOrUrl = "/") {
  const normalizedValue = trimText(pathOrUrl) || "/";

  if (isAbsoluteUrl(normalizedValue)) {
    return normalizedValue;
  }

  const pathname = normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`;

  return new URL(pathname, env.app.url).toString();
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

export function buildArticleJsonLd({ article } = {}) {
  if (!article?.title || !article?.canonicalUrl) {
    return null;
  }

  return {
    "@context": "https://schema.org",
    "@type": "NewsArticle",
    author: [
      {
        "@type": "Organization",
        name: siteName,
      },
    ],
    dateModified: article.updatedAt || article.publishedAt || undefined,
    datePublished: article.publishedAt || undefined,
    description: article.summary || article.metaDescription || undefined,
    headline: article.title,
    image: article.image?.url ? [buildAbsoluteUrl(article.image.url)] : undefined,
    inLanguage: article.locale || defaultLocale,
    mainEntityOfPage: buildAbsoluteUrl(article.canonicalUrl),
    publisher: {
      "@type": "Organization",
      name: siteName,
      url: buildAbsoluteUrl(buildLocalizedPath(defaultLocale, publicRouteSegments.home)),
    },
    url: buildAbsoluteUrl(article.canonicalUrl),
  };
}
