/**
 * Provider adapters that normalize upstream news APIs into the shared NewsPub
 * article contract and fetch-window behavior.
 */

import { env } from "@/lib/env/server";
import {
  getProviderTimeBoundarySupport,
  listProviderDefinitions,
  resolveStreamProviderRequestValues,
} from "@/lib/news/provider-definitions";
import { resolveExecutionFetchWindow } from "@/lib/news/fetch-window";
import { NewsPubError, createContentHash, dedupeStrings, normalizeDisplayText } from "@/lib/news/shared";

const providerRuntimeCatalog = Object.freeze({
  mediastack: {
    baseUrl: "https://api.mediastack.com/v1/news",
    credentialEnv: "MEDIASTACK_API_KEY",
    description: "Mediastack provider integration with the official live news filters.",
    maxBatchSize: 100,
  },
  newsapi: {
    baseUrlByEndpoint: Object.freeze({
      everything: "https://newsapi.org/v2/everything",
      "top-headlines": "https://newsapi.org/v2/top-headlines",
    }),
    credentialEnv: "NEWSAPI_API_KEY",
    description: "NewsAPI provider integration with official Top Headlines and Everything filters.",
  },
  newsdata: {
    baseUrlByEndpoint: Object.freeze({
      archive: "https://newsdata.io/api/1/archive",
      latest: "https://newsdata.io/api/1/latest",
    }),
    credentialEnv: "NEWSDATA_API_KEY",
    description: "NewsData provider integration with official Latest and Archive request filters.",
  },
});

function normalizeProviderKey(value) {
  return `${value || ""}`.trim().toLowerCase();
}

function normalizeScalar(value) {
  return `${value ?? ""}`.trim();
}

function normalizeLowerScalar(value) {
  return normalizeScalar(value).toLowerCase();
}

function normalizeList(values = [], { lowerCase = false } = {}) {
  const rawValues = Array.isArray(values) ? values : normalizeScalar(values) ? [values] : [];

  return [...new Set(
    rawValues
      .map((value) => (lowerCase ? normalizeLowerScalar(value) : normalizeScalar(value)))
      .filter(Boolean),
  )];
}

function getSingleValue(values = {}, key, fallbackValue = "") {
  const rawValue = values?.[key];

  if (Array.isArray(rawValue)) {
    return normalizeScalar(rawValue[0]) || fallbackValue;
  }

  return normalizeScalar(rawValue) || fallbackValue;
}

function getMultiValue(values = {}, key) {
  return normalizeList(values?.[key]);
}

function getMaxPostsPerRun(stream) {
  return Math.max(1, Number.parseInt(`${stream?.maxPostsPerRun || 10}`, 10) || 10);
}

function getProviderFetchBatchSize({ maxArticlesHint = null, stream = null } = {}) {
  const resolvedHint = Math.max(
    Number.parseInt(`${maxArticlesHint ?? getMaxPostsPerRun(stream)}`, 10) || getMaxPostsPerRun(stream),
    1,
  );

  return Math.max(resolvedHint * 3, 25);
}

function getCappedProviderFetchBatchSize(providerKey, options = {}) {
  const normalizedProviderKey = normalizeProviderKey(providerKey);
  const requestedBatchSize = getProviderFetchBatchSize(options);
  const providerBatchCap = Number.parseInt(`${providerRuntimeCatalog[normalizedProviderKey]?.maxBatchSize || ""}`, 10);

  if (!Number.isInteger(providerBatchCap) || providerBatchCap <= 0) {
    return requestedBatchSize;
  }

  return Math.min(requestedBatchSize, providerBatchCap);
}

function normalizeDateValue(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsedValue = new Date(value);

  return Number.isNaN(parsedValue.getTime()) ? null : parsedValue;
}

/**
 * Returns the normalized automatic fetch window used when a provider run does
 * not supply explicit manual bounds.
 */
export function resolveAutomaticProviderDateWindow(
  { checkpoint, defaultWindowHours = 24, now = new Date() } = {},
) {
  const fetchWindow = resolveExecutionFetchWindow({
    checkpoint,
    defaultWindowHours,
    now,
  });

  return {
    end: fetchWindow.end,
    start: fetchWindow.start,
  };
}

