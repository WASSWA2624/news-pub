/**
 * Shared social-post normalization helpers for stream-level link placement and
 * optional companion link settings.
 */

import { normalizeDisplayText } from "@/lib/normalization";

export const socialPostLinkPlacementValues = Object.freeze([
  "RANDOM",
  "BELOW_TITLE",
  "END",
]);

/** Normalizes the configured social-post link placement into a supported enum. */
export function normalizeSocialPostLinkPlacement(value) {
  const normalizedValue = normalizeDisplayText(value).toUpperCase();

  return socialPostLinkPlacementValues.includes(normalizedValue) ? normalizedValue : "RANDOM";
}

/** Normalizes the persisted social-post settings block for one stream. */
export function normalizeSocialPostSettings(settings = {}) {
  const resolvedSettings =
    settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  const linkUrl = normalizeDisplayText(resolvedSettings.linkUrl);

  return {
    linkPlacement: normalizeSocialPostLinkPlacement(resolvedSettings.linkPlacement),
    linkUrl: linkUrl || null,
  };
}

/** Returns the normalized social-post settings for one stream record. */
export function getStreamSocialPostSettings(stream = {}) {
  return normalizeSocialPostSettings(stream?.settingsJson?.socialPost);
}

/** Resolves a deterministic placement when the stored value allows random choice. */
export function resolveSocialPostLinkPlacement(value, randomValue = Math.random()) {
  const normalizedValue = normalizeSocialPostLinkPlacement(value);

  if (normalizedValue !== "RANDOM") {
    return normalizedValue;
  }

  return randomValue < 0.5 ? "BELOW_TITLE" : "END";
}
