/**
 * Locale-aware routing helpers for building NewsPub public URLs and path metadata.
 */

import { defaultLocale, isSupportedLocale, supportedLocales } from "@/features/i18n/config";

const localeSegmentPattern = /^[a-z]{2}(?:-[a-z]{2})?$/i;

export const publicRouteSegments = Object.freeze({
  about: Object.freeze(["about"]),
  category: (slug) => ["category", slug],
  disclaimer: Object.freeze(["disclaimer"]),
  home: Object.freeze([]),
  news: Object.freeze(["news"]),
  newsPost: (slug) => ["news", slug],
  privacy: Object.freeze(["privacy"]),
  search: Object.freeze(["search"]),
});

export const publicStaticRoutes = Object.freeze([
  { key: "home", segments: publicRouteSegments.home },
  { key: "about", segments: publicRouteSegments.about },
  { key: "news", segments: publicRouteSegments.news },
  { key: "disclaimer", segments: publicRouteSegments.disclaimer },
  { key: "privacy", segments: publicRouteSegments.privacy },
  { key: "search", segments: publicRouteSegments.search },
]);

export const publicNavigationRoutes = Object.freeze([
  { key: "home", segments: publicRouteSegments.home },
  { key: "news", segments: publicRouteSegments.news },
  { key: "search", segments: publicRouteSegments.search },
  { key: "about", segments: publicRouteSegments.about },
]);

function normalizeLocale(locale) {
  return typeof locale === "string" ? locale.trim().toLowerCase() : "";
}

function normalizeLocaleList(locales = supportedLocales) {
  return [...new Set((locales || []).map((locale) => normalizeLocale(locale)).filter(isSupportedLocale))];
}

function normalizePathname(pathname) {
  if (typeof pathname !== "string") {
    return "/";
  }

  const trimmedPathname = pathname.trim();

  if (!trimmedPathname || trimmedPathname === "/") {
    return "/";
  }

  return trimmedPathname.startsWith("/") ? trimmedPathname : `/${trimmedPathname}`;
}

function normalizeRouteSegments(segments) {
  return segments
    .flat(Infinity)
    .filter((segment) => segment !== null && segment !== undefined && segment !== false)
    .map((segment) => `${segment}`.trim())
    .flatMap((segment) => segment.split("/"))
    .map((segment) => segment.trim())
    .filter(Boolean);
}

function requireSupportedLocale(locale) {
  const normalizedLocale = normalizeLocale(locale);

  if (!isSupportedLocale(normalizedLocale)) {
    throw new Error(`Unsupported locale "${locale}" requested for a public route.`);
  }

  return normalizedLocale;
}

function joinPathSegments(segments) {
  return segments.length ? `/${segments.join("/")}` : "";
}
/**
 * Builds the locale root path for a NewsPub public route.
 */

export function buildLocaleRootPath(locale = defaultLocale) {
  return buildLocalizedPath(locale);
}
/**
 * Builds a locale-prefixed public path for NewsPub.
 */

export function buildLocalizedPath(locale, ...segments) {
  const normalizedLocale = requireSupportedLocale(locale);
  const normalizedSegments = normalizeRouteSegments(segments);

  return `/${normalizedLocale}${joinPathSegments(normalizedSegments)}`;
}
/**
 * Builds the canonical locale-prefixed path for a NewsPub public route.
 */

export function buildCanonicalPath(locale, ...segments) {
  return buildLocalizedPath(locale, ...segments);
}
/**
 * Builds alternate-language links for a NewsPub public route.
 */

export function buildAlternateLanguageLinks(...segments) {
  let options = {};
  let pathSegments = segments;

  const lastArgument = segments[segments.length - 1];

  if (
    lastArgument &&
    typeof lastArgument === "object" &&
    !Array.isArray(lastArgument) &&
    Object.prototype.hasOwnProperty.call(lastArgument, "locales")
  ) {
    options = lastArgument;
    pathSegments = segments.slice(0, -1);
  }

  const normalizedLocales = normalizeLocaleList(options.locales || supportedLocales);

  if (normalizedLocales.length < 2) {
    return undefined;
  }

  const normalizedSegments = normalizeRouteSegments(pathSegments);

  return Object.fromEntries(
    normalizedLocales.map((locale) => [locale, buildLocalizedPath(locale, normalizedSegments)]),
  );
}
/**
 * Builds locale-aware metadata helpers for NewsPub public pages.
 */

export function buildPublicPageMetadata({ description, locale, locales, segments = [], title }) {
  const normalizedLocale = normalizeLocale(locale);

  if (!isSupportedLocale(normalizedLocale)) {
    return {};
  }

  const normalizedSegments = normalizeRouteSegments([segments]);
  const alternateLanguageLinks = buildAlternateLanguageLinks(normalizedSegments, {
    locales,
  });

  return {
    alternates: {
      canonical: buildCanonicalPath(normalizedLocale, normalizedSegments),
      ...(alternateLanguageLinks ? { languages: alternateLanguageLinks } : {}),
    },
    description,
    title,
  };
}
/**
 * Returns the locale prefix metadata parsed from an incoming pathname.
 */

export function getPathLocalePrefix(pathname) {
  const normalizedPathname = normalizePathname(pathname);
  const segments = normalizedPathname.split("/").filter(Boolean);

  if (!segments.length) {
    return {
      kind: "none",
      locale: null,
      rawLocale: null,
      remainingPath: "/",
    };
  }

  const [rawLocale, ...remainingSegments] = segments;

  if (!localeSegmentPattern.test(rawLocale)) {
    return {
      kind: "none",
      locale: null,
      rawLocale: null,
      remainingPath: normalizedPathname,
    };
  }

  const locale = rawLocale.toLowerCase();

  return {
    kind: isSupportedLocale(locale) ? "supported" : "unsupported",
    locale,
    rawLocale,
    remainingPath: remainingSegments.length ? `/${remainingSegments.join("/")}` : "/",
  };
}