function formatProviderDateWindowValue(value, precision) {
  const resolvedValue = normalizeDateValue(value);

  if (!resolvedValue) {
    return "";
  }

  return precision === "datetime" ? resolvedValue.toISOString() : resolvedValue.toISOString().slice(0, 10);
}

/** Convenience wrapper for applying the normalized automatic window to a provider request. */
export function applyAutomaticDateWindowToRequestValues(
  providerKey,
  requestValues = {},
  { checkpoint, now } = {},
) {
  return applyFetchWindowToRequestValues(providerKey, requestValues, {
    checkpoint,
    now,
  });
}

function resolveRelativeWindowHours(fetchWindow, now = new Date()) {
  const resolvedNow = normalizeDateValue(now) || new Date();
  const resolvedEnd = normalizeDateValue(fetchWindow?.end) || resolvedNow;
  const resolvedStart = normalizeDateValue(fetchWindow?.start);

  if (!resolvedStart) {
    return "";
  }

  // Relative-lookback endpoints cannot express a future buffer directly, so
  // NewsPub rounds the normalized window up to the nearest safe hour and lets
  // exact start/end filtering stay in the app layer.
  const durationHours = Math.max(
    1,
    Math.ceil((Math.max(resolvedEnd.getTime(), resolvedNow.getTime()) - resolvedStart.getTime()) / (60 * 60 * 1000)),
  );

  return `${Math.min(durationHours, 48)}`;
}

/**
 * Applies the normalized NewsPub fetch window to provider-native request
 * values while keeping provider-specific parameter names inside the adapter.
 *
 * @param {string} providerKey - Provider catalog key.
 * @param {object} requestValues - Sanitized provider request values.
 * @param {object} [options] - Window resolution inputs.
 * @param {object|null} [options.checkpoint] - Provider checkpoint metadata.
 * @param {object|null} [options.fetchWindow] - Normalized NewsPub fetch window.
 * @param {Date} [options.now] - Execution timestamp.
 * @returns {object} Provider request values with time-boundary inputs applied.
 */
export function applyFetchWindowToRequestValues(
  providerKey,
  requestValues = {},
  { checkpoint, fetchWindow = null, now } = {},
) {
  const timeBoundarySupport = getProviderTimeBoundarySupport(providerKey, requestValues);
  const resolvedFetchWindow =
    fetchWindow
    || resolveExecutionFetchWindow({
      checkpoint,
      now,
    });

  if (timeBoundarySupport.mode === "direct") {
    return {
      ...requestValues,
      [timeBoundarySupport.endKey]: formatProviderDateWindowValue(
        resolvedFetchWindow.end,
        timeBoundarySupport.precision,
      ),
      [timeBoundarySupport.startKey]: formatProviderDateWindowValue(
        resolvedFetchWindow.start,
        timeBoundarySupport.precision,
      ),
    };
  }

  if (timeBoundarySupport.mode === "relative" && timeBoundarySupport.timeframeKey) {
    return {
      ...requestValues,
      [timeBoundarySupport.timeframeKey]:
        resolveRelativeWindowHours(resolvedFetchWindow, now)
        || normalizeScalar(requestValues[timeBoundarySupport.timeframeKey]),
    };
  }

  return {
    ...requestValues,
  };
}

function buildDateRangeValue(startDate, endDate) {
  const start = normalizeScalar(startDate);
  const end = normalizeScalar(endDate);

  if (start && end) {
    return `${start},${end}`;
  }

  return start || end || "";
}

function appendScalarParam(url, key, value) {
  const normalizedValue = normalizeScalar(value);

  if (normalizedValue) {
    url.searchParams.set(key, normalizedValue);
  }
}

function appendListParam(url, key, values) {
  const normalizedValues = normalizeList(values);

  if (normalizedValues.length) {
    url.searchParams.set(key, normalizedValues.join(","));
  }
}

function appendIncludeExcludeListParam(url, key, includeValues, excludeValues) {
  const include = normalizeList(includeValues, { lowerCase: true });
  const exclude = normalizeList(excludeValues, { lowerCase: true }).map((value) =>
    value.startsWith("-") ? value : `-${value.replace(/^-+/, "")}`,
  );
  const combinedValues = [...include, ...exclude];

  if (combinedValues.length) {
    url.searchParams.set(key, combinedValues.join(","));
  }
}

