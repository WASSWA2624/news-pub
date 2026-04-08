import { createSlug, normalizeDisplayText, normalizeSearchText } from "@/lib/normalization";

export const maxPublicSearchQueryLength = 191;
const maxPublicSearchTerms = 6;

/**
 * Normalizes free-text public search input while preserving shareable route values.
 *
 * The normalization intentionally keeps useful two-character queries such as
 * country codes or short topics like "AI", while treating one-character or
 * punctuation-only inputs as empty discovery states.
 */
export function normalizePublicSearchQuery(value) {
  const collapsed = normalizeDisplayText(
    `${value || ""}`.replace(/["\u201c\u201d]+/g, " "),
  ).slice(0, maxPublicSearchQueryLength);

  if (!collapsed) {
    return "";
  }

  const normalizedSearch = normalizeSearchText(collapsed);
  const terms = normalizedSearch.split(" ").filter(Boolean);

  if (!terms.length) {
    return "";
  }

  if (terms.length === 1 && terms[0].length < 2) {
    return "";
  }

  return collapsed;
}

/** Builds the normalized query context reused by public search UI and ranking helpers. */
export function buildPublicSearchQueryContext(value) {
  const query = normalizePublicSearchQuery(value);
  const rawTerms = [...new Set(normalizeSearchText(query).split(" ").filter(Boolean))].slice(0, maxPublicSearchTerms);
  const compactAcronym = rawTerms.length > 1 && rawTerms.length <= 4 && rawTerms.every((term) => term.length === 1)
    ? rawTerms.join("")
    : "";
  const terms = compactAcronym ? [compactAcronym] : rawTerms;
  const searchText = terms.join(" ");

  return {
    isEmpty: !query,
    query,
    searchText,
    slugText: createSlug(query, "").trim(),
    terms,
  };
}

/** Normalizes record text into accent-stripped lowercase search tokens for ranking. */
export function normalizePublicSearchRankingText(value, { maxLength = 4000 } = {}) {
  return normalizeSearchText(value).slice(0, maxLength);
}
