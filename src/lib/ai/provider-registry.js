const providerCatalog = [
  {
    aliases: ["gpt", "o-series", "responses"],
    catalogSourceLabel: "Authenticated Models API",
    docsUrl: "https://platform.openai.com/docs/models",
    label: "OpenAI",
    searchHint: "Store an API key, then search the live OpenAI models API.",
    value: "openai",
  },
  {
    aliases: ["claude"],
    catalogSourceLabel: "Official Claude models docs",
    docsUrl: "https://docs.anthropic.com/en/docs/about-claude/models/all-models",
    label: "Anthropic",
    searchHint: "Search the official Claude model catalog from Anthropic docs.",
    value: "anthropic",
  },
  {
    aliases: ["gemini", "vertex", "makersuite"],
    catalogSourceLabel: "Google AI model reference",
    docsUrl: "https://ai.google.dev/gemini-api/docs/models",
    label: "Google",
    searchHint: "Search the official Gemini and Google AI model reference.",
    value: "google",
  },
  {
    aliases: ["codestral", "pixtral", "ministral", "magistral", "voxtral"],
    catalogSourceLabel: "Mistral model overview",
    docsUrl: "https://docs.mistral.ai/getting-started/models/models_overview/",
    label: "Mistral AI",
    searchHint: "Search the official Mistral model overview.",
    value: "mistral",
  },
  {
    aliases: ["command", "embed", "rerank", "aya"],
    catalogSourceLabel: "Cohere model reference",
    docsUrl: "https://docs.cohere.com/docs/models",
    label: "Cohere",
    searchHint: "Search the official Cohere model catalog.",
    value: "cohere",
  },
  {
    aliases: ["grok"],
    catalogSourceLabel: "xAI model overview",
    docsUrl: "https://docs.x.ai/developers/models/overview",
    label: "xAI",
    searchHint: "Search the official xAI Grok model overview.",
    value: "xai",
  },
  {
    aliases: ["llama", "meta-llama"],
    catalogSourceLabel: "Official Meta Llama repositories",
    docsUrl: "https://github.com/meta-llama/llama-models",
    label: "Meta Platforms",
    searchHint: "Search the official Meta-published Llama model catalog.",
    value: "meta",
  },
  {
    aliases: ["azure", "azure openai", "foundry", "phi"],
    catalogSourceLabel: "Azure AI Foundry model docs",
    docsUrl: "https://learn.microsoft.com/en-us/azure/ai-foundry/model-inference/concepts/models",
    label: "Microsoft",
    searchHint: "Search the Azure AI Foundry and Azure OpenAI model catalog.",
    value: "microsoft",
  },
  {
    aliases: ["bedrock", "nova", "titan"],
    catalogSourceLabel: "Amazon Bedrock model reference",
    docsUrl: "https://docs.aws.amazon.com/bedrock/latest/userguide/models-supported.html",
    label: "Amazon",
    searchHint: "Search the official Amazon Bedrock supported models list.",
    value: "amazon",
  },
  {
    aliases: ["groqcloud", "llama", "whisper"],
    catalogSourceLabel: "Groq model docs",
    docsUrl: "https://console.groq.com/docs/models",
    label: "Groq",
    searchHint: "Search the official Groq model catalog.",
    value: "groq",
  },
  {
    aliases: ["serverless", "turbo", "together"],
    catalogSourceLabel: "Together AI serverless models",
    docsUrl: "https://docs.together.ai/docs/serverless-models",
    label: "Together AI",
    searchHint: "Search Together AI serverless models from the official docs.",
    value: "together",
  },
  {
    aliases: ["explore", "official collection"],
    catalogSourceLabel: "Replicate official model collections",
    docsUrl: "https://replicate.com/collections/official",
    label: "Replicate",
    searchHint: "Search the Replicate official collection or paste a public model slug.",
    value: "replicate",
  },
  {
    aliases: ["hf", "hub", "transformers"],
    catalogSourceLabel: "Hugging Face Hub search API",
    docsUrl: "https://huggingface.co/api/models",
    label: "Hugging Face",
    searchHint: "Type a query to search the public Hugging Face model hub.",
    value: "huggingface",
  },
  {
    aliases: ["reasoner", "deepseek-chat"],
    catalogSourceLabel: "DeepSeek API docs",
    docsUrl: "https://api-docs.deepseek.com/quick_start/pricing/",
    label: "DeepSeek",
    searchHint: "Search the official DeepSeek model and pricing reference.",
    value: "deepseek",
  },
  {
    aliases: ["stable diffusion", "stable image", "sd3"],
    catalogSourceLabel: "Stability developer platform",
    docsUrl: "https://platform.stability.ai/docs/getting-started/models",
    label: "Stability AI",
    searchHint: "Search the official Stability developer platform catalog.",
    value: "stability",
  },
  {
    aliases: ["granite", "watsonx"],
    catalogSourceLabel: "IBM Granite docs",
    docsUrl: "https://www.ibm.com/granite/docs/models/",
    label: "IBM",
    searchHint: "Search the official Granite model catalog.",
    value: "ibm",
  },
  {
    aliases: ["build", "nemotron", "nim"],
    catalogSourceLabel: "NVIDIA build catalog",
    docsUrl: "https://build.nvidia.com/explore/discover",
    label: "NVIDIA",
    searchHint: "Search the NVIDIA build catalog for hosted models.",
    value: "nvidia",
  },
  {
    aliases: ["firefunction", "accounts/fireworks/models"],
    catalogSourceLabel: "Fireworks model docs",
    docsUrl: "https://docs.fireworks.ai/models",
    label: "Fireworks AI",
    searchHint: "Search the official Fireworks AI models reference.",
    value: "fireworks",
  },
  {
    aliases: ["sonar", "deep research"],
    catalogSourceLabel: "Perplexity models docs",
    docsUrl: "https://docs.perplexity.ai/getting-started/models",
    label: "Perplexity AI",
    searchHint: "Search the official Perplexity Sonar model catalog.",
    value: "perplexity",
  },
  {
    aliases: ["jamba"],
    catalogSourceLabel: "AI21 model docs",
    docsUrl: "https://docs.ai21.com/docs/jamba-foundation-models",
    label: "AI21 Labs",
    searchHint: "Search the official AI21 Jamba model catalog.",
    value: "ai21",
  },
];