function getCheckpointCursorValue(cursorJson) {
  if (typeof cursorJson === "string" || typeof cursorJson === "number") {
    return `${cursorJson}`;
  }

  return "";
}

function createNormalizedArticle(article, providerKey) {
  const normalizedTitle = normalizeDisplayText(article.title);
  const normalizedSourceUrl = normalizeDisplayText(article.sourceUrl);
  const publishedAt = article.publishedAt || new Date().toISOString();

  return {
    ...article,
    dedupeFingerprint: createContentHash(
      providerKey,
      article.providerArticleId,
      normalizedSourceUrl,
      normalizedTitle,
      publishedAt,
    ).slice(0, 40),
    fetchTimestamp: new Date().toISOString(),
    normalizedTitleHash: createContentHash(normalizedTitle),
    providerKey,
    sourceUrlHash: normalizedSourceUrl ? createContentHash(normalizedSourceUrl) : null,
    tags: dedupeStrings(article.tags),
  };
}

function normalizeMediastackArticle(article) {
  return createNormalizedArticle(
    {
      author: article.author || null,
      body: article.description || article.snippet || null,
      imageUrl: article.image || null,
      language: normalizeLowerScalar(article.language) || null,
      providerArticleId: article.url || article.title || null,
      providerCategories: normalizeList([article.category], { lowerCase: true }),
      providerCountries: normalizeList([article.country], { lowerCase: true }),
      providerRegions: [],
      publishedAt: article.published_at || null,
      rawPayloadJson: article,
      sourceName: article.source || "Unknown Source",
      sourceUrl: article.url || null,
      summary: article.description || article.title || "",
      tags: dedupeStrings([article.category, article.source]),
      title: article.title || "Untitled story",
    },
    "mediastack",
  );
}

function normalizeNewsDataArticle(article) {
  return createNormalizedArticle(
    {
      author: Array.isArray(article.creator) ? article.creator.join(", ") : article.creator || null,
      body: article.content || article.description || null,
      imageUrl: article.image_url || null,
      language: normalizeLowerScalar(article.language) || null,
      providerArticleId: article.article_id || article.link || article.title || null,
      providerCategories: normalizeList(article.category || [], { lowerCase: true }),
      providerCountries: normalizeList(article.country || [], { lowerCase: true }),
      providerRegions: [],
      publishedAt: article.pubDate || null,
      rawPayloadJson: article,
      sourceName: article.source_id || "Unknown Source",
      sourceUrl: article.link || null,
      summary: article.description || article.title || "",
      tags: dedupeStrings([...(article.category || []), ...(article.keywords || [])]),
      title: article.title || "Untitled story",
    },
    "newsdata",
  );
}

function normalizeNewsApiArticle(article, { requestValues = {}, stream } = {}) {
  const requestedCategory = normalizeScalar(requestValues.category);
  const requestedCountry = normalizeScalar(requestValues.country);
  const requestedLanguage =
    normalizeScalar(requestValues.language)
    || normalizeLowerScalar(stream?.locale)
    || null;

  return createNormalizedArticle(
    {
      author: article.author || null,
      body: article.content || article.description || null,
      imageUrl: article.urlToImage || null,
      language: requestedLanguage,
      providerArticleId: article.url || article.title || null,
      providerCategories: requestedCategory ? [requestedCategory] : [],
      providerCountries: requestedCountry ? [requestedCountry] : [],
      providerRegions: [],
      publishedAt: article.publishedAt || null,
      rawPayloadJson: article,
      sourceName: article.source?.name || "Unknown Source",
      sourceUrl: article.url || null,
      summary: article.description || article.title || "",
      tags: dedupeStrings([article.source?.name, requestedCategory]),
      title: article.title || "Untitled story",
    },
    "newsapi",
  );
}

