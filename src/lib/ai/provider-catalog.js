import { getAiProviderByValue, getProviderApiKeyEnvName, searchAiProviders } from "@/lib/ai/provider-registry";

import { resolveProviderApiKey } from "./provider-configs";

const DEFAULT_RESULT_LIMIT = 40;
const NETWORK_TIMEOUT_MS = 15000;
const PROVIDER_MODEL_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

const PROVIDER_MODEL_CACHE = new Map();

export class ProviderCatalogError extends Error {
  constructor(
    message,
    { details = null, status = "provider_catalog_error", statusCode = 500 } = {},
  ) {
    super(message);
    this.name = "ProviderCatalogError";
    this.details = details;
    this.status = status;
    this.statusCode = statusCode;
  }
}

function collapseWhitespace(value) {
  return `${value || ""}`.trim().replace(/\s+/g, " ");
}

function normalizeProviderValue(provider) {
  return collapseWhitespace(provider).toLowerCase();
}

function normalizeModelId(value) {
  return collapseWhitespace(value)
    .replace(/^\/+/, "")
    .replace(/^models?\//i, "")
    .replace(/^accounts\/fireworks\/models\//i, "")
    .replace(/^fireworks\/models\//i, "")
    .replace(/\\/g, "")
    .replace(/&amp;/gi, "&");
}

function toIsoString(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function buildCacheKey(provider, query = "") {
  return `${provider}:${collapseWhitespace(query).toLowerCase() || "*"}`;
}

function isFreshCacheEntry(entry) {
  if (!entry?.syncedAt) {
    return false;
  }

  return Date.now() - entry.syncedAt.getTime() < PROVIDER_MODEL_CACHE_TTL_MS;
}

function createModelEntry(provider, id, sourceUrl, label = id) {
  const normalizedId = normalizeModelId(id);

  if (!normalizedId) {
    return null;
  }

  return {
    id: normalizedId,
    label: collapseWhitespace(label) || normalizedId,
    provider,
    sourceUrl,
  };
}

function dedupeModelEntries(entries) {
  const modelMap = new Map();

  for (const entry of entries) {
    if (!entry?.id) {
      continue;
    }

    const cacheKey = `${entry.provider}:${entry.id.toLowerCase()}`;

    if (!modelMap.has(cacheKey)) {
      modelMap.set(cacheKey, entry);
    }
  }

  return [...modelMap.values()].sort((leftEntry, rightEntry) =>
    leftEntry.id.localeCompare(rightEntry.id, undefined, {
      sensitivity: "base",
    }),
  );
}

function filterModelEntries(entries, query, limit = DEFAULT_RESULT_LIMIT) {
  const normalizedQuery = collapseWhitespace(query).toLowerCase();

  if (!normalizedQuery) {
    return entries.slice(0, limit);
  }

  const scoredEntries = entries
    .map((entry) => {
      const entryHaystack = `${entry.id} ${entry.label}`.toLowerCase();
      const exact = entry.id.toLowerCase() === normalizedQuery || entry.label.toLowerCase() === normalizedQuery;
      const prefix = entry.id.toLowerCase().startsWith(normalizedQuery);
      const contains = entryHaystack.includes(normalizedQuery);

      if (!contains) {
        return null;
      }

      return {
        entry,
        score: exact ? 0 : prefix ? 1 : 2,
      };
    })
    .filter(Boolean)
    .sort((leftEntry, rightEntry) => {
      if (leftEntry.score !== rightEntry.score) {
        return leftEntry.score - rightEntry.score;
      }

      return leftEntry.entry.id.localeCompare(rightEntry.entry.id, undefined, {
        sensitivity: "base",
      });
    })
    .map((result) => result.entry);

  return scoredEntries.slice(0, limit);
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

async function fetchText(url, requestInit = {}) {
  const response = await fetch(url, {
    ...requestInit,
    headers: {
      "user-agent": "equip-blog-admin",
      ...requestInit.headers,
    },
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new ProviderCatalogError(`Unable to load the trusted catalog source for "${url}".`, {
      details: {
        statusCode: response.status,
        url,
      },
      status: "provider_catalog_source_failed",
      statusCode: response.status,
    });
  }

  return response.text();
}

async function fetchJson(url, requestInit = {}) {
  const response = await fetch(url, {
    ...requestInit,
    headers: {
      accept: "application/json",
      "user-agent": "equip-blog-admin",
      ...requestInit.headers,
    },
    signal: AbortSignal.timeout(NETWORK_TIMEOUT_MS),
  });

  if (!response.ok) {
    throw new ProviderCatalogError(`Unable to load the trusted catalog source for "${url}".`, {
      details: {
        statusCode: response.status,
        url,
      },
      status: "provider_catalog_source_failed",
      statusCode: response.status,
    });
  }

  return response.json();
}

function extractMatches(text, regexes, filterValue) {
  const matches = [];

  for (const regex of regexes) {
    for (const match of text.matchAll(regex)) {
      const value = normalizeModelId(match[1] || match[0]);

      if (!value) {
        continue;
      }

      if (typeof filterValue === "function" && !filterValue(value)) {
        continue;
      }

      matches.push(value);
    }
  }

  return matches;
}

function buildCatalogSourceSummary(providerValue, cacheEntry) {
  const provider = getAiProviderByValue(providerValue);

  return {
    cachedModelCount: cacheEntry?.models?.length || 0,
    catalogSourceLabel: provider?.catalogSourceLabel || "Trusted provider catalog",
    docsUrl: provider?.docsUrl || null,
    label: provider?.label || providerValue,
    searchHint: provider?.searchHint || "Search or paste a model id.",
    syncStatus: cacheEntry?.syncStatus || "idle",
    syncedAt: toIsoString(cacheEntry?.syncedAt),
    value: provider?.value || providerValue,
  };
}

function createCatalogResponse(providerValue, cacheEntry, query, options = {}) {
  return {
    cached: Boolean(options.cached),
    modelCount: cacheEntry?.models?.length || 0,
    models: filterModelEntries(cacheEntry?.models || [], query, options.limit),
    provider: buildCatalogSourceSummary(providerValue, cacheEntry),
    query: collapseWhitespace(query),
  };
}

async function resolveProviderCredential(providerValue, prisma) {
  const db = await resolvePrismaClient(prisma);
  const normalizedProvider = normalizeProviderValue(providerValue);
  const providerConfig = await db.modelProviderConfig.findFirst({
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
    select: {
      apiKeyEncrypted: true,
      apiKeyEnvName: true,
      id: true,
      provider: true,
    },
    where: {
      isEnabled: true,
      provider: normalizedProvider,
    },
  });

  if (providerConfig) {
    const resolvedCredential = resolveProviderApiKey(providerConfig);

    if (resolvedCredential.apiKey) {
      return {
        apiKey: resolvedCredential.apiKey,
        envName: resolvedCredential.envName,
      };
    }
  }

  const envName = getProviderApiKeyEnvName(normalizedProvider);
  const envValue = collapseWhitespace(process.env[envName]);

  return {
    apiKey: envValue || null,
    envName,
  };
}

function createCredentialRequiredCacheEntry(providerValue, envName) {
  return {
    models: [],
    syncMessage: `Store an API key or configure ${envName} to load the live ${providerValue} model catalog.`,
    syncStatus: "credential_required",
    syncedAt: new Date(),
  };
}

function createErrorCacheEntry(error) {
  return {
    models: [],
    syncMessage: error instanceof Error ? error.message : `${error}`,
    syncStatus: "error",
    syncedAt: new Date(),
  };
}

function buildSimpleEntries(providerValue, sourceUrl, values) {
  return dedupeModelEntries(
    values
      .map((value) => createModelEntry(providerValue, value, sourceUrl))
      .filter(Boolean),
  );
}

async function fetchOpenAiModels(_query, prisma) {
  const catalogUrl = "https://api.openai.com/v1/models";
  const credential = await resolveProviderCredential("openai", prisma);

  if (!credential.apiKey) {
    return createCredentialRequiredCacheEntry("openai", credential.envName);
  }

  const payload = await fetchJson(catalogUrl, {
    headers: {
      authorization: `Bearer ${credential.apiKey}`,
    },
  });
  const models = buildSimpleEntries(
    "openai",
    catalogUrl,
    (payload?.data || []).map((entry) => entry?.id).filter(Boolean),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} models from the authenticated OpenAI models API.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchAnthropicModels() {
  const sourceUrl = "https://docs.anthropic.com/en/docs/about-claude/models/all-models";
  const html = await fetchText(sourceUrl);
  const denylist = ["analytics", "amazon", "api", "best-practices", "features", "microsoft", "prompting", "skill", "vertex"];
  const models = buildSimpleEntries(
    "anthropic",
    sourceUrl,
    extractMatches(html, [/(claude-[0-9a-z-]+)/g], (value) => {
      if (!value.startsWith("claude-")) {
        return false;
      }

      return !denylist.some((token) => value.includes(token));
    }),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Anthropic's official catalog.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchGoogleModels() {
  const sourceUrl = "https://ai.google.dev/gemini-api/docs/models";
  const html = await fetchText(sourceUrl);
  const models = buildSimpleEntries(
    "google",
    sourceUrl,
    extractMatches(html, [/(gemini-[0-9a-z.-]+)/g], (value) => {
      if (!value.startsWith("gemini-")) {
        return false;
      }

      if (["card", "font", "logo", "table", "supported"].some((token) => value.includes(token))) {
        return false;
      }

      return /\d/.test(value) || value.includes("embedding");
    }),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Google's official Gemini reference.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchMistralModels() {
  const sourceUrl = "https://docs.mistral.ai/getting-started/models/models_overview/";
  const html = await fetchText(sourceUrl);
  const keepWithoutNumber = [
    "codestral",
    "codestral-latest",
    "devstral",
    "devstral-latest",
    "mistral-embed",
    "mistral-large",
    "mistral-medium",
    "mistral-moderation",
    "mistral-ocr",
    "mistral-saba",
    "mistral-saba-latest",
    "mistral-small",
    "pixtral",
    "pixtral-large",
    "voxtral",
  ];
  const denylist = ["api", "color", "compute", "next", "prompt", "safety", "tar", "vibe"];
  const models = buildSimpleEntries(
    "mistral",
    sourceUrl,
    extractMatches(
      html,
      [
        /(mistral-[a-z0-9.-]+)/gi,
        /(ministral-[a-z0-9.-]+)/gi,
        /(magistral-[a-z0-9.-]+)/gi,
        /(pixtral-[a-z0-9.-]+)/gi,
        /(codestral-[a-z0-9.-]+)/gi,
        /(voxtral-[a-z0-9.-]+)/gi,
        /(devstral-[a-z0-9.-]+)/gi,
        /(open-mistral-[a-z0-9.-]+)/gi,
        /(open-mixtral-[a-z0-9.-]+)/gi,
      ],
      (value) => {
        const normalizedValue = value.toLowerCase();

        if (denylist.some((token) => normalizedValue.includes(token))) {
          return false;
        }

        return /\d/.test(normalizedValue) || normalizedValue.endsWith("latest") || keepWithoutNumber.includes(normalizedValue);
      },
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Mistral's official model overview.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchCohereModels() {
  const sourceUrl = "https://docs.cohere.com/docs/models";
  const html = await fetchText(sourceUrl);
  const denylist = ["integration", "platforms", "refreshed", "report"];
  const models = buildSimpleEntries(
    "cohere",
    sourceUrl,
    extractMatches(
      html,
      [
        /(command-[a-z0-9.:-]+)/gi,
        /(embed-v[0-9.:-]+)/gi,
        /(rerank-v[0-9.:-]+)/gi,
        /(aya-[a-z0-9.:-]+)/gi,
        /(c4ai-aya-[a-z0-9.:-]+)/gi,
      ],
      (value) => {
        const normalizedValue = value.toLowerCase();

        if (denylist.some((token) => normalizedValue.includes(token))) {
          return false;
        }

        return normalizedValue.startsWith("command-") ||
          normalizedValue.startsWith("embed-v") ||
          normalizedValue.startsWith("rerank-v") ||
          normalizedValue.startsWith("aya-") ||
          normalizedValue.startsWith("c4ai-aya-");
      },
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Cohere's official model docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchXAiModels() {
  const sourceUrl = "https://docs.x.ai/developers/models/overview";
  const html = await fetchText(sourceUrl);
  const denylist = ["analytics", "engineering", "features", "prompt"];
  const models = buildSimpleEntries(
    "xai",
    sourceUrl,
    extractMatches(html, [/(grok-[0-9a-z-]+)/gi], (value) => {
      if (!value.startsWith("grok-")) {
        return false;
      }

      return !denylist.some((token) => value.includes(token));
    }),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from xAI's official model overview.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchMetaModels() {
  const sourceUrl = "https://huggingface.co/api/models?author=meta-llama&limit=200&full=false";
  const payload = await fetchJson(sourceUrl);
  const models = buildSimpleEntries(
    "meta",
    "https://github.com/meta-llama/llama-models",
    (payload || []).map((entry) => entry?.id).filter(Boolean),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} Meta-published model ids from the official meta-llama catalog feed.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchMicrosoftModels() {
  const sourceUrl = "https://learn.microsoft.com/en-us/azure/ai-foundry/model-inference/concepts/models";
  const html = await fetchText(sourceUrl);
  const denylist = ["and", "model", "models-sold-directly", "series"];
  const models = buildSimpleEntries(
    "microsoft",
    sourceUrl,
    extractMatches(
      html,
      [
        /(gpt-[0-9][0-9a-z.-]*)/gi,
        /(o[1-9](?:-[0-9a-z.-]+)?)/gi,
        /(phi-[0-9a-z.-]+)/gi,
        /(llama-[0-9a-z.-]+)/gi,
        /(mistral-[0-9a-z.-]+)/gi,
        /(claude-[0-9a-z.-]+)/gi,
        /(grok-[0-9a-z.-]+)/gi,
        /(deepseek-[0-9a-z.-]+)/gi,
        /(jamba-[0-9a-z.-]+)/gi,
      ],
      (value) => {
        if (denylist.some((token) => value.includes(token))) {
          return false;
        }

        return value.length <= 64 && /[a-z]/.test(value);
      },
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} Azure AI Foundry model ids from Microsoft's official docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchAmazonModels() {
  const sourceUrl = "https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html";
  const html = await fetchText(sourceUrl);
  const allowedPrefixes = [
    "ai21.",
    "amazon.",
    "anthropic.",
    "cohere.",
    "deepseek.",
    "meta.",
    "mistral.",
    "stability.",
  ];
  const models = buildSimpleEntries(
    "amazon",
    sourceUrl,
    extractMatches(
      html,
      [
        /(amazon\.[a-z0-9-:.]+)/gi,
        /(anthropic\.[a-z0-9-:.]+)/gi,
        /(meta\.[a-z0-9-:.]+)/gi,
        /(mistral\.[a-z0-9-:.]+)/gi,
        /(cohere\.[a-z0-9-:.]+)/gi,
        /(ai21\.[a-z0-9-:.]+)/gi,
        /(deepseek\.[a-z0-9-:.]+)/gi,
        /(stability\.[a-z0-9-:.]+)/gi,
      ],
      (value) =>
        allowedPrefixes.some((prefix) => value.startsWith(prefix)) &&
        !value.endsWith(".html") &&
        !value.endsWith(".com"),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} Bedrock model ids from Amazon's supported models reference.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchGroqModels() {
  const sourceUrl = "https://console.groq.com/docs/models";
  const html = await fetchText(sourceUrl);
  const models = buildSimpleEntries(
    "groq",
    sourceUrl,
    extractMatches(
      html,
      [
        /(llama-[0-9a-z.-]+)/gi,
        /(qwen-[0-9a-z.-]+)/gi,
        /(mixtral-[0-9a-z.-]+)/gi,
        /(whisper-[0-9a-z.-]+)/gi,
        /(playai-[0-9a-z.-]+)/gi,
        /(moonshotai\/[a-z0-9._-]+)/gi,
      ],
      (value) => !value.endsWith("-limits") && !value.endsWith("-price"),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Groq's official models docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchTogetherModels() {
  const sourceUrl = "https://docs.together.ai/docs/serverless-models";
  const html = await fetchText(sourceUrl);
  const allowedPrefixes = [
    "Qwen/",
    "anthropic/",
    "black-forest-labs/",
    "deepseek-ai/",
    "google/",
    "meta-llama/",
    "mistralai/",
    "moonshotai/",
    "openai/",
  ];
  const models = buildSimpleEntries(
    "together",
    sourceUrl,
    extractMatches(
      html,
      [/(?:[A-Za-z0-9_.-]+)\/[A-Za-z0-9_.:-]+/g],
      (value) =>
        allowedPrefixes.some((prefix) => value.startsWith(prefix)) &&
        !value.includes("mintlify") &&
        !value.endsWith(".js") &&
        !value.endsWith(".png") &&
        !value.endsWith(".svg") &&
        !value.endsWith(".woff2"),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Together AI's official serverless catalog.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchReplicateModels(query) {
  const normalizedQuery = collapseWhitespace(query);
  const sourceUrl = normalizedQuery
    ? `https://replicate.com/explore?q=${encodeURIComponent(normalizedQuery)}`
    : "https://replicate.com/collections/official";
  const html = await fetchText(sourceUrl);
  const models = buildSimpleEntries(
    "replicate",
    sourceUrl,
    extractMatches(
      html,
      [/\/([a-z0-9-]+\/[a-z0-9._-]+)(?=")/gi],
      (value) =>
        !value.startsWith("assets/") &&
        !value.startsWith("blog/") &&
        !value.startsWith("collections/") &&
        !value.includes(".jpg") &&
        !value.includes(".jpeg") &&
        !value.includes(".png") &&
        !value.includes(".webp") &&
        !value.includes(".js") &&
        !value.includes(".css"),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} public model slugs from Replicate's official catalog.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchHuggingFaceModels(query) {
  const normalizedQuery = collapseWhitespace(query);
  const sourceUrl = normalizedQuery
    ? `https://huggingface.co/api/models?search=${encodeURIComponent(normalizedQuery)}&limit=100`
    : "https://huggingface.co/api/models?sort=downloads&direction=-1&limit=100";
  const payload = await fetchJson(sourceUrl);
  const models = buildSimpleEntries(
    "huggingface",
    "https://huggingface.co/api/models",
    (payload || []).map((entry) => entry?.id).filter(Boolean),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from the public Hugging Face Hub API.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchDeepSeekModels() {
  const sourceUrl = "https://api-docs.deepseek.com/quick_start/pricing/";
  const html = await fetchText(sourceUrl);
  const models = buildSimpleEntries(
    "deepseek",
    sourceUrl,
    extractMatches(
      html,
      [
        /(deepseek-chat)/gi,
        /(deepseek-reasoner)/gi,
        /(deepseek-v[0-9a-z.-]+)/gi,
        /(deepseek-r[0-9a-z.-]+)/gi,
      ],
      (value) => value !== "deepseek-api" && value !== "deepseek-integration",
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from DeepSeek's official API docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchStabilityModels() {
  const sourceUrl = "https://platform.stability.ai/docs/getting-started/models";
  const html = await fetchText(sourceUrl);
  const scriptMatch = html.match(/src="(\/assets\/index-[^"]+\.js)"/i);

  if (!scriptMatch?.[1]) {
    throw new ProviderCatalogError("The Stability model bundle could not be discovered.", {
      status: "provider_catalog_source_failed",
      statusCode: 502,
    });
  }

  const scriptUrl = new URL(scriptMatch[1], sourceUrl).toString();
  const scriptText = await fetchText(scriptUrl);
  const denylist = ["api", "available", "icon", "logo", "release", "update"];
  const models = buildSimpleEntries(
    "stability",
    sourceUrl,
    extractMatches(
      scriptText,
      [/(stable-[a-z0-9-]+)/gi, /(sd3(?:[.-][0-9a-z-]+)+)/gi],
      (value) => !denylist.some((token) => value.includes(token)),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Stability's official developer platform assets.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchIbmModels() {
  const sourceUrl = "https://www.ibm.com/granite/docs/models/";
  const html = await fetchText(sourceUrl);
  const allowedFamilies = [
    "granite-",
  ];
  const models = buildSimpleEntries(
    "ibm",
    sourceUrl,
    extractMatches(html, [/(granite-[0-9a-z.-]+)/gi], (value) => {
      if (!allowedFamilies.some((prefix) => value.startsWith(prefix))) {
        return false;
      }

      return /\d/.test(value) || value.includes("vision") || value.includes("guardian") || value.includes("speech") || value.includes("embedding") || value.includes("time");
    }),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from IBM's Granite documentation.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchNvidiaModels() {
  const sourceUrl = "https://build.nvidia.com/explore/discover";
  const html = await fetchText(sourceUrl);
  const models = buildSimpleEntries(
    "nvidia",
    sourceUrl,
    extractMatches(
      html,
      [/href\\?":\\?"\/([a-z0-9-]+\/[a-z0-9._-]+)\\?"/gi, /href="\/([a-z0-9-]+\/[a-z0-9._-]+)"/gi],
      (value) =>
        value.includes("/") &&
        !value.startsWith("nemo/") &&
        !value.startsWith("nvidia/aiq") &&
        !value.startsWith("nvidia/cosmos-dataset-search") &&
        !value.startsWith("nvidia/video-search-and-summarization"),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} catalog slugs from NVIDIA build.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchFireworksModels() {
  const sourceUrl = "https://docs.fireworks.ai/models";
  const html = await fetchText(sourceUrl);
  const models = buildSimpleEntries(
    "fireworks",
    sourceUrl,
    extractMatches(
      html,
      [
        /(accounts\/fireworks\/models\/[A-Za-z0-9_.:-]+)/g,
        /(meta-llama\/[A-Za-z0-9_.:-]+)/g,
        /(deepseek-ai\/[A-Za-z0-9_.:-]+)/g,
        /(openai\/[A-Za-z0-9_.:-]+)/g,
        /(Qwen\/[A-Za-z0-9_.:-]+)/g,
      ],
      (value) =>
        !value.includes("mintlify") &&
        !value.endsWith(".js") &&
        !value.endsWith(".png") &&
        !value.endsWith(".svg"),
    ),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Fireworks AI's official catalog docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchPerplexityModels() {
  const sourceUrl = "https://docs.perplexity.ai/getting-started/models";
  const html = await fetchText(sourceUrl);
  const denylist = ["api", "banner", "browser", "finance", "get", "overview", "post", "sq", "use-cases", "vertical"];
  const models = buildSimpleEntries(
    "perplexity",
    sourceUrl,
    extractMatches(html, [/(sonar(?:-[a-z0-9-]+)?|r1-1776)/gi], (value) => {
      if (value === "r1-1776") {
        return true;
      }

      return !denylist.some((token) => value.includes(token));
    }),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from Perplexity's official models docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

async function fetchAi21Models() {
  const sourceUrl = "https://docs.ai21.com/docs/jamba-foundation-models";
  const html = await fetchText(sourceUrl);
  const denylist = ["api", "batch", "foundation-models", "response"];
  const models = buildSimpleEntries(
    "ai21",
    sourceUrl,
    extractMatches(html, [/(jamba(?:-[a-z0-9.-]+)?)/gi], (value) => !denylist.some((token) => value.includes(token))),
  );

  return {
    models,
    syncMessage: `Loaded ${models.length} model ids from AI21's official Jamba model docs.`,
    syncStatus: "ready",
    syncedAt: new Date(),
  };
}

const providerFetchers = Object.freeze({
  ai21: fetchAi21Models,
  amazon: fetchAmazonModels,
  anthropic: fetchAnthropicModels,
  cohere: fetchCohereModels,
  deepseek: fetchDeepSeekModels,
  fireworks: fetchFireworksModels,
  google: fetchGoogleModels,
  groq: fetchGroqModels,
  huggingface: fetchHuggingFaceModels,
  ibm: fetchIbmModels,
  meta: fetchMetaModels,
  microsoft: fetchMicrosoftModels,
  mistral: fetchMistralModels,
  nvidia: fetchNvidiaModels,
  openai: fetchOpenAiModels,
  perplexity: fetchPerplexityModels,
  replicate: fetchReplicateModels,
  stability: fetchStabilityModels,
  together: fetchTogetherModels,
  xai: fetchXAiModels,
});

async function loadProviderCatalog(providerValue, query, options = {}, prisma) {
  const normalizedProvider = normalizeProviderValue(providerValue);
  const provider = getAiProviderByValue(normalizedProvider);

  if (!provider) {
    throw new ProviderCatalogError(`Provider "${providerValue}" is not supported.`, {
      status: "provider_catalog_unsupported",
      statusCode: 400,
    });
  }

  const fetcher = providerFetchers[normalizedProvider];

  if (!fetcher) {
    throw new ProviderCatalogError(`Provider "${providerValue}" does not have a catalog sync handler yet.`, {
      status: "provider_catalog_unavailable",
      statusCode: 501,
    });
  }

  const cacheKey = buildCacheKey(normalizedProvider, normalizedProvider === "huggingface" || normalizedProvider === "replicate" ? query : "");
  const existingCacheEntry = PROVIDER_MODEL_CACHE.get(cacheKey);

  if (!options.forceRefresh && isFreshCacheEntry(existingCacheEntry)) {
    return createCatalogResponse(normalizedProvider, existingCacheEntry, query, {
      cached: true,
      limit: options.limit,
    });
  }

  try {
    const fetchedCatalog = await fetcher(query, prisma);
    const cacheEntry = {
      models: dedupeModelEntries(fetchedCatalog.models || []),
      syncMessage: fetchedCatalog.syncMessage || "Provider model catalog refreshed.",
      syncStatus: fetchedCatalog.syncStatus || "ready",
      syncedAt: fetchedCatalog.syncedAt instanceof Date ? fetchedCatalog.syncedAt : new Date(),
    };

    PROVIDER_MODEL_CACHE.set(cacheKey, cacheEntry);

    return createCatalogResponse(normalizedProvider, cacheEntry, query, {
      cached: false,
      limit: options.limit,
    });
  } catch (error) {
    const errorEntry = createErrorCacheEntry(error);

    PROVIDER_MODEL_CACHE.set(cacheKey, errorEntry);

    return createCatalogResponse(normalizedProvider, errorEntry, query, {
      cached: false,
      limit: options.limit,
    });
  }
}

export function getAiProviderCatalogSummary() {
  return {
    providers: searchAiProviders("").map((provider) =>
      buildCatalogSourceSummary(provider.value, PROVIDER_MODEL_CACHE.get(buildCacheKey(provider.value))),
    ),
    supportedProviderCount: searchAiProviders("").length,
  };
}

export function searchAiProviderCatalog(query = "") {
  const providers = searchAiProviders(query).map((provider) =>
    buildCatalogSourceSummary(provider.value, PROVIDER_MODEL_CACHE.get(buildCacheKey(provider.value))),
  );

  return {
    providers,
    query: collapseWhitespace(query),
    resultCount: providers.length,
    supportedProviderCount: searchAiProviders("").length,
  };
}

export async function searchAiProviderModels(providerValue, query, options = {}, prisma) {
  return loadProviderCatalog(providerValue, query, options, prisma);
}

export function createProviderCatalogErrorPayload(error) {
  if (error instanceof ProviderCatalogError) {
    return {
      body: {
        details: error.details || undefined,
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  console.error(error);

  return {
    body: {
      message: "An unexpected provider catalog error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}
