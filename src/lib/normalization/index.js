/**
 * Shared normalization helpers used by NewsPub search, slugs, and analytics.
 */
function trimToUndefined(value) {
  if (typeof value !== "string") {
    return undefined;
  }

  const trimmed = value.trim();

  return trimmed ? trimmed : undefined;
}

function collapseWhitespace(value) {
  const trimmed = trimToUndefined(value);

  return trimmed ? trimmed.replace(/\s+/g, " ") : "";
}

function stripAccents(value) {
  return value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "");
}
/**
 * Normalizes text into the search-friendly format used by NewsPub matching.
 */

export function normalizeSearchText(value) {
  const collapsed = collapseWhitespace(value);

  if (!collapsed) {
    return "";
  }

  return stripAccents(collapsed)
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}
/**
 * Creates a URL-safe slug from display text.
 */

export function createSlug(value, fallback = "item") {
  const normalized = normalizeSearchText(value);

  return normalized ? normalized.replace(/\s+/g, "-") : fallback;
}
/**
 * Normalizes display text into a trimmed, whitespace-collapsed string.
 */

export function normalizeDisplayText(value) {
  return collapseWhitespace(value);
}
/**
 * Creates the canonical identity values used by NewsPub records.
 */

export function createCanonicalIdentity(input, fallback = "item") {
  const label = normalizeDisplayText(input);
  const normalizedText = normalizeSearchText(label);

  return {
    label,
    normalizedText,
    slug: createSlug(label, fallback),
  };
}
