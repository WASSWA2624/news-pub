import { revalidatePath } from "next/cache";

import { supportedLocales } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";

function normalizeRevalidationLocale(locale) {
  return typeof locale === "string" ? locale.trim().toLowerCase() : "";
}

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

export function buildPublishedPostRevalidationPaths({
  categorySlugs = [],
  equipmentSlug,
  manufacturerSlugs = [],
  locales = supportedLocales,
  slug,
} = {}) {
  const resolvedLocales = resolveLocales(locales);
  const paths = ["/sitemap.xml"];

  for (const locale of resolvedLocales) {
    paths.push(buildLocalizedPath(locale, publicRouteSegments.blog));

    if (slug) {
      paths.push(buildLocalizedPath(locale, publicRouteSegments.blogPost(slug)));
    }

    if (equipmentSlug) {
      paths.push(buildLocalizedPath(locale, publicRouteSegments.equipment(equipmentSlug)));
    }

    for (const categorySlug of categorySlugs) {
      if (typeof categorySlug === "string" && categorySlug.trim()) {
        paths.push(buildLocalizedPath(locale, publicRouteSegments.category(categorySlug)));
      }
    }

    for (const manufacturerSlug of manufacturerSlugs) {
      if (typeof manufacturerSlug === "string" && manufacturerSlug.trim()) {
        paths.push(buildLocalizedPath(locale, publicRouteSegments.manufacturer(manufacturerSlug)));
      }
    }
  }

  return dedupeRevalidationPaths(paths);
}

export async function revalidatePaths(paths, implementation = revalidatePath) {
  const normalizedPaths = dedupeRevalidationPaths(paths);

  for (const path of normalizedPaths) {
    await implementation(path);
  }

  return normalizedPaths;
}

export async function revalidatePublishedPostPaths(post, implementation = revalidatePath) {
  return revalidatePaths(buildPublishedPostRevalidationPaths(post), implementation);
}