function buildFallbackProviderArticles(stream, providerKey, now = new Date()) {
  const streamLocale = stream?.locale || "en";
  const streamName = stream?.name || "Shared verification stream";
  const streamSlug = stream?.slug || "shared-verification";

  return [
    createNormalizedArticle(
      {
        author: "NewsPub system",
        body:
          "This fallback article demonstrates the full NewsPub ingest pipeline when provider credentials are not configured in a local environment.",
        imageUrl: null,
        language: streamLocale,
        providerArticleId: `${streamSlug}-${now.toISOString()}`,
        providerCategories: ["technology"],
        providerCountries: ["us"],
        providerRegions: [],
        publishedAt: now.toISOString(),
        rawPayloadJson: {
          fallback: true,
          generatedAt: now.toISOString(),
        },
        sourceName: "Local Development Feed",
        sourceUrl: `${env.app.url}/${streamLocale}/about`,
        summary:
          "Fallback local article used to verify filters, templates, scheduling, and publication flows when live provider access is unavailable.",
        tags: ["newspub", "local", "fallback"],
        title: `${streamName} local verification article`,
      },
      providerKey,
    ),
  ];
}

function getOfficialProviderCatalogEntry(providerKey) {
  const normalizedKey = normalizeProviderKey(providerKey);
  const definition = listProviderDefinitions().find((provider) => provider.key === normalizedKey);
  const runtimeDefinition = providerRuntimeCatalog[normalizedKey];

  if (!definition || !runtimeDefinition) {
    return null;
  }

  return {
    baseUrl:
      runtimeDefinition.baseUrl
      || runtimeDefinition.baseUrlByEndpoint?.[
        definition.defaultRequestDefaults?.endpoint
          || Object.keys(runtimeDefinition.baseUrlByEndpoint || {})[0]
      ]
      || null,
    credentialEnv: runtimeDefinition.credentialEnv,
    defaultRequestDefaults: definition.defaultRequestDefaults || {},
    description: runtimeDefinition.description,
    docsUrl: definition.docsUrl,
    key: definition.key,
    label: definition.label,
    providerKey: definition.key,
  };
}

function resolveProviderRequestValues(providerKey, stream) {
  return resolveStreamProviderRequestValues(providerKey, {
    countryAllowlistJson: stream?.countryAllowlistJson,
    languageAllowlistJson: stream?.languageAllowlistJson,
    locale: stream?.locale,
    providerDefaults: stream?.activeProvider?.requestDefaultsJson,
    providerFilters: stream?.settingsJson?.providerFilters || {},
  });
}

function buildMediastackRequest({ credential, maxArticlesHint = null, requestValues, stream }) {
  const url = new URL(providerRuntimeCatalog.mediastack.baseUrl);

  url.searchParams.set("access_key", credential);
  url.searchParams.set("limit", `${getCappedProviderFetchBatchSize("mediastack", { maxArticlesHint, stream })}`);
  appendIncludeExcludeListParam(url, "countries", requestValues.countries, requestValues.excludeCountries);
  appendIncludeExcludeListParam(url, "languages", requestValues.languages, requestValues.excludeLanguages);
  appendIncludeExcludeListParam(url, "categories", requestValues.categories, requestValues.excludeCategories);
  appendScalarParam(url, "sort", requestValues.sort);
  appendScalarParam(url, "keywords", requestValues.keywords);

  const dateRange = buildDateRangeValue(requestValues.dateFrom, requestValues.dateTo);

  if (dateRange) {
    url.searchParams.set("date", dateRange);
  }

  return {
    responseShape: "data",
    url,
  };
}

function buildNewsDataRequest({
  checkpoint,
  credential,
  maxArticlesHint = null,
  requestValues,
  stream,
}) {
  const endpoint = getSingleValue(requestValues, "endpoint", "latest") === "archive" ? "archive" : "latest";
  const url = new URL(providerRuntimeCatalog.newsdata.baseUrlByEndpoint[endpoint]);
  const pageCursor = getCheckpointCursorValue(checkpoint?.cursorJson);

  url.searchParams.set("apikey", credential);
  url.searchParams.set("size", `${getProviderFetchBatchSize({ maxArticlesHint, stream })}`);

  if (pageCursor) {
    url.searchParams.set("page", pageCursor);
  }

  appendScalarParam(url, "q", requestValues.q);
  appendScalarParam(url, "qInTitle", requestValues.qInTitle);
  appendScalarParam(url, "qInMeta", requestValues.qInMeta);
  appendIncludeExcludeListParam(url, "language", requestValues.language, requestValues.excludeLanguages);
  appendIncludeExcludeListParam(url, "country", requestValues.country, requestValues.excludeCountries);
  appendListParam(url, "category", requestValues.category);
  appendListParam(url, "excludecategory", requestValues.excludeCategories);
  appendScalarParam(url, "sort", requestValues.sort);
  appendListParam(url, "datatype", requestValues.datatype);
  appendScalarParam(url, "prioritydomain", requestValues.prioritydomain);
  appendScalarParam(url, "creator", requestValues.creator);
  appendScalarParam(url, "domain", requestValues.domain);
  appendScalarParam(url, "domainurl", requestValues.domainurl);
  appendScalarParam(url, "excludedomain", requestValues.excludeDomains);
  appendScalarParam(url, "url", requestValues.url);
  appendScalarParam(url, "sentiment", requestValues.sentiment);
  appendScalarParam(url, "full_content", requestValues.fullContent);
  appendScalarParam(url, "image", requestValues.image);
  appendScalarParam(url, "video", requestValues.video);
  appendScalarParam(url, "removeduplicate", requestValues.removeDuplicate);

  if (endpoint === "archive") {
    appendScalarParam(url, "from_date", requestValues.fromDate);
    appendScalarParam(url, "to_date", requestValues.toDate);
  } else {
    appendScalarParam(url, "timeframe", requestValues.timeframe);
  }

  return {
    endpoint,
    responseShape: "results",
    url,
  };
}

