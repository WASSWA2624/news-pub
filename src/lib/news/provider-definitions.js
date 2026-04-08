/**
 * Shared provider metadata used by the admin UI and provider request builders.
 * Option catalogs and field groupings are aligned with the official provider docs.
 */

import { formatCountryFlagEmoji, formatCountryFlagImageUrl } from "../countries/index.js";
import { formatLanguageFlagEmoji, formatLanguageFlagImageUrl } from "../languages/index.js";

export const MULTI_VALUE_EMPTY_SENTINEL = "__newspub_empty__";

const TITLE_CASE_SMALL_WORDS = new Set(["and", "of", "the"]);

function normalizeText(value) {
  return `${value ?? ""}`.trim();
}

function normalizeKey(value) {
  return normalizeText(value).toLowerCase();
}

function dedupeValues(values = []) {
  return [...new Set((values || []).map((value) => normalizeText(value)).filter(Boolean))];
}

function formatCatalogLabel(label) {
  return normalizeText(label)
    .split(/(\s+|-|\/|\(|\))/)
    .map((token, index) => {
      if (!token.trim() || /^[\s\-\/()]+$/.test(token)) {
        return token;
      }

      if (token.toUpperCase() === token && token.length > 1) {
        return token;
      }

      const lowerToken = token.toLowerCase();

      if (index > 0 && TITLE_CASE_SMALL_WORDS.has(lowerToken)) {
        return lowerToken;
      }

      return lowerToken.charAt(0).toUpperCase() + lowerToken.slice(1);
    })
    .join("");
}

function formatValueLabel(value) {
  return formatCatalogLabel(normalizeKey(value).replace(/[_-]+/g, " "));
}

function createOption(value, label, extra = {}) {
  return {
    label,
    value,
    ...extra,
  };
}

function createCountryOption(value, label, extra = {}) {
  const normalizedValue = normalizeKey(value);

  return createOption(normalizedValue, label, {
    flagEmoji: formatCountryFlagEmoji(normalizedValue),
    flagImageUrl: formatCountryFlagImageUrl(normalizedValue),
    ...extra,
  });
}

function createLanguageOption(value, label, extra = {}) {
  const normalizedValue = normalizeKey(value);

  return createOption(normalizedValue, label, {
    flagEmoji: formatLanguageFlagEmoji(normalizedValue),
    flagImageUrl: formatLanguageFlagImageUrl(normalizedValue),
    ...extra,
  });
}

function buildValueOptions(values = [], labelOverrides = {}) {
  return Object.freeze(
    values.map((value) =>
      createOption(
        normalizeKey(value),
        labelOverrides[normalizeKey(value)] || formatValueLabel(value),
      ),
    ),
  );
}

function buildCountryOptions(rows = []) {
  return Object.freeze(
    rows.map(([code, label]) =>
      createCountryOption(code, formatCatalogLabel(label)),
    ),
  );
}

function buildLanguageOptions(rows = []) {
  return Object.freeze(
    rows.map(([value, label]) =>
      createLanguageOption(value, formatCatalogLabel(label)),
    ),
  );
}

function buildLanguageOptionsFromNewsData(rows = []) {
  return Object.freeze(
    rows.map(([label, value]) =>
      createLanguageOption(value, formatCatalogLabel(label)),
    ),
  );
}

function buildCountrySubset(codes, countryOptions) {
  const optionByValue = new Map(countryOptions.map((option) => [option.value, option]));

  return Object.freeze(
    codes.map((code) => {
      const normalizedCode = normalizeKey(code);

      return optionByValue.get(normalizedCode)
        || createCountryOption(normalizedCode, normalizedCode.toUpperCase());
    }),
  );
}

function buildSingleSelectOptions(items = []) {
  return Object.freeze(items.map((item) => createOption(item.value, item.label, item)));
}

function readSingleValue(values = {}, key) {
  const rawValue = values?.[key];

  if (Array.isArray(rawValue)) {
    return rawValue[0] || "";
  }

  return normalizeText(rawValue);
}

function readMultiValue(values = {}, key) {
  const rawValue = values?.[key];

  if (Array.isArray(rawValue)) {
    return dedupeValues(rawValue);
  }

  return normalizeText(rawValue) ? [normalizeText(rawValue)] : [];
}

/**
 * Resolves the provider endpoint or request shape used for compatibility,
 * capability, and admin metadata checks.
 *
 * @param {string} providerKey - Provider catalog key.
 * @param {object} [values] - Sanitized request values.
 * @returns {string} Endpoint identifier for the provider request shape.
 */
export function getProviderEndpointShape(providerKey, values = {}) {
  const normalizedProviderKey = normalizeKey(providerKey);

  if (normalizedProviderKey === "newsdata") {
    return readSingleValue(values, "endpoint") === "archive" ? "archive" : "latest";
  }

  if (normalizedProviderKey === "newsapi") {
    return readSingleValue(values, "endpoint") === "everything" ? "everything" : "top-headlines";
  }

  return "default";
}

/**
 * Describes the strongest time-boundary behavior the selected provider request
 * shape can support.
 *
 * `direct` means the provider can accept explicit start and end bounds.
 * `relative` means NewsPub can only ask for a broader relative lookback.
 * `local_only` means NewsPub must fetch broadly and enforce the window locally.
 *
 * @param {string} providerKey - Provider catalog key.
 * @param {object} [values] - Sanitized request values.
 * @returns {object} Time-boundary capability metadata.
 */
export function getProviderTimeBoundarySupport(providerKey, values = {}) {
  const normalizedProviderKey = normalizeKey(providerKey);
  const endpoint = getProviderEndpointShape(normalizedProviderKey, values);

  if (normalizedProviderKey === "mediastack") {
    return {
      endKey: "dateTo",
      endpoint,
      mode: "direct",
      precision: "date",
      startKey: "dateFrom",
      summary: "Mediastack accepts explicit start and end dates for shared fetch windows.",
    };
  }

  if (normalizedProviderKey === "newsdata" && endpoint === "archive") {
    return {
      endKey: "toDate",
      endpoint,
      mode: "direct",
      precision: "date",
      startKey: "fromDate",
      summary: "NewsData Archive supports explicit historical start and end dates.",
    };
  }

  if (normalizedProviderKey === "newsdata" && endpoint === "latest") {
    return {
      endpoint,
      mode: "relative",
      precision: "hours",
      timeframeKey: "timeframe",
      summary:
        "NewsData Latest only supports relative lookback windows, so NewsPub widens the upstream request and enforces exact bounds locally.",
    };
  }

  if (normalizedProviderKey === "newsapi" && endpoint === "everything") {
    return {
      endKey: "toDate",
      endpoint,
      mode: "direct",
      precision: "datetime",
      startKey: "fromDate",
      summary: "NewsAPI Everything supports explicit datetime start and end bounds.",
    };
  }

  if (normalizedProviderKey === "newsapi" && endpoint === "top-headlines") {
    return {
      endpoint,
      mode: "local_only",
      precision: "datetime",
      summary:
        "NewsAPI Top Headlines does not support explicit historical bounds, so NewsPub applies time filtering locally after fetching.",
    };
  }

  return {
    endpoint,
    mode: "local_only",
    precision: "datetime",
    summary: "This provider request shape does not expose direct time-boundary controls.",
  };
}

