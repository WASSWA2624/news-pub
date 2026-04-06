import { formatCountryFlagEmoji, formatCountryFlagImageUrl, normalizeCountryCode } from "@/lib/countries";

const representativeCountryByLanguageCode = Object.freeze({
  af: "za",
  am: "et",
  ar: "sa",
  as: "in",
  az: "az",
  be: "by",
  bg: "bg",
  bm: "ml",
  bn: "bd",
  bs: "ba",
  ca: "es",
  ckb: "iq",
  cs: "cz",
  cy: "gb",
  da: "dk",
  de: "de",
  el: "gr",
  en: "gb",
  es: "es",
  et: "ee",
  eu: "es",
  fa: "ir",
  fi: "fi",
  fr: "fr",
  gl: "es",
  gu: "in",
  ha: "ng",
  he: "il",
  hi: "in",
  hr: "hr",
  hu: "hu",
  hy: "am",
  id: "id",
  is: "is",
  it: "it",
  ja: "jp",
  jp: "jp",
  ka: "ge",
  kh: "kh",
  kk: "kz",
  km: "kh",
  kn: "in",
  ko: "kr",
  ku: "iq",
  kz: "kz",
  lb: "lu",
  lt: "lt",
  lv: "lv",
  mi: "nz",
  mk: "mk",
  ml: "in",
  mn: "mn",
  mr: "in",
  ms: "my",
  mt: "mt",
  my: "mm",
  ne: "np",
  nl: "nl",
  no: "no",
  or: "in",
  pa: "in",
  pi: "ph",
  pl: "pl",
  ps: "af",
  pt: "pt",
  ro: "ro",
  ru: "ru",
  rw: "rw",
  sd: "pk",
  se: "se",
  si: "lk",
  sk: "sk",
  sl: "si",
  sm: "ws",
  sn: "zw",
  so: "so",
  sq: "al",
  sr: "rs",
  sv: "se",
  sw: "tz",
  ta: "in",
  te: "in",
  tg: "tj",
  th: "th",
  tk: "tm",
  tr: "tr",
  ud: "pk",
  uk: "ua",
  ur: "pk",
  uz: "uz",
  vi: "vn",
  zh: "cn",
  zht: "tw",
  zu: "za",
});

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

export function normalizeLanguageCode(value) {
  return trimText(value).toLowerCase().replace(/_/g, "-").slice(0, 16);
}

function getLocaleRegionCode(value) {
  const normalizedValue = normalizeLanguageCode(value);
  const segments = normalizedValue.split("-").filter(Boolean);

  if (segments.length < 2) {
    return "";
  }

  const regionCandidate = segments.at(-1);

  return /^[a-z]{2}$/.test(regionCandidate) ? normalizeCountryCode(regionCandidate) : "";
}

export function getRepresentativeCountryCodeForLanguage(value) {
  const normalizedValue = normalizeLanguageCode(value);

  if (!normalizedValue) {
    return "";
  }

  const localeRegionCode = getLocaleRegionCode(normalizedValue);

  if (localeRegionCode) {
    return localeRegionCode;
  }

  return representativeCountryByLanguageCode[normalizedValue]
    || representativeCountryByLanguageCode[normalizedValue.split("-")[0]]
    || "";
}

export function formatLanguageFlagEmoji(value) {
  return formatCountryFlagEmoji(getRepresentativeCountryCodeForLanguage(value));
}

export function formatLanguageFlagImageUrl(value, size = "24x18") {
  return formatCountryFlagImageUrl(getRepresentativeCountryCodeForLanguage(value), size);
}
