/**
 * Bounded NewsPub AI optimization helpers with deterministic skip and fallback handling.
 */

import { z } from "zod";

import { evaluateDestinationPolicy } from "@/lib/content/policy";
import { env } from "@/lib/env/server";
import { validateRemoteMediaUrl } from "@/lib/media";
import { createContentHash, createSlug, dedupeStrings, normalizeSearchText, trimText } from "@/lib/news/shared";
import { sanitizeMediaUrl } from "@/lib/security";

const optimizedPayloadSchema = z.object({
  body: z.string().trim().max(6000).default(""),
  caption: z.string().trim().max(2200).default(""),
  hashtags: z.array(z.string().trim().min(1)).max(10).default([]),
  metaDescription: z.string().trim().max(320).default(""),
  metaTitle: z.string().trim().max(255).default(""),
  slug: z.string().trim().max(191).default(""),
  summary: z.string().trim().max(800).default(""),
  title: z.string().trim().min(1).max(255),
  warnings: z.array(z.string().trim().min(1)).max(8).default([]),
});

function countWords(value) {
  return trimText(value)
    .split(/\s+/)
    .filter(Boolean).length;
}

function splitSentences(value) {
  return trimText(value)
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+/)
    .map((entry) => trimText(entry))
    .filter(Boolean);
}

function truncateWords(value, maxWords) {
  const words = trimText(value).split(/\s+/).filter(Boolean);

  if (words.length <= maxWords) {
    return words.join(" ");
  }

  return `${words.slice(0, maxWords).join(" ").replace(/[,:;]+$/, "")}.`;
}

function compactParagraphs(value) {
  return trimText(value)
    .replace(/\r\n/g, "\n")
    .split(/\n{2,}/)
    .map((entry) => trimText(entry))
    .filter(Boolean);
}

function pickSourceBody(post, translation) {
  return trimText(
    post?.sourceArticle?.body || translation?.contentMd || translation?.summary || post?.excerpt || "",
  );
}

function pickSummary(post, translation) {
  return trimText(translation?.summary || post?.excerpt || post?.sourceArticle?.summary || translation?.title || "");
}