/**
 * Returns the provider-specific start and end field keys that map the normalized NewsPub fetch window upstream.
 */
export function getProviderDateWindowConfig(providerKey, values = {}) {
  const timeBoundarySupport = getProviderTimeBoundarySupport(providerKey, values);

  if (timeBoundarySupport.mode === "direct") {
    return {
      endKey: timeBoundarySupport.endKey,
      precision: timeBoundarySupport.precision,
      startKey: timeBoundarySupport.startKey,
    };
  }

  return null;
}

const NEWSDATA_LANGUAGE_ROWS = Object.freeze([
  ["Afrikaans", "af"],
  ["Albanian", "sq"],
  ["Amharic", "am"],
  ["Arabic", "ar"],
  ["Armenian", "hy"],
  ["Assamese", "as"],
  ["Azerbaijani", "az"],
  ["Bambara", "bm"],
  ["Basque", "eu"],
  ["Belarusian", "be"],
  ["Bengali", "bn"],
  ["Bosnian", "bs"],
  ["Bulgarian", "bg"],
  ["Burmese", "my"],
  ["Catalan", "ca"],
  ["Central Kurdish", "ckb"],
  ["Chinese", "zh"],
  ["Croatian", "hr"],
  ["Czech", "cs"],
  ["Danish", "da"],
  ["Dutch", "nl"],
  ["English", "en"],
  ["Estonian", "et"],
  ["Filipino", "pi"],
  ["Finnish", "fi"],
  ["French", "fr"],
  ["Galician", "gl"],
  ["Georgian", "ka"],
  ["German", "de"],
  ["Greek", "el"],
  ["Gujarati", "gu"],
  ["Hausa", "ha"],
  ["Hebrew", "he"],
  ["Hindi", "hi"],
  ["Hungarian", "hu"],
  ["Icelandic", "is"],
  ["Indonesian", "id"],
  ["Italian", "it"],
  ["Japanese", "jp"],
  ["Kannada", "kn"],
  ["Kazakh", "kz"],
  ["Khmer", "kh"],
  ["Kinyarwanda", "rw"],
  ["Korean", "ko"],
  ["Kurdish", "ku"],
  ["Latvian", "lv"],
  ["Lithuanian", "lt"],
  ["Luxembourgish", "lb"],
  ["Macedonian", "mk"],
  ["Malay", "ms"],
  ["Malayalam", "ml"],
  ["Maltese", "mt"],
  ["Maori", "mi"],
  ["Marathi", "mr"],
  ["Mongolian", "mn"],
  ["Nepali", "ne"],
  ["Norwegian", "no"],
  ["Oriya", "or"],
  ["Pashto", "ps"],
  ["Persian", "fa"],
  ["Polish", "pl"],
  ["Portuguese", "pt"],
  ["Punjabi", "pa"],
  ["Romanian", "ro"],
  ["Russian", "ru"],
  ["Samoan", "sm"],
  ["Serbian", "sr"],
  ["Shona", "sn"],
  ["Sindhi", "sd"],
  ["Sinhala", "si"],
  ["Slovak", "sk"],
  ["Slovenian", "sl"],
  ["Somali", "so"],
  ["Spanish", "es"],
  ["Swahili", "sw"],
  ["Swedish", "sv"],
  ["Tajik", "tg"],
  ["Tamil", "ta"],
  ["Telugu", "te"],
  ["Thai", "th"],
  ["Traditional Chinese", "zht"],
  ["Turkish", "tr"],
  ["Turkmen", "tk"],
  ["Ukrainian", "uk"],
  ["Urdu", "ur"],
  ["Uzbek", "uz"],
  ["Vietnamese", "vi"],
  ["Welsh", "cy"],
  ["Zulu", "zu"],
]);

