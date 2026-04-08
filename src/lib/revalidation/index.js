/**
 * Revalidation helpers for NewsPub public routes affected by website publication.
 */

import { revalidatePath } from "next/cache";

import { supportedLocales } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

function normalizeRevalidationLocale(locale) {
  return typeof locale === "string" ? locale.trim().toLowerCase() : "";
}

/**
 * Normalizes one application path before it is passed into NewsPub cache revalidation.
 */
export function normalizeRevalidationPath(path) {
  if (typeof path !== "string") {
    return null;
  }

  const trimmedPath = path.trim();

  if (!trimmedPath) {
    return null;
  }

  if (/^https?:\/\//i.test(trimmedPath)) {
    throw new Error("Revalidation paths must be relative application paths.");
  }

  return trimmedPath.startsWith("/") ? trimmedPath : `/${trimmedPath}`;
}

/**
 * Returns a de-duplicated list of normalized NewsPub revalidation paths.
 */
export function dedupeRevalidationPaths(paths = []) {
  const normalizedPaths = [];
  const seenPaths = new Set();

  for (const path of paths) {
    const normalizedPath = normalizeRevalidationPath(path);

    if (!normalizedPath || seenPaths.has(normalizedPath)) {
      continue;
    }

    seenPaths.add(normalizedPath);
    normalizedPaths.push(normalizedPath);
  }

  return normalizedPaths;
}

function resolveLocales(locales = supportedLocales) {
  const normalizedLocales = [...new Set((locales || []).map(normalizeRevalidationLocale).filter(Boolean))];

  if (!normalizedLocales.length) {
    return supportedLocales;
  }

  return normalizedLocales.filter((locale) => supportedLocales.includes(locale));
}

/**
 * Builds the public routes that must be revalidated after a NewsPub website post changes.
 */
export function buildPublishedPostRevalidationPaths({
  categorySlugs = [],
  locales = supportedLocales,
  slug,
} = {}) {
  const resolvedLocales = resolveLocales(locales);
  const paths = ["/sitemap.xml"];

  for (const locale of resolvedLocales) {
    paths.push(buildLocalizedPath(locale, publicRouteSegments.home));
    paths.push(buildLocalizedPath(locale, publicRouteSegments.news));

    if (slug) {
      paths.push(buildLocalizedPath(locale, publicRouteSegments.newsPost(slug)));
    }

    for (const categorySlug of categorySlugs) {
      if (typeof categorySlug === "string" && categorySlug.trim()) {
        paths.push(buildLocalizedPath(locale, publicRouteSegments.category(categorySlug)));
      }
    }
  }

  return dedupeRevalidationPaths(paths);
}
/**
 * Revalidates each normalized NewsPub path in sequence and returns the final path list.
 */

export async function revalidatePaths(paths, implementation = revalidatePath) {
  const normalizedPaths = dedupeRevalidationPaths(paths);

  for (const path of normalizedPaths) {
    await implementation(path);
  }

  return normalizedPaths;
}

/** Revalidates all story, listing, and category routes affected by a website publication. */
export async function revalidatePublishedPostPaths(post, implementation = revalidatePath) {
  return revalidatePaths(buildPublishedPostRevalidationPaths(post), implementation);
}