function normalizeHashtags(value, maxCount) {
  const tokens = Array.isArray(value)
    ? value
    : trimText(value)
        .split(/\s+/)
        .filter(Boolean);

  return dedupeStrings(
    tokens
      .map((entry) => trimText(entry).replace(/^#+/, ""))
      .filter(Boolean),
  )
    .slice(0, maxCount)
    .map((entry) => `#${createSlug(entry, "news")}`);
}

function buildFallbackBody(sourceText, minWords, maxWords) {
  const sentences = splitSentences(sourceText);
  const selected = [];

  for (const sentence of sentences) {
    selected.push(sentence);

    if (countWords(selected.join(" ")) >= minWords) {
      break;
    }
  }

  return truncateWords(selected.join(" ") || sourceText, maxWords);
}

function buildAiResolution({
  errorMessage = null,
  model = null,
  provider = null,
  reasonCode,
  reasonMessage,
  status,
}) {
  return {
    errorMessage,
    model,
    provider,
    reasonCode,
    reasonMessage,
    status,
    usedDeterministicFallback: status !== "COMPLETED",
  };
}

function getFallbackWarning(aiResolution) {
  if (aiResolution?.status === "SKIPPED") {
    return "AI optimization was skipped, so NewsPub used a deterministic formatter.";
  }

  return "AI optimization was unavailable, so NewsPub used a deterministic fallback formatter.";
}

function buildFallbackOptimization(input, { aiResolution = null, includeFallbackWarning = true } = {}) {
  const baseBody = input.sourceBody || input.summary || input.title;
  const hashtags = normalizeHashtags(input.seedHashtags, input.platform === "INSTAGRAM" ? 6 : 4);
  const warnings = includeFallbackWarning ? [getFallbackWarning(aiResolution)] : [];

  if (input.platform === "FACEBOOK") {
    return {
      body: buildFallbackBody(baseBody, 20, 100),
      hashtags: [],
      metaDescription: "",
      metaTitle: "",
      slug: input.slugSeed,
      summary: truncateWords(input.summary || baseBody, 36),
      title: truncateWords(input.title, 10),
      warnings,
    };
  }

  if (input.platform === "INSTAGRAM") {
    const caption = truncateWords(
      [
        input.title,
        input.summary,
        input.sourceAttribution,
      ]
        .filter(Boolean)
        .join(" "),
      120,
    );

    return {
      body: "",
      caption,
      hashtags,
      metaDescription: "",
      metaTitle: "",
      slug: input.slugSeed,
      summary: truncateWords(input.summary || baseBody, 36),
      title: truncateWords(input.title, 12),
      warnings,
    };
  }

  return {
    body: buildFallbackBody(baseBody, 100, 500),
    hashtags: [],
    metaDescription: truncateWords(input.summary || baseBody, 28),
    metaTitle: truncateWords(input.title, 14),
    slug: input.slugSeed,
    summary: truncateWords(input.summary || baseBody, 42),
    title: truncateWords(input.title, 14),
    warnings,
  };
}

function normalizeGeneratedPayload(input, candidate, { aiResolution = null, usedFallback = false } = {}) {
  const fallback = buildFallbackOptimization(input, {
    aiResolution,
    includeFallbackWarning: usedFallback,
  });
  const resolved = {
    ...fallback,
    ...(candidate || {}),
  };
  const maxInstagramHashtags = env.meta.socialGuardrails.instagramMaxHashtags;
  const normalizedHashtags = normalizeHashtags(
    resolved.hashtags,
    input.platform === "INSTAGRAM" ? maxInstagramHashtags : 6,
  );

  if (input.platform === "FACEBOOK") {
    return {
      body: buildFallbackBody(resolved.body || fallback.body, 20, 100),
      caption: "",
      hashtags: [],
      metaDescription: "",
      metaTitle: "",
      slug: input.slugSeed,
      sourceAttribution: input.sourceAttribution,
      summary: truncateWords(resolved.summary || fallback.summary, 36),
      title: truncateWords(resolved.title || fallback.title, 10),
      warnings: dedupeStrings([...(usedFallback ? fallback.warnings || [] : []), ...(resolved.warnings || [])]),
    };
  }

  if (input.platform === "INSTAGRAM") {
    const caption = truncateWords(
      resolved.caption || resolved.body || fallback.caption,
      120,
    );

    return {
      body: "",
      caption,
      hashtags: normalizedHashtags,
      metaDescription: "",
      metaTitle: "",
      slug: input.slugSeed,
      sourceAttribution: input.sourceAttribution,
      summary: truncateWords(resolved.summary || fallback.summary, 36),
      title: truncateWords(resolved.title || fallback.title, 12),
      warnings: dedupeStrings([...(usedFallback ? fallback.warnings || [] : []), ...(resolved.warnings || [])]),
    };
  }

  return {
    body: buildFallbackBody(resolved.body || fallback.body, 100, 500),
    caption: "",
    hashtags: [],
    metaDescription: truncateWords(resolved.metaDescription || resolved.summary || fallback.metaDescription, 32),
    metaTitle: truncateWords(resolved.metaTitle || resolved.title || fallback.metaTitle, 14),
    slug: createSlug(resolved.slug || resolved.title || input.slugSeed, input.slugSeed),
    sourceAttribution: input.sourceAttribution,
    summary: truncateWords(resolved.summary || fallback.summary, 42),
    title: truncateWords(resolved.title || fallback.title, 14),
    warnings: dedupeStrings([...(usedFallback ? fallback.warnings || [] : []), ...(resolved.warnings || [])]),
  };
}

function resolveAiSkipResolution() {
  if (!env.ai.enabled) {
    return buildAiResolution({
      provider: "disabled",
      reasonCode: "ai_disabled",
      reasonMessage: "AI optimization is disabled, so NewsPub used deterministic formatting instead.",
      status: "SKIPPED",
    });
  }

  if (!env.ai.openaiApiKey) {
    return buildAiResolution({
      model: env.ai.model,
      provider: "disabled",
      reasonCode: "ai_credentials_missing",
      reasonMessage: "AI credentials are missing, so NewsPub used deterministic formatting instead.",
      status: "SKIPPED",
    });
  }

  return null;
}

function classifyAiFailure(error) {
  const errorMessage = error instanceof Error ? error.message : "AI optimization failed.";
  const normalizedMessage = trimText(errorMessage).toLowerCase();

  if (normalizedMessage.includes("timed out")) {
    return buildAiResolution({
      errorMessage,
      model: env.ai.model,
      provider: "fallback",
      reasonCode: "ai_timeout",
      reasonMessage: "AI optimization timed out, so NewsPub used deterministic fallback formatting instead.",
      status: "FALLBACK",
    });
  }

  if (
    normalizedMessage.includes("schema")
    || normalizedMessage.includes("structured")
    || normalizedMessage.includes("validation")
  ) {
    return buildAiResolution({
      errorMessage,
      model: env.ai.model,
      provider: "fallback",
      reasonCode: "ai_invalid_structured_output",
      reasonMessage: "AI optimization returned invalid structured output, so NewsPub used deterministic fallback formatting instead.",
      status: "FALLBACK",
    });
  }

  if (normalizedMessage.includes("rate limit") || normalizedMessage.includes("too many requests")) {
    return buildAiResolution({
      errorMessage,
      model: env.ai.model,
      provider: "fallback",
      reasonCode: "ai_rate_limited",
      reasonMessage: "AI optimization was rate limited, so NewsPub used deterministic fallback formatting instead.",
      status: "FALLBACK",
    });
  }

  return buildAiResolution({
    errorMessage,
    model: env.ai.model,
    provider: "fallback",
    reasonCode: "ai_unavailable",
    reasonMessage: "AI optimization was unavailable, so NewsPub used deterministic fallback formatting instead.",
    status: "FALLBACK",
  });
}

function buildCachedAiResolution(cacheRecord) {
  const existingResolution = cacheRecord?.resultJson?.aiResolution;

  if (existingResolution?.status) {
    return existingResolution;
  }

  if (cacheRecord?.status === "SKIPPED") {
    return buildAiResolution({
      model: cacheRecord?.model || null,
      provider: cacheRecord?.provider || "disabled",
      reasonCode: "cached_ai_skip",
      reasonMessage: "NewsPub reused cached deterministic content from an AI-skipped optimization run.",
      status: "SKIPPED",
    });
  }

  if (cacheRecord?.status === "FALLBACK") {
    return buildAiResolution({
      errorMessage: cacheRecord?.errorMessage || null,
      model: cacheRecord?.model || null,
      provider: cacheRecord?.provider || "fallback",
      reasonCode: "cached_ai_fallback",
      reasonMessage: "NewsPub reused cached deterministic content from an AI fallback optimization run.",
      status: "FALLBACK",
    });
  }

  return buildAiResolution({
    model: cacheRecord?.model || null,
    provider: cacheRecord?.provider || "openai",
    reasonCode: "ai_completed",
    reasonMessage: "AI-assisted optimization completed successfully.",
    status: "COMPLETED",
  });
}

function buildOptimizationPrompt(input) {
  const sharedRules = [
    "Preserve factual meaning exactly.",
    "Do not invent names, claims, statistics, quotes, or events.",
    "Keep source attribution visible and do not remove it.",
    "Avoid deceptive, sensational, hateful, or unsafe language.",
    "Keep the output concise and production-ready.",
  ];

  const platformRules =
    input.platform === "FACEBOOK"
      ? [
          "Return a title of at most 10 words.",
          "Return body copy between 20 and 100 words.",
          "Do not add hashtags.",
        ]
      : input.platform === "INSTAGRAM"
        ? [
            "Return a concise caption for Instagram.",
            `Keep hashtags to at most ${env.meta.socialGuardrails.instagramMaxHashtags} high-quality tags.`,
            "Do not use spammy repetition.",
          ]
        : [
            "Return a website headline with fewer than 15 words.",
            "Return a readable website body between 100 and 500 words when source material allows it.",
            "Return SEO-friendly meta title and meta description fields.",
          ];

  return [
    "NewsPub destination optimization request",
    `Platform: ${input.platform}`,
    `Destination kind: ${input.destinationKind}`,
    `Locale: ${input.locale}`,
    "",
    "Rules:",
    ...sharedRules.map((rule) => `- ${rule}`),
    ...platformRules.map((rule) => `- ${rule}`),
    "",
    `Source title: ${input.title}`,
    `Source summary: ${input.summary}`,
    `Source attribution: ${input.sourceAttribution}`,
    `Canonical URL: ${input.canonicalUrl}`,
    `Media URL: ${input.mediaUrl || "none"}`,
    "",
    "Source body:",
    input.sourceBody,
  ].join("\n");
}

function buildOptimizationInput({
  destination,
  post,
  stream,
  template,
  translation,
}) {
  const title = trimText(translation?.title || post?.slug || "Story");
  const summary = pickSummary(post, translation) || title;
  const sourceBody = truncateWords(pickSourceBody(post, translation), env.ai.maxSourceChars);
  const mediaUrl = sanitizeMediaUrl(
    post?.sourceArticle?.imageUrl ||
      translation?.seoRecord?.ogImage?.sourceUrl ||
      translation?.seoRecord?.ogImage?.publicUrl ||
      post?.featuredImage?.sourceUrl ||
      post?.featuredImage?.publicUrl ||
      "",
  );
  const sourceAttribution = trimText(
    translation?.sourceAttribution || `Source: ${post?.sourceName}${post?.sourceUrl ? ` - ${post.sourceUrl}` : ""}`,
  );
  const seedHashtags = [
    ...(Array.isArray(translation?.seoRecord?.keywordsJson) ? translation.seoRecord.keywordsJson : []),
    ...(compactParagraphs(template?.hashtagsTemplate).length ? compactParagraphs(template.hashtagsTemplate) : []),
  ];
  const contentHash = createContentHash(
    title,
    summary,
    sourceBody,
    sourceAttribution,
    mediaUrl,
  );
  const settingsHash = createContentHash(
    destination?.platform,
    destination?.kind,
    stream?.locale,
    JSON.stringify(destination?.settingsJson || {}),
    template?.bodyTemplate || "",
    template?.summaryTemplate || "",
    template?.titleTemplate || "",
    template?.hashtagsTemplate || "",
  );
  const optimizationHash = createContentHash(contentHash, settingsHash);

  return {
    canonicalUrl: translation?.seoRecord?.canonicalUrl || "",
    contentHash,
    destinationKind: destination?.kind || "WEBSITE",
    locale: stream?.locale || translation?.locale || "en",
    mediaUrl,
    optimizationHash,
    platform: destination?.platform || "WEBSITE",
    seedHashtags,
    settingsHash,
    slugSeed: createSlug(title, "story"),
    sourceAttribution,
    sourceBody,
    summary,
    title,
  };
}

async function runWithTimeout(task, timeoutMs) {
  let timeoutId = null;

  try {
    return await Promise.race([
      task(),
      new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
          reject(new Error(`AI optimization timed out after ${timeoutMs}ms.`));
        }, timeoutMs);
      }),
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function generateAiPayload(input) {
  const [{ generateObject }, { createOpenAI }] = await Promise.all([
    import("ai"),
    import("@ai-sdk/openai"),
  ]);
  const openai = createOpenAI({
    apiKey: env.ai.openaiApiKey,
  });
  const result = await runWithTimeout(
    () =>
      generateObject({
        model: openai(env.ai.model),
        prompt: buildOptimizationPrompt(input),
        schema: optimizedPayloadSchema,
        schemaDescription: "Destination-specific optimized NewsPub content payload.",
        schemaName: "optimized_destination_payload",
        system:
          "You rewrite NewsPub content for specific publishing destinations without changing the underlying facts.",
      }),
    env.ai.requestTimeoutMs,
  );

  return result.object;
}

/**
 * Returns a cached or freshly generated destination payload together with
 * policy scoring, skip-or-fallback AI state, and media-readiness checks.
 */
export async function optimizeDestinationPayload(
  {
    articleMatch,
    destination,
    force = false,
    post,
    stream,
    template,
    translation,
  },
  db,
) {
  const input = buildOptimizationInput({
    destination,
    post,
    stream,
    template,
    translation,
  });
  const cacheKey = input.optimizationHash;
  const hasOptimizationCacheDelegate = typeof db.optimizationCache?.findUnique === "function";
  const existingCache = force
    ? null
    : hasOptimizationCacheDelegate
      ? await db.optimizationCache.findUnique({
        where: {
          cacheKey,
        },
      })
      : null;

  if (existingCache?.resultJson) {
    const aiResolution = buildCachedAiResolution(existingCache);

    return {
      aiResolution,
      cacheHit: true,
      cacheRecord: existingCache,
      optimizationHash: input.optimizationHash,
      payload: {
        ...existingCache.resultJson,
        aiResolution,
      },
      policy: {
        readinessChecks: existingCache.resultJson?.readinessChecks || [],
        reasons: Array.isArray(existingCache.resultJson?.policyReasons) ? existingCache.resultJson.policyReasons : [],
        riskScore: existingCache.banRiskScore || 0,
        status: existingCache.policyStatus,
        warnings: Array.isArray(existingCache.resultJson?.policyWarnings) ? existingCache.resultJson.policyWarnings : [],
      },
    };
  }

  const pendingCache = hasOptimizationCacheDelegate
    ? existingCache
      ? await db.optimizationCache.update({
        where: {
          id: existingCache.id,
        },
        data: {
          errorMessage: null,
          status: "PENDING",
        },
      })
      : await db.optimizationCache.create({
        data: {
          cacheKey,
          contentHash: input.contentHash,
          destinationKind: input.destinationKind,
          locale: input.locale,
          optimizationHash: input.optimizationHash,
          platform: input.platform,
          settingsHash: input.settingsHash,
          status: "PENDING",
        },
      })
    : {
        id: null,
        status: "PENDING",
      };

  const mediaValidation =
    input.mediaUrl
      ? await validateRemoteMediaUrl(input.mediaUrl, {
          maxBytes: env.media.maxRemoteFileBytes,
          timeoutMs: 8000,
        })
      : null;
  let generatedPayload = null;
  let aiResolution = null;
  let provider = null;
  let model = null;
  let errorMessage = null;
  const skippedResolution = resolveAiSkipResolution();

  if (skippedResolution) {
    aiResolution = skippedResolution;
    generatedPayload = buildFallbackOptimization(input, {
      aiResolution,
    });
    provider = aiResolution.provider;
    model = aiResolution.model;
  } else {
    try {
      generatedPayload = await generateAiPayload(input);
      provider = "openai";
      model = env.ai.model;
      aiResolution = buildAiResolution({
        model,
        provider,
        reasonCode: "ai_completed",
        reasonMessage: "AI-assisted optimization completed successfully.",
        status: "COMPLETED",
      });
    } catch (error) {
      aiResolution = classifyAiFailure(error);
      generatedPayload = buildFallbackOptimization(input, {
        aiResolution,
      });
      provider = aiResolution.provider;
      model = aiResolution.model;
      errorMessage = aiResolution.errorMessage;
    }
  }

  const usedFallback = aiResolution.status !== "COMPLETED";
  const normalizedPayload = normalizeGeneratedPayload(input, generatedPayload, {
    aiResolution,
    usedFallback,
  });
  const policy = evaluateDestinationPolicy({
    destination,
    mediaValidation,
    payload: {
      ...normalizedPayload,
      canonicalUrl: input.canonicalUrl,
      mediaUrl: mediaValidation?.ok ? input.mediaUrl : null,
    },
    platform: input.platform,
  });
  const resultPayload = {
    aiResolution,
    ...normalizedPayload,
    cacheKey,
    canonicalUrl: input.canonicalUrl,
    mediaUrl: mediaValidation?.ok ? input.mediaUrl : null,
    mediaValidation,
    policyReasons: policy.reasons,
    policyWarnings: policy.warnings,
    readinessChecks: policy.readinessChecks,
    sourceAttribution: input.sourceAttribution,
  };
  const cacheRecord = hasOptimizationCacheDelegate
    ? await db.optimizationCache.update({
        where: {
          id: pendingCache.id,
        },
        data: {
          banRiskScore: policy.riskScore,
          errorMessage,
          model,
          policyStatus: policy.status,
          provider,
          resultJson: resultPayload,
          status: aiResolution.status,
          usedFallback,
          warningsJson: policy.warnings,
        },
      })
    : {
        ...pendingCache,
        banRiskScore: policy.riskScore,
        errorMessage,
        model,
        policyStatus: policy.status,
        provider,
        resultJson: resultPayload,
        status: aiResolution.status,
        usedFallback,
        warningsJson: policy.warnings,
      };

  if (articleMatch?.id) {
    await db.articleMatch.update({
      where: {
        id: articleMatch.id,
      },
      data: {
        banRiskScore: policy.riskScore,
        lastOptimizedAt: new Date(),
        lastPolicyCheckedAt: new Date(),
        optimizationCacheId: cacheRecord.id,
        optimizationHash: input.optimizationHash,
        optimizationStatus: aiResolution.status,
        optimizedPayloadJson: resultPayload,
        policyReasonsJson: policy.reasons,
        policyStatus: policy.status,
        readinessChecksJson: policy.readinessChecks,
        workflowStage:
          policy.status === "BLOCK"
            ? "HELD"
            : stream?.mode === "REVIEW_REQUIRED"
              ? "REVIEW_REQUIRED"
              : "OPTIMIZED",
      },
    });
  }

  return {
    aiResolution,
    cacheHit: false,
    cacheRecord,
    optimizationHash: input.optimizationHash,
    payload: resultPayload,
    policy,
  };
}