export const aiProviderCatalog = Object.freeze(
  providerCatalog.map((provider) =>
    Object.freeze({
      ...provider,
      aliases: Object.freeze(provider.aliases),
    }),
  ),
);

export const supportedAiProviderValues = Object.freeze(
  aiProviderCatalog.map((provider) => provider.value),
);

const providerMap = new Map(aiProviderCatalog.map((provider) => [provider.value, provider]));

function normalizeSearchValue(value) {
  return `${value || ""}`.trim().toLowerCase();
}

export function getAiProviderByValue(value) {
  return providerMap.get(normalizeSearchValue(value)) || null;
}

export function getAiProviderLabel(value) {
  return getAiProviderByValue(value)?.label || `${value || ""}`;
}

export function getProviderApiKeyEnvName(provider) {
  const normalizedProvider = normalizeSearchValue(provider);

  if (!normalizedProvider) {
    return "PROVIDER_API_KEY";
  }

  if (normalizedProvider === "google") {
    return "GOOGLE_API_KEY";
  }

  return `${normalizedProvider.toUpperCase().replace(/[^A-Z0-9]+/g, "_")}_API_KEY`;
}

export function searchAiProviders(query) {
  const normalizedQuery = normalizeSearchValue(query);

  if (!normalizedQuery) {
    return aiProviderCatalog;
  }

  return aiProviderCatalog.filter((provider) => {
    const haystack = [provider.value, provider.label, ...provider.aliases].join(" ").toLowerCase();

    return haystack.includes(normalizedQuery);
  });
}