function buildNewsApiRequest({ credential, maxArticlesHint = null, requestValues, stream }) {
  const endpoint = getSingleValue(requestValues, "endpoint", "top-headlines") === "everything"
    ? "everything"
    : "top-headlines";
  const url = new URL(providerRuntimeCatalog.newsapi.baseUrlByEndpoint[endpoint]);

  url.searchParams.set("pageSize", `${getProviderFetchBatchSize({ maxArticlesHint, stream })}`);
  appendScalarParam(url, "q", requestValues.q);

  if (endpoint === "everything") {
    appendScalarParam(url, "language", requestValues.language);
    appendListParam(url, "searchIn", requestValues.searchIn);
    appendScalarParam(url, "domains", requestValues.domains);
    appendScalarParam(url, "excludeDomains", requestValues.excludeDomains);
    appendScalarParam(url, "from", requestValues.fromDate);
    appendScalarParam(url, "to", requestValues.toDate);
    appendScalarParam(url, "sortBy", requestValues.sortBy);
  } else {
    appendScalarParam(url, "country", requestValues.country);
    appendScalarParam(url, "category", requestValues.category);
  }

  return {
    endpoint,
    headers: {
      "x-api-key": credential,
    },
    responseShape: "articles",
    url,
  };
}

async function readJsonResponse(response) {
  const responseText = await response.text();

  if (!responseText) {
    return null;
  }

  try {
    return JSON.parse(responseText);
  } catch {
    return null;
  }
}

function createProviderResponseError(providerLabel, payload, fallbackMessage) {
  const errorMessage =
    payload?.error?.message
    || payload?.message
    || payload?.results?.message
    || payload?.status
    || fallbackMessage;

  return new NewsPubError(`${providerLabel} request failed: ${errorMessage}`, {
    status: "provider_response_invalid",
    statusCode: 502,
  });
}

function getFetchRequestInit(extraHeaders = {}) {
  return {
    headers: {
      accept: "application/json",
      ...extraHeaders,
    },
    next: {
      revalidate: 0,
    },
  };
}

/** Lists the provider catalog entries exposed to the admin and workflow layers. */
export function listNewsProviders() {
  return listProviderDefinitions()
    .map((provider) => getOfficialProviderCatalogEntry(provider.key))
    .filter(Boolean);
}

/** Returns one provider catalog entry by key. */
export function getNewsProviderDefinition(providerKey) {
  return getOfficialProviderCatalogEntry(providerKey);
}

/** Resolves the configured credential value for one provider key. */
export function resolveNewsProviderCredential(providerKey) {
  const normalizedKey = normalizeProviderKey(providerKey);

  if (normalizedKey === "mediastack") {
    return env.providers.credentials.mediastack;
  }

  if (normalizedKey === "newsdata") {
    return env.providers.credentials.newsdata;
  }

  if (normalizedKey === "newsapi") {
    return env.providers.credentials.newsapi;
  }

  return null;
}

/** Returns whether the given provider currently has credentials configured. */
export function getProviderCredentialState(providerKey) {
  return resolveNewsProviderCredential(providerKey) ? "configured" : "missing";
}