const NEWSDATA_COUNTRY_ROWS = Object.freeze([
  ["US", "united states of america"],
  ["IN", "india"],
  ["ES", "spain"],
  ["GB", "united kingdom"],
  ["IT", "italy"],
  ["DE", "germany"],
  ["CA", "canada"],
  ["FR", "france"],
  ["MX", "mexico"],
  ["AU", "australia"],
  ["BR", "brazil"],
  ["TR", "turkey"],
  ["RU", "russia"],
  ["AR", "argentina"],
  ["GR", "greece"],
  ["PK", "pakistan"],
  ["PT", "portugal"],
  ["PL", "poland"],
  ["NG", "nigeria"],
  ["NL", "netherland"],
  ["JP", "japan"],
  ["KR", "south korea"],
  ["VE", "venezuela"],
  ["CL", "chile"],
  ["CN", "china"],
  ["ID", "indonesia"],
  ["PH", "philippines"],
  ["SE", "sweden"],
  ["BE", "belgium"],
  ["FI", "finland"],
  ["CH", "switzerland"],
  ["CO", "colombia"],
  ["IE", "ireland"],
  ["RS", "serbia"],
  ["EG", "egypt"],
  ["SA", "saudi arabia"],
  ["AE", "united arab emirates"],
  ["RO", "romania"],
  ["CZ", "czech republic"],
  ["HR", "Croatia"],
  ["ZA", "south africa"],
  ["IR", "Iran"],
  ["IL", "israel"],
  ["AL", "Albania"],
  ["SK", "slovakia"],
  ["PE", "peru"],
  ["HU", "hungary"],
  ["BA", "Bosnia And Herzegovina"],
  ["UA", "ukraine"],
  ["SG", "singapore"],
  ["CY", "cyprus"],
  ["AT", "austria"],
  ["TH", "thailand"],
  ["BG", "bulgaria"],
  ["DK", "denmark"],
  ["NO", "norway"],
  ["MA", "morocco"],
  ["MK", "Macedonia"],
  ["DO", "dominican republic"],
  ["LT", "lithuania"],
  ["LV", "latvia"],
  ["BD", "bangladesh"],
  ["HK", "hong kong"],
  ["AD", "Andorra"],
  ["SI", "slovenia"],
  ["MY", "malaysia"],
  ["KH", "Cambodia"],
  ["LU", "Luxembourg"],
  ["ME", "Montenegro"],
  ["MD", "Moldova"],
  ["BY", "belarus"],
  ["VI", "Vietnam"],
  ["SM", "San Marino"],
  ["IS", "Iceland"],
  ["ZW", "Zimbabwe"],
  ["EE", "estonia"],
  ["DZ", "algeria"],
  ["MC", "Monaco"],
  ["EC", "ecuador"],
  ["MT", "Malta"],
  ["SY", "Syria"],
  ["TW", "taiwan"],
  ["CR", "costa Rica"],
  ["XK", "Kosovo"],
  ["YE", "Yemen"],
  ["LI", "Liechtenstein"],
  ["VA", "Vatican"],
  ["CU", "cuba"],
  ["JO", "jordan"],
  ["IQ", "iraq"],
  ["HN", "honduras"],
  ["ET", "ethiopia"],
  ["LY", "Libya"],
  ["PR", "puerto rico"],
  ["MR", "Mauritania"],
  ["LB", "lebanon"],
  ["AF", "Afghanistan"],
  ["MM", "myanmar"],
  ["LK", "Sri Lanka"],
  ["NZ", "new zealand"],
  ["KE", "kenya"],
  ["TN", "Tunisia"],
  ["UY", "Uruguay"],
  ["BH", "Bahrain"],
  ["BO", "bolivia"],
  ["KW", "kuwait"],
  ["QA", "Qatar"],
  ["BN", "Brunei"],
  ["GE", "Georgia"],
  ["GH", "ghana"],
  ["OM", "Oman"],
  ["SN", "senegal"],
  ["AM", "Armenia"],
  ["GN", "Guinea"],
  ["TJ", "Tajikistan"],
  ["MO", "Macau"],
  ["SO", "somalia"],
  ["SD", "sudan"],
  ["NP", "Nepal"],
  ["GA", "Gabon"],
  ["PY", "paraguay"],
  ["UG", "uganda"],
  ["TG", "Togo"],
  ["GT", "Guatemala"],
  ["NA", "Namibia"],
  ["KZ", "kazakhstan"],
  ["ZM", "zambia"],
  ["CD", "DR Congo"],
  ["AO", "angola"],
  ["DJ", "Djibouti"],
  ["AZ", "azerbaijan"],
  ["SV", "El Salvador"],
  ["MW", "malawi"],
  ["MZ", "mozambique"],
  ["CM", "cameroon"],
  ["UZ", "Uzbekistan"],
  ["TZ", "tanzania"],
  ["BF", "burkina fasco"],
  ["BZ", "Belize"],
  ["CI", "Ivory Coast"],
  ["TD", "Chad"],
  ["PA", "Panama"],
  ["RW", "Rwanda"],
  ["BT", "Bhutan"],
  ["MV", "Maldives"],
  ["JM", "Jamaica"],
  ["KG", "Kyrgyzstan"],
  ["MG", "madagascar"],
  ["LR", "Liberia"],
  ["MN", "Mongolia"],
  ["WO", "World"],
  ["KP", "north korea"],
  ["TM", "Turkmenistan"],
  ["NE", "Niger"],
  ["ML", "mali"],
  ["GY", "Guyana"],
  ["NI", "Nicaragua"],
  ["BW", "Botswana"],
  ["PS", "palestine"],
  ["CV", "Cape Verde"],
  ["BJ", "Benin"],
  ["ER", "Eritrea"],
  ["BI", "Burundi"],
  ["FJ", "Fiji"],
  ["MU", "Mauritius"],
  ["GM", "Gambia"],
  ["SL", "Sierra Leone"],
  ["CG", "Congo"],
  ["LS", "Lesotho"],
  ["CF", "Central African Republic"],
  ["GQ", "Equatorial Guinea"],
  ["SC", "Seychelles"],
  ["GD", "Grenada"],
  ["WS", "Samoa"],
  ["KM", "Comoros"],
  ["BS", "Bahamas"],
  ["LA", "Laos"],
  ["TL", "Timor-Leste"],
  ["TT", "trinidad and tobago"],
  ["HT", "Haiti"],
  ["BB", "Barbados"],
  ["ST", "sao tome and principe"],
  ["SX", "saint martin(dutch)"],
  ["KY", "Cayman Islands"],
  ["SR", "Suriname"],
  ["DM", "Dominica"],
  ["PG", "Papua New Guinea"],
  ["SB", "Solomon Islands"],
  ["LC", "saint lucia"],
  ["NC", "new caledonia"],
  ["TO", "Tonga"],
  ["VU", "Vanuatu"],
  ["JE", "Jersey"],
  ["BM", "Bermuda"],
  ["CW", "curaçao"],
  ["VG", "Virgin Islands (British)"],
  ["KI", "Kiribati"],
  ["MH", "Marshall Islands"],
  ["FM", "Micronesia"],
  ["NR", "Nauru"],
  ["PW", "Palau"],
  ["TV", "Tuvalu"],
  ["GI", "gibraltar"],
  ["SZ", "Eswatini"],
  ["PF", "french polynesia"],
  ["CK", "cook islands"],
]);

const NEWSDATA_CATEGORY_VALUES = Object.freeze([
  "breaking",
  "business",
  "crime",
  "domestic",
  "education",
  "entertainment",
  "environment",
  "food",
  "health",
  "lifestyle",
  "politics",
  "science",
  "sports",
  "technology",
  "top",
  "tourism",
  "world",
  "other",
]);

const MEDIASTACK_COUNTRY_CODES = Object.freeze([
  "ar",
  "au",
  "at",
  "be",
  "br",
  "bg",
  "ca",
  "cn",
  "co",
  "cz",
  "eg",
  "fr",
  "de",
  "gr",
  "hk",
  "hu",
  "in",
  "id",
  "ie",
  "il",
  "it",
  "jp",
  "lv",
  "lt",
  "my",
  "mx",
  "ma",
  "nl",
  "nz",
  "ng",
  "no",
  "ph",
  "pl",
  "pt",
  "ro",
  "sa",
  "rs",
  "sg",
  "sk",
  "si",
  "za",
  "kr",
  "se",
  "ch",
  "tw",
  "th",
  "tr",
  "ae",
  "ua",
  "gb",
  "us",
  "ve",
]);

const NEWSAPI_COUNTRY_CODES = Object.freeze([
  "ae",
  "ar",
  "at",
  "au",
  "be",
  "bg",
  "br",
  "ca",
  "ch",
  "cn",
  "co",
  "cu",
  "cz",
  "de",
  "eg",
  "fr",
  "gb",
  "gr",
  "hk",
  "hu",
  "id",
  "ie",
  "il",
  "in",
  "it",
  "jp",
  "kr",
  "lt",
  "lv",
  "ma",
  "mx",
  "my",
  "ng",
  "nl",
  "no",
  "nz",
  "ph",
  "pl",
  "pt",
  "ro",
  "rs",
  "ru",
  "sa",
  "se",
  "sg",
  "si",
  "sk",
  "th",
  "tr",
  "tw",
  "ua",
  "us",
  "ve",
  "za",
]);

