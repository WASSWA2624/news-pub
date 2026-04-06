function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeCountryCode(value) {
  const normalizedValue = trimText(value).toLowerCase();

  if (!normalizedValue || normalizedValue === "all") {
    return "";
  }

  return normalizedValue.slice(0, 8);
}

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

export function formatCountryFlagEmoji(countryCode) {
  const normalizedCountry = normalizeCountryCode(countryCode).toUpperCase();

  if (!/^[A-Z]{2}$/.test(normalizedCountry)) {
    return "";
  }

  return String.fromCodePoint(
    ...normalizedCountry.split("").map((char) => 127397 + char.charCodeAt(0)),
  );
}

export function formatCountryFlagImageUrl(countryCode, size = "24x18") {
  const normalizedCountry = normalizeCountryCode(countryCode);

  if (!/^[a-z]{2}$/.test(normalizedCountry)) {
    return "";
  }

  return `https://flagcdn.com/${size}/${normalizedCountry}.png`;
}