/**
 * Fetches and normalizes provider articles for either one stream or a shared
 * provider request group.
 *
 * @param {object} options - Provider fetch inputs.
 * @param {object|null} [options.checkpoint] - Provider checkpoint metadata.
 * @param {object|null} [options.fetchWindow] - Normalized NewsPub fetch window.
 * @param {number|null} [options.maxArticlesHint] - Shared request sizing hint.
 * @param {Date} [options.now] - Execution timestamp.
 * @param {string} options.providerKey - Provider catalog key.
 * @param {object|null} [options.requestValues] - Precomputed provider request values.
 * @param {object|null} [options.stream] - Stream-like runtime context.
 * @returns {Promise<object>} Normalized provider result payload.
 */
export async function fetchProviderArticles({
  checkpoint,
  fetchWindow = null,
  maxArticlesHint = null,
  now = new Date(),
  providerKey,
  requestValues: requestValuesOverride = null,
  stream,
}) {
  const normalizedKey = normalizeProviderKey(providerKey);
  const providerDefinition = getNewsProviderDefinition(normalizedKey);
  const credential = resolveNewsProviderCredential(normalizedKey);

  if (!credential) {
    throw new NewsPubError(
      `Missing credential for provider "${normalizedKey}". Configure ${providerDefinition?.credentialEnv || "the provider API key"} before running the stream.`,
      { status: "provider_credential_missing", statusCode: 400 },
    );
  }

  if (process.env.NODE_ENV === "test" || process.env.NEWS_PUB_PROVIDER_FIXTURES === "true") {
    return {
      articles: buildFallbackProviderArticles(stream, normalizedKey, now),
      cursor: checkpoint?.cursorJson || null,
      fetchedCount: 1,
    };
  }

  if (!providerDefinition) {
    throw new NewsPubError(`Unsupported provider "${normalizedKey}".`, {
      status: "provider_not_supported",
      statusCode: 400,
    });
  }

  const requestValues = applyFetchWindowToRequestValues(
    normalizedKey,
    requestValuesOverride || resolveProviderRequestValues(normalizedKey, stream),
    {
      checkpoint,
      fetchWindow,
      now,
    },
  );

  if (normalizedKey === "mediastack") {
    const request = buildMediastackRequest({
      credential,
      maxArticlesHint,
      requestValues,
      stream,
    });
    const response = await fetch(request.url, getFetchRequestInit());
    const payload = await readJsonResponse(response);

    if (!response.ok || !Array.isArray(payload?.[request.responseShape])) {
      throw createProviderResponseError("Mediastack", payload, "Invalid response shape.");
    }

    return {
      articles: payload.data.map(normalizeMediastackArticle),
      cursor: payload.pagination || null,
      fetchedCount: payload.data.length,
    };
  }

  if (normalizedKey === "newsdata") {
    const request = buildNewsDataRequest({
      checkpoint,
      credential,
      maxArticlesHint,
      requestValues,
      stream,
    });
    const response = await fetch(request.url, getFetchRequestInit());
    const payload = await readJsonResponse(response);

    if (!response.ok || !Array.isArray(payload?.[request.responseShape])) {
      throw createProviderResponseError("NewsData", payload, "Invalid response shape.");
    }

    return {
      articles: payload.results.map(normalizeNewsDataArticle),
      cursor: payload.nextPage || null,
      fetchedCount: payload.results.length,
    };
  }

  if (normalizedKey === "newsapi") {
    const request = buildNewsApiRequest({
      credential,
      maxArticlesHint,
      requestValues,
      stream,
    });
    const response = await fetch(request.url, getFetchRequestInit(request.headers));
    const payload = await readJsonResponse(response);

    if (!response.ok || !Array.isArray(payload?.[request.responseShape])) {
      throw createProviderResponseError("NewsAPI", payload, "Invalid response shape.");
    }

    return {
      articles: payload.articles.map((article) =>
        normalizeNewsApiArticle(article, {
          requestValues,
          stream,
        })),
      cursor: {
        endpoint: request.endpoint,
        totalResults: payload.totalResults || payload.articles.length,
      },
      fetchedCount: payload.articles.length,
    };
  }

  throw new NewsPubError(`Unsupported provider "${normalizedKey}".`, {
    status: "provider_not_supported",
    statusCode: 400,
  });
}