const MEDIASTACK_LANGUAGE_ROWS = Object.freeze([
  ["ar", "Arabic"],
  ["de", "German"],
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["he", "Hebrew"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["no", "Norwegian"],
  ["pt", "Portuguese"],
  ["ru", "Russian"],
  ["se", "Swedish"],
  ["zh", "Chinese"],
]);

const NEWSAPI_LANGUAGE_ROWS = Object.freeze([
  ["ar", "Arabic"],
  ["de", "German"],
  ["en", "English"],
  ["es", "Spanish"],
  ["fr", "French"],
  ["he", "Hebrew"],
  ["it", "Italian"],
  ["nl", "Dutch"],
  ["no", "Norwegian"],
  ["pt", "Portuguese"],
  ["ru", "Russian"],
  ["sv", "Swedish"],
  ["ud", "Urdu"],
  ["zh", "Chinese"],
]);

const MEDIASTACK_CATEGORY_VALUES = Object.freeze([
  "general",
  "business",
  "entertainment",
  "health",
  "science",
  "sports",
  "technology",
]);

const NEWSAPI_CATEGORY_VALUES = Object.freeze([
  "business",
  "entertainment",
  "general",
  "health",
  "science",
  "sports",
  "technology",
]);

const NEWSDATA_DATATYPE_VALUES = Object.freeze([
  "news",
  "blog",
  "multimedia",
  "forum",
  "press_release",
  "review",
  "research",
  "opinion",
  "analysis",
  "podcast",
]);

const NEWSDATA_PRIORITY_DOMAIN_VALUES = Object.freeze(["top", "medium", "low"]);
const NEWSDATA_SENTIMENT_VALUES = Object.freeze(["positive", "neutral", "negative"]);
const NEWSAPI_SEARCH_IN_VALUES = Object.freeze(["title", "description", "content"]);

const NEWSDATA_COUNTRY_OPTIONS = buildCountryOptions(NEWSDATA_COUNTRY_ROWS);
const NEWSDATA_LANGUAGE_OPTIONS = buildLanguageOptionsFromNewsData(NEWSDATA_LANGUAGE_ROWS);
const MEDIASTACK_COUNTRY_OPTIONS = buildCountrySubset(MEDIASTACK_COUNTRY_CODES, NEWSDATA_COUNTRY_OPTIONS);
const NEWSAPI_COUNTRY_OPTIONS = buildCountrySubset(NEWSAPI_COUNTRY_CODES, NEWSDATA_COUNTRY_OPTIONS);
const MEDIASTACK_LANGUAGE_OPTIONS = buildLanguageOptions(MEDIASTACK_LANGUAGE_ROWS);
const NEWSAPI_LANGUAGE_OPTIONS = buildLanguageOptions(NEWSAPI_LANGUAGE_ROWS);
const NEWSDATA_CATEGORY_OPTIONS = buildValueOptions(NEWSDATA_CATEGORY_VALUES);
const MEDIASTACK_CATEGORY_OPTIONS = buildValueOptions(MEDIASTACK_CATEGORY_VALUES);
const NEWSAPI_CATEGORY_OPTIONS = buildValueOptions(NEWSAPI_CATEGORY_VALUES);
const NEWSDATA_DATATYPE_OPTIONS = buildValueOptions(NEWSDATA_DATATYPE_VALUES, {
  press_release: "Press Release",
});
const NEWSDATA_SENTIMENT_OPTIONS = buildValueOptions(NEWSDATA_SENTIMENT_VALUES);
const NEWSAPI_SEARCH_IN_OPTIONS = buildValueOptions(NEWSAPI_SEARCH_IN_VALUES);

const MEDIASTACK_SORT_OPTIONS = buildSingleSelectOptions([
  {
    description: "Newest articles first.",
    label: "Published Desc",
    value: "published_desc",
  },
  {
    description: "Oldest articles first.",
    label: "Published Asc",
    value: "published_asc",
  },
  {
    description: "Most popular sources first.",
    label: "Popularity",
    value: "popularity",
  },
]);

const NEWSDATA_SORT_OPTIONS = buildSingleSelectOptions([
  {
    description: "Use the endpoint default ordering from the NewsData docs.",
    label: "Published Desc",
    value: "",
  },
  {
    description: "Oldest articles first.",
    label: "Published Asc",
    value: "pubdateasc",
  },
  {
    description: "Most relevant matches first.",
    label: "Relevancy",
    value: "relevancy",
  },
  {
    description: "Highest-priority sources first.",
    label: "Source Priority",
    value: "source",
  },
  {
    description: "Most recently fetched by NewsData.",
    label: "Fetched At",
    value: "fetched_at",
  },
]);

const NEWSAPI_SORT_OPTIONS = buildSingleSelectOptions([
  {
    description: "Articles closest to the search query come first.",
    label: "Relevancy",
    value: "relevancy",
  },
  {
    description: "Popular publishers first.",
    label: "Popularity",
    value: "popularity",
  },
  {
    description: "Newest articles first.",
    label: "Published At",
    value: "publishedAt",
  },
]);

const NEWSDATA_ENDPOINT_OPTIONS = buildSingleSelectOptions([
  {
    description:
      "Latest and breaking news from the past 48 hours with relative lookback support only. NewsPub widens the upstream request safely and filters exact windows locally.",
    label: "Latest News",
    value: "latest",
  },
  {
    description: "Historical archive search with explicit start and end date support. Paid plans only.",
    label: "News Archive",
    value: "archive",
  },
]);

const NEWSAPI_ENDPOINT_OPTIONS = buildSingleSelectOptions([
  {
    description:
      "Curated top headlines by country or category. NewsPub applies exact time windows locally because this endpoint does not expose explicit historical bounds.",
    label: "Top Headlines",
    value: "top-headlines",
  },
  {
    description: "Broader article discovery and analysis with explicit datetime start and end support.",
    label: "Everything",
    value: "everything",
  },
]);

const NEWSDATA_PRIORITY_DOMAIN_OPTIONS = buildSingleSelectOptions([
  {
    description: "Do not narrow by source-priority band.",
    label: "Any Priority",
    value: "",
  },
  {
    description: "Top 10% of news domains.",
    label: "Top",
    value: "top",
  },
  {
    description: "Top 30% of news domains.",
    label: "Medium",
    value: "medium",
  },
  {
    description: "Top 50% of news domains.",
    label: "Low",
    value: "low",
  },
]);

const NEWSDATA_TIMEFRAME_OPTIONS = buildSingleSelectOptions([
  { label: "No timeframe override", value: "" },
  { label: "15 minutes", value: "15m" },
  { label: "30 minutes", value: "30m" },
  { label: "1 hour", value: "1" },
  { label: "6 hours", value: "6" },
  { label: "12 hours", value: "12" },
  { label: "24 hours", value: "24" },
  { label: "48 hours", value: "48" },
]);

const NEWSDATA_BOOLEAN_FILTER_OPTIONS = buildSingleSelectOptions([
  {
    description: "Do not add this provider-side filter.",
    label: "Any",
    value: "",
  },
  {
    description: "Only return articles where this field is present.",
    label: "Required",
    value: "1",
  },
  {
    description: "Only return articles where this field is absent.",
    label: "Excluded",
    value: "0",
  },
]);

const providerDefinitionMap = Object.freeze({
  mediastack: {
    defaultRequestDefaults: {
      countries: ["us"],
      languages: ["en"],
      sort: "published_desc",
    },
    docsUrl: "https://mediastack.com/documentation",
    key: "mediastack",
    label: "Mediastack",
    sections: [
      {
        description: "Official Mediastack filters for live and historical article requests.",
        key: "request",
        title: "Request Filters",
      },
    ],
    fields: [
      {
        description: "Include supported countries.",
        input: "checkboxes",
        key: "countries",
        label: "Countries",
        options: MEDIASTACK_COUNTRY_OPTIONS,
        scopes: ["provider"],
        section: "request",
      },
      {
        description: "Exclude supported countries with a prefixed minus under the hood.",
        input: "checkboxes",
        key: "excludeCountries",
        label: "Exclude Countries",
        options: MEDIASTACK_COUNTRY_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Use one language or combine several.",
        input: "checkboxes",
        key: "languages",
        label: "Languages",
        options: MEDIASTACK_LANGUAGE_OPTIONS,
        scopes: ["provider"],
        section: "request",
      },
      {
        description: "Exclude supported languages.",
        input: "checkboxes",
        key: "excludeLanguages",
        label: "Exclude Languages",
        options: MEDIASTACK_LANGUAGE_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Include official provider-side categories.",
        input: "checkboxes",
        key: "categories",
        label: "Provider Categories",
        options: MEDIASTACK_CATEGORY_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Exclude official provider-side categories.",
        input: "checkboxes",
        key: "excludeCategories",
        label: "Exclude Categories",
        options: MEDIASTACK_CATEGORY_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Choose the result ordering documented by Mediastack.",
        input: "single-select",
        key: "sort",
        label: "Sort Order",
        options: MEDIASTACK_SORT_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Provider keyword search string. Mediastack supports include and exclude keywords in the same value.",
        input: "text",
        key: "keywords",
        label: "Keywords",
        placeholder: "food industry, -meat",
        scopes: ["stream"],
        section: "request",
      },
      {
        description:
          "Optional lower bound shown in the editor. Automatic runs resolve to NewsPub's normalized previous-24-hours-plus-next-30-minutes window or reuse the checkpoint start when available, while explicit manual or batched runs can provide a bounded start date.",
        input: "date",
        key: "dateFrom",
        label: "Date From",
        precision: "date",
        scopes: ["stream"],
        section: "request",
      },
      {
        description:
          "Optional upper bound shown in the editor. Automatic runs resolve to NewsPub's normalized previous-24-hours-plus-next-30-minutes window or reuse the checkpoint start when available, while explicit manual or batched runs can provide a bounded end date.",
        input: "date",
        key: "dateTo",
        label: "Date To",
        precision: "date",
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Stream-side language allowlist applied both locally and, where possible, upstream.",
        input: "checkboxes",
        key: "languageAllowlistJson",
        label: "Stream Languages",
        options: MEDIASTACK_LANGUAGE_OPTIONS,
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Stream-side country allowlist applied both locally and, where possible, upstream.",
        input: "checkboxes",
        key: "countryAllowlistJson",
        label: "Stream Countries",
        options: MEDIASTACK_COUNTRY_OPTIONS,
        scopes: ["stream"],
        section: "request",
      },
    ],
  },
  newsdata: {
    defaultRequestDefaults: {
      category: ["top"],
      country: ["us"],
      endpoint: "latest",
      language: ["en"],
      sort: "",
    },
    docsUrl: "https://newsdata.io/documentation",
    key: "newsdata",
    label: "NewsData",
    sections: [
      {
        description: "Choose the NewsData endpoint and its official request filters.",
        key: "endpoint",
        title: "Endpoint",
      },
      {
        description: "Documented discovery filters that narrow which articles NewsData returns.",
        key: "request",
        title: "Request Filters",
      },
      {
        description: "Optional advanced fields from the official NewsData docs.",
        key: "advanced",
        title: "Advanced Filters",
      },
    ],
    fields: [
      {
        description:
          "Latest covers the past 48 hours with relative lookback only, so NewsPub maps its normalized previous-24-hours-plus-next-30-minutes window to the broadest safe upstream lookback and filters exact bounds locally. Archive is for paid historical access with explicit start and end boundaries.",
        input: "single-select",
        key: "endpoint",
        label: "Endpoint",
        options: NEWSDATA_ENDPOINT_OPTIONS,
        scopes: ["provider", "stream"],
        section: "endpoint",
      },
      {
        description: "Free-text NewsData `q` search.",
        input: "text",
        key: "q",
        label: "Keyword Query",
        placeholder: "elections OR budget",
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Restrict the query to titles only.",
        input: "text",
        key: "qInTitle",
        label: "Query In Title",
        placeholder: "breaking news",
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Restrict the query to title, URL, and meta fields.",
        input: "text",
        key: "qInMeta",
        label: "Query In Meta",
        placeholder: "policy reform",
        scopes: ["stream"],
        section: "request",
      },
      {
        description:
          "Available only on the Latest endpoint. NewsPub widens this safely when a batch or explicit window needs a broader upstream request.",
        input: "single-select",
        key: "timeframe",
        label: "Timeframe",
        options: NEWSDATA_TIMEFRAME_OPTIONS,
        scopes: ["stream"],
        section: "endpoint",
        when: (values) => readSingleValue(values, "endpoint") !== "archive",
      },
      {
        description:
          "Archive date lower bound. Automatic runs resolve to NewsPub's normalized previous-24-hours-plus-next-30-minutes window or reuse the checkpoint start when available, while explicit manual or batched runs can provide a bounded start date.",
        input: "date",
        key: "fromDate",
        label: "From Date",
        precision: "date",
        scopes: ["stream"],
        section: "endpoint",
        when: (values) => readSingleValue(values, "endpoint") === "archive",
      },
      {
        description:
          "Archive date upper bound. Automatic runs resolve to NewsPub's normalized previous-24-hours-plus-next-30-minutes window or reuse the checkpoint start when available, while explicit manual or batched runs can provide a bounded end date.",
        input: "date",
        key: "toDate",
        label: "To Date",
        precision: "date",
        scopes: ["stream"],
        section: "endpoint",
        when: (values) => readSingleValue(values, "endpoint") === "archive",
      },
      {
        description: "Default endpoint languages at the provider level.",
        input: "checkboxes",
        key: "language",
        label: "Languages",
        options: NEWSDATA_LANGUAGE_OPTIONS,
        scopes: ["provider"],
        section: "request",
      },
      {
        description: "Stream-side language allowlist applied both locally and, where possible, upstream.",
        input: "checkboxes",
        key: "languageAllowlistJson",
        label: "Stream Languages",
        options: NEWSDATA_LANGUAGE_OPTIONS,
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Exclude NewsData languages.",
        input: "checkboxes",
        key: "excludeLanguages",
        label: "Exclude Languages",
        options: NEWSDATA_LANGUAGE_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Provider-level default countries.",
        input: "checkboxes",
        key: "country",
        label: "Countries",
        options: NEWSDATA_COUNTRY_OPTIONS,
        scopes: ["provider"],
        section: "request",
      },
      {
        description: "Stream-side country allowlist applied both locally and, where possible, upstream.",
        input: "checkboxes",
        key: "countryAllowlistJson",
        label: "Stream Countries",
        options: NEWSDATA_COUNTRY_OPTIONS,
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Exclude NewsData countries.",
        input: "checkboxes",
        key: "excludeCountries",
        label: "Exclude Countries",
        options: NEWSDATA_COUNTRY_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Provider-side NewsData categories.",
        input: "checkboxes",
        key: "category",
        label: "Categories",
        options: NEWSDATA_CATEGORY_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Exclude NewsData categories.",
        input: "checkboxes",
        key: "excludeCategories",
        label: "Exclude Categories",
        options: NEWSDATA_CATEGORY_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "NewsData sort modes from the official docs.",
        input: "single-select",
        key: "sort",
        label: "Sort Order",
        options: NEWSDATA_SORT_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
      },
      {
        description: "Official NewsData article types.",
        input: "checkboxes",
        key: "datatype",
        label: "Datatypes",
        options: NEWSDATA_DATATYPE_OPTIONS,
        scopes: ["provider", "stream"],
        section: "advanced",
      },
      {
        description: "Restrict to a source-priority band from the NewsData docs.",
        input: "single-select",
        key: "prioritydomain",
        label: "Priority Domain",
        options: NEWSDATA_PRIORITY_DOMAIN_OPTIONS,
        scopes: ["provider", "stream"],
        section: "advanced",
      },
      {
        description: "Search by creator name.",
        input: "text",
        key: "creator",
        label: "Creator",
        placeholder: "Newsroom name",
        scopes: ["stream"],
        section: "advanced",
      },
      {
        description: "Restrict to known source IDs such as `bbc` or `nytimes`.",
        input: "text",
        key: "domain",
        label: "Source IDs",
        placeholder: "bbc,nytimes",
        scopes: ["stream"],
        section: "advanced",
      },
      {
        description: "Restrict to specific source domains.",
        input: "text",
        key: "domainurl",
        label: "Source Domains",
        placeholder: "bbc.com,nytimes.com",
        scopes: ["stream"],
        section: "advanced",
      },
      {
        description: "Remove domains from the result set.",
        input: "text",
        key: "excludeDomains",
        label: "Exclude Domains",
        placeholder: "example.com",
        scopes: ["stream"],
        section: "advanced",
      },
      {
        description: "Only return articles matching a specific URL.",
        input: "text",
        key: "url",
        label: "Exact URL",
        placeholder: "https://example.com/story",
        scopes: ["stream"],
        section: "advanced",
      },
      {
        description: "Filter by documented NewsData sentiment when available.",
        input: "single-select",
        key: "sentiment",
        label: "Sentiment",
        options: buildSingleSelectOptions([
          { label: "Any sentiment", value: "" },
          ...NEWSDATA_SENTIMENT_OPTIONS,
        ]),
        scopes: ["stream"],
        section: "advanced",
      },
      {
        description: "Require or exclude full article content.",
        input: "single-select",
        key: "fullContent",
        label: "Full Content",
        options: NEWSDATA_BOOLEAN_FILTER_OPTIONS,
        scopes: ["provider", "stream"],
        section: "advanced",
      },
      {
        description: "Require or exclude featured images.",
        input: "single-select",
        key: "image",
        label: "Images",
        options: NEWSDATA_BOOLEAN_FILTER_OPTIONS,
        scopes: ["provider", "stream"],
        section: "advanced",
      },
      {
        description: "Require or exclude videos.",
        input: "single-select",
        key: "video",
        label: "Videos",
        options: NEWSDATA_BOOLEAN_FILTER_OPTIONS,
        scopes: ["provider", "stream"],
        section: "advanced",
      },
      {
        description: "Use NewsData's duplicate-removal flag.",
        input: "single-select",
        key: "removeDuplicate",
        label: "Remove Duplicates",
        options: buildSingleSelectOptions([
          {
            description: "Keep duplicates in the response.",
            label: "Off",
            value: "",
          },
          {
            description: "Ask NewsData to suppress duplicates.",
            label: "On",
            value: "1",
          },
        ]),
        scopes: ["provider", "stream"],
        section: "advanced",
      },
    ],
  },
  newsapi: {
    defaultRequestDefaults: {
      category: "general",
      country: "",
      endpoint: "top-headlines",
    },
    docsUrl: "https://newsapi.org/docs",
    key: "newsapi",
    label: "NewsAPI",
    sections: [
      {
        description: "Pick the NewsAPI endpoint and its compatible request filters.",
        key: "endpoint",
        title: "Endpoint",
      },
      {
        description: "Official NewsAPI filters for the selected endpoint.",
        key: "request",
        title: "Request Filters",
      },
    ],
    fields: [
      {
        description:
          "Top Headlines and Everything expose different filters and different time-boundary behavior in the NewsAPI docs.",
        input: "single-select",
        key: "endpoint",
        label: "Endpoint",
        options: NEWSAPI_ENDPOINT_OPTIONS,
        scopes: ["provider", "stream"],
        section: "endpoint",
      },
      {
        description: "Keyword query for both Top Headlines and Everything.",
        input: "text",
        key: "q",
        label: "Keyword Query",
        placeholder: "climate policy",
        scopes: ["stream"],
        section: "request",
      },
      {
        description: "Everything endpoint provider-level language default.",
        input: "single-select",
        key: "language",
        label: "Default Language",
        options: buildSingleSelectOptions([
          { description: "Return all supported languages.", label: "Any Language", value: "" },
          ...NEWSAPI_LANGUAGE_OPTIONS,
        ]),
        scopes: ["provider"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description: "Everything endpoint stream language filter.",
        input: "single-select",
        key: "languageAllowlistJson",
        label: "Language",
        options: buildSingleSelectOptions([
          { description: "Return all supported languages.", label: "Any Language", value: "" },
          ...NEWSAPI_LANGUAGE_OPTIONS,
        ]),
        scopes: ["stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description: "Top Headlines provider-level default country.",
        input: "single-select",
        key: "country",
        label: "Default Country",
        options: buildSingleSelectOptions([
          { description: "Return all supported countries.", label: "Any Country", value: "" },
          ...NEWSAPI_COUNTRY_OPTIONS,
        ]),
        scopes: ["provider"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "top-headlines",
      },
      {
        description: "Top Headlines country filter.",
        input: "single-select",
        key: "countryAllowlistJson",
        label: "Country",
        options: buildSingleSelectOptions([
          { description: "Return all supported countries.", label: "Any Country", value: "" },
          ...NEWSAPI_COUNTRY_OPTIONS,
        ]),
        scopes: ["stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "top-headlines",
      },
      {
        description: "Top Headlines category.",
        input: "single-select",
        key: "category",
        label: "Category",
        options: buildSingleSelectOptions([
          { description: "Do not narrow by category.", label: "Any Category", value: "" },
          ...NEWSAPI_CATEGORY_OPTIONS,
        ]),
        scopes: ["provider", "stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "top-headlines",
      },
      {
        description: "Everything endpoint search field restrictions.",
        input: "checkboxes",
        key: "searchIn",
        label: "Search In",
        options: NEWSAPI_SEARCH_IN_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description: "Restrict Everything to specific domains.",
        input: "text",
        key: "domains",
        label: "Domains",
        placeholder: "bbc.co.uk,techcrunch.com",
        scopes: ["stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description: "Exclude domains from Everything results.",
        input: "text",
        key: "excludeDomains",
        label: "Exclude Domains",
        placeholder: "example.com",
        scopes: ["stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description:
          "Everything lower date bound. Automatic runs resolve to NewsPub's normalized previous-24-hours-plus-next-30-minutes window or reuse the checkpoint start when available, while explicit manual or batched runs can provide a bounded start datetime.",
        input: "date",
        key: "fromDate",
        label: "From Date",
        precision: "datetime",
        scopes: ["stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description:
          "Everything upper date bound. Automatic runs resolve to NewsPub's normalized previous-24-hours-plus-next-30-minutes window or reuse the checkpoint start when available, while explicit manual or batched runs can provide a bounded end datetime.",
        input: "date",
        key: "toDate",
        label: "To Date",
        precision: "datetime",
        scopes: ["stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
      {
        description: "Everything sort order from the NewsAPI docs.",
        input: "single-select",
        key: "sortBy",
        label: "Sort Order",
        options: NEWSAPI_SORT_OPTIONS,
        scopes: ["provider", "stream"],
        section: "request",
        when: (values) => readSingleValue(values, "endpoint") === "everything",
      },
    ],
  },
});

const providerExecutionLimits = Object.freeze({
  mediastack: Object.freeze({
    maxPostsPerRun: Object.freeze({
      max: 33,
      min: 1,
      reason:
        "Mediastack allows at most 100 upstream articles per request, and NewsPub fetches up to 3x the requested posts per run.",
    }),
  }),
  newsapi: Object.freeze({
    maxPostsPerRun: Object.freeze({
      max: 100,
      min: 1,
      reason: "NewsAPI pageSize cannot exceed 100 articles per request.",
    }),
  }),
  newsdata: Object.freeze({
    maxPostsPerRun: Object.freeze({
      max: 50,
      min: 1,
      reason: "NewsData request size limits vary by plan, so NewsPub caps stream runs at 50 to avoid obvious upstream failures.",
    }),
  }),
});

function isFieldVisible(field, scope, values) {
  if (!field.scopes?.includes(scope)) {
    return false;
  }

  if (typeof field.when === "function") {
    return field.when(values);
  }

  return true;
}

/**
 * Returns the full NewsPub provider-definition catalog.
 */
export function listProviderDefinitions() {
  return Object.values(providerDefinitionMap);
}

/**
 * Returns one NewsPub provider definition by key.
 */
export function getProviderDefinition(providerKey) {
  return providerDefinitionMap[normalizeKey(providerKey)] || null;
}

/**
 * Returns provider-specific execution limits that admin forms can enforce
 * before NewsPub sends provider-shaped requests upstream.
 */
export function getProviderExecutionLimits(providerKey) {
  return providerExecutionLimits[normalizeKey(providerKey)] || {};
}

/**
 * Returns the scoped provider form definition with values normalized for the current admin surface.
 */
export function getProviderFormDefinition(providerKey, scope, values = {}) {
  const definition = getProviderDefinition(providerKey);

  if (!definition) {
    return null;
  }

  return {
    ...definition,
    sections: definition.sections
      .map((section) => ({
        ...section,
        fields: definition.fields.filter((field) =>
          field.section === section.key && isFieldVisible(field, scope, values),
        ),
      }))
      .filter((section) => section.fields.length > 0),
  };
}

/**
 * Sanitizes provider field values before NewsPub persists or reuses them in request payloads.
 */
export function sanitizeProviderFieldValues(providerKey, values = {}, { preserveEmpty = false } = {}) {
  const definition = getProviderDefinition(providerKey);

  if (!definition) {
    return {};
  }

  const result = {};

  for (const field of definition.fields) {
    if (!Object.prototype.hasOwnProperty.call(values, field.key)) {
      continue;
    }

    if (field.input === "checkboxes") {
      const cleaned = dedupeValues(values[field.key]).map((value) => normalizeKey(value));

      if (cleaned.length || preserveEmpty) {
        result[field.key] = cleaned;
      }

      continue;
    }

    const cleaned = normalizeText(values[field.key]);

    if (cleaned || preserveEmpty) {
      result[field.key] = cleaned;
    }
  }

  return result;
}

/**
 * Merges provider default values with stream-specific overrides while discarding empty entries.
 */
export function mergeProviderFieldValues(defaults = {}, overrides = {}) {
  const merged = {
    ...(defaults || {}),
  };

  for (const [key, value] of Object.entries(overrides || {})) {
    const isEmptyArray = Array.isArray(value) && value.length === 0;
    const isEmptyScalar = !Array.isArray(value) && !normalizeText(value);

    if (isEmptyArray || isEmptyScalar) {
      delete merged[key];
      continue;
    }

    merged[key] = value;
  }

  return merged;
}

function createValidationIssue(code, message) {
  return {
    code,
    message,
    severity: "error",
  };
}

function normalizeAllowlistValues(values = []) {
  return dedupeValues(values).map((value) => normalizeKey(value));
}

function resolveAllowlistValues(values = [], providerFilters = {}, key) {
  const explicitValues = normalizeAllowlistValues(values);

  if (explicitValues.length) {
    return explicitValues;
  }

  return normalizeAllowlistValues(readMultiValue(providerFilters, key));
}

/**
 * Resolves the provider request values that NewsPub should send for one stream execution.
 */
export function resolveStreamProviderRequestValues(
  providerKey,
  {
    countryAllowlistJson = [],
    languageAllowlistJson = [],
    locale = "",
    providerDefaults = {},
    providerFilters = {},
  } = {},
) {
  const normalizedProviderKey = normalizeKey(providerKey);
  const providerDefaultValues = sanitizeProviderFieldValues(
    normalizedProviderKey,
    providerDefaults,
  );
  const streamOverrideValues = sanitizeProviderFieldValues(
    normalizedProviderKey,
    providerFilters,
    {
      preserveEmpty: true,
    },
  );
  const mergedValues = mergeProviderFieldValues(providerDefaultValues, streamOverrideValues);
  const requestValues = sanitizeProviderFieldValues(normalizedProviderKey, mergedValues);
  const normalizedLanguageAllowlist = resolveAllowlistValues(
    languageAllowlistJson,
    providerFilters,
    "languageAllowlistJson",
  );
  const normalizedCountryAllowlist = resolveAllowlistValues(
    countryAllowlistJson,
    providerFilters,
    "countryAllowlistJson",
  );

  delete requestValues.countryAllowlistJson;
  delete requestValues.languageAllowlistJson;

  if (normalizedProviderKey === "mediastack") {
    if (normalizedCountryAllowlist.length) {
      requestValues.countries = normalizedCountryAllowlist;
    }

    if (normalizedLanguageAllowlist.length) {
      requestValues.languages = normalizedLanguageAllowlist;
    } else if (!readMultiValue(requestValues, "languages").length && normalizeText(locale)) {
      requestValues.languages = [normalizeKey(locale)];
    }
  }

  if (normalizedProviderKey === "newsdata") {
    if (normalizedCountryAllowlist.length) {
      requestValues.country = normalizedCountryAllowlist;
    }

    if (normalizedLanguageAllowlist.length) {
      requestValues.language = normalizedLanguageAllowlist;
    } else if (!readMultiValue(requestValues, "language").length && normalizeText(locale)) {
      requestValues.language = [normalizeKey(locale)];
    }
  }

  if (normalizedProviderKey === "newsapi") {
    const endpoint = readSingleValue(requestValues, "endpoint") || "top-headlines";

    if (endpoint === "everything") {
      if (normalizedLanguageAllowlist.length) {
        requestValues.language = normalizedLanguageAllowlist[0];
      } else if (!normalizeText(requestValues.language) && normalizeText(locale)) {
        requestValues.language = normalizeKey(locale);
      }
    }

    if (endpoint === "top-headlines" && normalizedCountryAllowlist.length) {
      requestValues.country = normalizedCountryAllowlist[0];
    }
  }

  return requestValues;
}

/**
 * Returns provider-specific validation issues for the current NewsPub request configuration.
 */
export function getProviderRequestValidationIssues(providerKey, options = {}) {
  const normalizedProviderKey = normalizeKey(providerKey);
  const requestValues = resolveStreamProviderRequestValues(normalizedProviderKey, options);
  const issues = [];

  if (normalizedProviderKey === "newsapi") {
    const endpoint = readSingleValue(requestValues, "endpoint") || "top-headlines";
    const query = readSingleValue(requestValues, "q");
    const country = readSingleValue(requestValues, "country");
    const category = readSingleValue(requestValues, "category");
    const domains = readSingleValue(requestValues, "domains");

    if (endpoint === "everything") {
      if (query.length > 500) {
        issues.push(
          createValidationIssue(
            "provider_newsapi_everything_query_too_long",
            'NewsAPI "Everything" query (q) must stay within 500 characters.',
          ),
        );
      }

      if (!query && !domains) {
        issues.push(
          createValidationIssue(
            "provider_newsapi_everything_requires_scope",
            'NewsAPI "Everything" needs a keyword query or at least one domain. Add one of those filters or switch back to Top Headlines.',
          ),
        );
      }
    }

    if (endpoint === "top-headlines" && !query && !country && !category) {
      issues.push(
        createValidationIssue(
          "provider_newsapi_top_headlines_requires_scope",
          'NewsAPI "Top Headlines" needs a keyword query, country, or category. Add one of those filters or update the provider defaults.',
        ),
      );
    }
  }

  if (normalizedProviderKey === "newsdata") {
    const endpoint = readSingleValue(requestValues, "endpoint") || "latest";
    const fromDate = readSingleValue(requestValues, "fromDate");
    const toDate = readSingleValue(requestValues, "toDate");
    const categories = readMultiValue(requestValues, "category");
    const excludeCategories = readMultiValue(requestValues, "excludeCategories");

    if (endpoint === "archive") {
      if (!fromDate || !toDate) {
        issues.push(
          createValidationIssue(
            "provider_newsdata_archive_requires_date_range",
            'NewsData "Archive" requires both from/to dates before NewsPub can save these request defaults.',
          ),
        );
      } else if (new Date(fromDate).getTime() > new Date(toDate).getTime()) {
        issues.push(
          createValidationIssue(
            "provider_newsdata_archive_invalid_date_range",
            "NewsData archive from-date must be earlier than or equal to the to-date.",
          ),
        );
      }
    }

    if (categories.length && excludeCategories.length) {
      issues.push(
        createValidationIssue(
          "provider_newsdata_category_and_exclude_incompatible",
          "NewsData category filters cannot be combined with exclude-category filters in the same request.",
        ),
      );
    }
  }

  return issues;
}

/**
 * Returns the provider field values that should prefill the NewsPub stream editor.
 */
export function getStreamProviderFormValues(stream = {}) {
  const providerFilters = stream?.settingsJson?.providerFilters || {};
  const savedCountryAllowlist = readMultiValue(stream, "countryAllowlistJson");
  const savedLanguageAllowlist = readMultiValue(stream, "languageAllowlistJson");

  return {
    ...providerFilters,
    countryAllowlistJson: savedCountryAllowlist.length
      ? savedCountryAllowlist
      : readMultiValue(providerFilters, "countryAllowlistJson"),
    languageAllowlistJson: savedLanguageAllowlist.length
      ? savedLanguageAllowlist
      : readMultiValue(providerFilters, "languageAllowlistJson"),
  };
}

/**
 * Returns the stored provider request defaults in a safe object shape.
 */
export function getProviderRequestDefaultValues(providerConfig = {}) {
  return providerConfig?.requestDefaultsJson && typeof providerConfig.requestDefaultsJson === "object"
    ? providerConfig.requestDefaultsJson
    : {};
}
