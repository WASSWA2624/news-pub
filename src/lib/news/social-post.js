import { trimText } from "@/lib/news/shared";

export const socialPostLinkPlacementValues = Object.freeze([
  "RANDOM",
  "BELOW_TITLE",
  "END",
]);

export function normalizeSocialPostLinkPlacement(value) {
  const normalizedValue = trimText(value).toUpperCase();

  return socialPostLinkPlacementValues.includes(normalizedValue) ? normalizedValue : "RANDOM";
}

export function normalizeSocialPostSettings(settings = {}) {
  const resolvedSettings =
    settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  const linkUrl = trimText(resolvedSettings.linkUrl);

  return {
    linkPlacement: normalizeSocialPostLinkPlacement(resolvedSettings.linkPlacement),
    linkUrl: linkUrl || null,
  };
}

export function getStreamSocialPostSettings(stream = {}) {
  return normalizeSocialPostSettings(stream?.settingsJson?.socialPost);
}

export function resolveSocialPostLinkPlacement(value, randomValue = Math.random()) {
  const normalizedValue = normalizeSocialPostLinkPlacement(value);

  if (normalizedValue !== "RANDOM") {
    return normalizedValue;
  }

  return randomValue < 0.5 ? "BELOW_TITLE" : "END";
}
