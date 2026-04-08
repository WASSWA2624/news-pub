/**
 * Country lookup metadata used by NewsPub stream filters, provider forms, and public labels.
 */

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}
/**
 * Normalizes a country code into the compact format NewsPub uses internally.
 */

export function normalizeCountryCode(value) {
  const normalizedValue = trimText(value).toLowerCase();

  if (!normalizedValue || normalizedValue === "all") {
    return "";
  }

  return normalizedValue.slice(0, 8);
}
/**
 * Formats a country code into a localized display label.
 */

export function formatCountryLabel(countryCode, locale = "en") {
  const normalizedCountry = normalizeCountryCode(countryCode).toUpperCase();

  if (!normalizedCountry) {
    return "";
  }

  try {
    const regionNames = new Intl.DisplayNames([locale], {
      type: "region",
    });
    const label = regionNames.of(normalizedCountry);

    return label || normalizedCountry;
  } catch {
    return normalizedCountry;
  }
}
/**
 * Formats a country code into its corresponding flag emoji.
 */

export function formatCountryFlagEmoji(countryCode) {
  const normalizedCountry = normalizeCountryCode(countryCode).toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
    return "";
  }

  return String.fromCodePoint(
    ...normalizedCountry.split("").map((char) => 127397 + char.charCodeAt(0)),
  );
}
/**
 * Builds the CDN image URL for a country flag icon.
 */

export function formatCountryFlagImageUrl(countryCode, size = "24x18") {
  const normalizedCountry = normalizeCountryCode(countryCode);

  if (!/^[a-z]{2}$/.test(normalizedCountry)) {
    return "";
  }

  return `https://flagcdn.com/${size}/${normalizedCountry}.png`;
}
