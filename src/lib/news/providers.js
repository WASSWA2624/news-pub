import { env } from "@/lib/env/server";
import { NewsPubError, createContentHash, dedupeStrings, normalizeDisplayText } from "@/lib/news/shared";

const providerCatalog = Object.freeze([
  {
    credentialEnv: "MEDIASTACK_API_KEY",
    defaultRequestDefaults: {
      countries: ["us"],
      languages: ["en"],
      limit: 25,
      sort: "published_desc",
    },
    docsUrl: "https://mediastack.com/documentation",
    key: "mediastack",
    label: "Mediastack",
  },
  {
    credentialEnv: "NEWSDATA_API_KEY",
    defaultRequestDefaults: {
      country: ["us"],
      language: ["en"],
      size: 25,
    },
    docsUrl: "https://newsdata.io/documentation",
    key: "newsdata",
    label: "NewsData",
  },
  {
    credentialEnv: "NEWSAPI_API_KEY",
    defaultRequestDefaults: {
      language: "en",
      pageSize: 25,
      sortBy: "publishedAt",
    },
    docsUrl: "https://newsapi.org/docs",
    key: "newsapi",
    label: "NewsAPI",
  },
]);

function normalizeProviderKey(value) {
  return `${value || ""}`.trim().toLowerCase();
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
      language: article.language || null,
      providerArticleId: article.url || article.title || null,
      providerCategories: dedupeStrings([article.category].flat()),
      providerCountries: dedupeStrings([article.country].flat()),
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
      language: article.language || null,
      providerArticleId: article.article_id || article.link || article.title || null,
      providerCategories: dedupeStrings(article.category || []),
      providerCountries: dedupeStrings(article.country || []),
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

function normalizeNewsApiArticle(article) {
  return createNormalizedArticle(
    {
      author: article.author || null,
      body: article.content || article.description || null,
      imageUrl: article.urlToImage || null,
      language: article.language || "en",
      providerArticleId: article.url || article.title || null,
      providerCategories: [],
      providerCountries: [],
      providerRegions: [],
      publishedAt: article.publishedAt || null,
      rawPayloadJson: article,
      sourceName: article.source?.name || "Unknown Source",
      sourceUrl: article.url || null,
      summary: article.description || article.title || "",
      tags: dedupeStrings([article.source?.name]),
      title: article.title || "Untitled story",
    },
    "newsapi",
  );
}

function buildFallbackProviderArticles(stream, now = new Date()) {
  return [
    createNormalizedArticle(
      {
        author: "NewsPub system",
        body:
          "This fallback article demonstrates the full NewsPub ingest pipeline when provider credentials are not configured in a local environment.",
        imageUrl: null,
        language: stream.locale,
        providerArticleId: `${stream.slug}-${now.toISOString()}`,
        providerCategories: ["technology"],
        providerCountries: ["us"],
        providerRegions: [],
        publishedAt: now.toISOString(),
        rawPayloadJson: {
          fallback: true,
          generatedAt: now.toISOString(),
        },
        sourceName: "Local Development Feed",
        sourceUrl: `${env.app.url}/${stream.locale}/about`,
        summary:
          "Fallback local article used to verify filters, templates, scheduling, and publication flows when live provider access is unavailable.",
        tags: ["newspub", "local", "fallback"],
        title: `${stream.name} local verification article`,
      },
      stream.activeProvider.providerKey,
    ),
  ];
}

export function listNewsProviders() {
  return providerCatalog;
}

export function getNewsProviderDefinition(providerKey) {
  return providerCatalog.find((provider) => provider.key === normalizeProviderKey(providerKey)) || null;
}

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

export function getProviderCredentialState(providerKey) {
  return resolveNewsProviderCredential(providerKey) ? "configured" : "missing";
}

export async function fetchProviderArticles({ checkpoint, now = new Date(), providerKey, stream }) {
  const normalizedKey = normalizeProviderKey(providerKey);
  const credential = resolveNewsProviderCredential(normalizedKey);

  if (!credential) {
    throw new NewsPubError(
      `Missing credential for provider "${normalizedKey}". Configure ${getNewsProviderDefinition(normalizedKey)?.credentialEnv || "the provider API key"} before running the stream.`,
      { status: "provider_credential_missing", statusCode: 400 },
    );
  }

  if (process.env.NODE_ENV === "test" || process.env.NEWS_PUB_PROVIDER_FIXTURES === "true") {
    return {
      articles: buildFallbackProviderArticles(stream, now),
      cursor: checkpoint?.cursorJson || null,
      fetchedCount: 1,
    };
  }

  if (normalizedKey === "mediastack") {
    const url = new URL("https://api.mediastack.com/v1/news");
    url.searchParams.set("access_key", credential);
    url.searchParams.set("languages", stream.locale || "en");
    url.searchParams.set("limit", `${stream.maxPostsPerRun || 10}`);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 0,
      },
    });
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload?.data)) {
      throw new NewsPubError("Mediastack returned an invalid response shape.", {
        status: "provider_response_invalid",
        statusCode: 502,
      });
    }

    return {
      articles: payload.data.map(normalizeMediastackArticle),
      cursor: payload.pagination || null,
      fetchedCount: payload.data.length,
    };
  }

  if (normalizedKey === "newsdata") {
    const url = new URL("https://newsdata.io/api/1/news");
    url.searchParams.set("apikey", credential);
    url.searchParams.set("language", stream.locale || "en");
    url.searchParams.set("size", `${stream.maxPostsPerRun || 10}`);
    const response = await fetch(url, {
      headers: {
        accept: "application/json",
      },
      next: {
        revalidate: 0,
      },
    });
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload?.results)) {
      throw new NewsPubError("NewsData returned an invalid response shape.", {
        status: "provider_response_invalid",
        statusCode: 502,
      });
    }

    return {
      articles: payload.results.map(normalizeNewsDataArticle),
      cursor: payload.nextPage || null,
      fetchedCount: payload.results.length,
    };
  }

  if (normalizedKey === "newsapi") {
    const url = new URL("https://newsapi.org/v2/top-headlines");
    url.searchParams.set("language", stream.locale || "en");
    url.searchParams.set("pageSize", `${stream.maxPostsPerRun || 10}`);
    const response = await fetch(url, {
      headers: {
        "x-api-key": credential,
        accept: "application/json",
      },
      next: {
        revalidate: 0,
      },
    });
    const payload = await response.json();

    if (!response.ok || !Array.isArray(payload?.articles)) {
      throw new NewsPubError("NewsAPI returned an invalid response shape.", {
        status: "provider_response_invalid",
        statusCode: 502,
      });
    }

    return {
      articles: payload.articles.map(normalizeNewsApiArticle),
      cursor: {
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
