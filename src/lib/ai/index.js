import { generateObject } from "ai";
import { createOpenAI } from "@ai-sdk/openai";
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

function buildFallbackOptimization(input) {
  const baseBody = input.sourceBody || input.summary || input.title;
  const hashtags = normalizeHashtags(input.seedHashtags, input.platform === "INSTAGRAM" ? 6 : 4);

  if (input.platform === "FACEBOOK") {
    return {
      body: buildFallbackBody(baseBody, 20, 100),
      hashtags: [],
      metaDescription: "",
      metaTitle: "",
      slug: input.slugSeed,
      summary: truncateWords(input.summary || baseBody, 36),
      title: truncateWords(input.title, 10),
      warnings: ["AI optimization was unavailable, so NewsPub used a deterministic fallback formatter."],
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
      warnings: ["AI optimization was unavailable, so NewsPub used a deterministic fallback formatter."],
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
    warnings: ["AI optimization was unavailable, so NewsPub used a deterministic fallback formatter."],
  };
}

function normalizeGeneratedPayload(input, candidate) {
  const fallback = buildFallbackOptimization(input);
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
      warnings: dedupeStrings([...(fallback.warnings || []), ...(resolved.warnings || [])]),
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
      warnings: dedupeStrings([...(fallback.warnings || []), ...(resolved.warnings || [])]),
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
    warnings: dedupeStrings([...(fallback.warnings || []), ...(resolved.warnings || [])]),
  };
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
  if (!env.ai.enabled || !env.ai.openaiApiKey) {
    return null;
  }

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
 * policy scoring and media-readiness checks.
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
  const existingCache = force
    ? null
    : await db.optimizationCache.findUnique({
        where: {
          cacheKey,
        },
      });

  if (existingCache?.resultJson) {
    return {
      cacheHit: true,
      cacheRecord: existingCache,
      optimizationHash: input.optimizationHash,
      payload: existingCache.resultJson,
      policy: {
        readinessChecks: existingCache.resultJson?.readinessChecks || [],
        reasons: Array.isArray(existingCache.resultJson?.policyReasons) ? existingCache.resultJson.policyReasons : [],
        riskScore: existingCache.banRiskScore || 0,
        status: existingCache.policyStatus,
        warnings: Array.isArray(existingCache.resultJson?.policyWarnings) ? existingCache.resultJson.policyWarnings : [],
      },
    };
  }

  const pendingCache = existingCache
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
      });

  const mediaValidation =
    input.mediaUrl
      ? await validateRemoteMediaUrl(input.mediaUrl, {
          maxBytes: env.media.maxRemoteFileBytes,
          timeoutMs: 8000,
        })
      : null;
  let generatedPayload = null;
  let usedFallback = false;
  let provider = null;
  let model = null;
  let errorMessage = null;

  try {
    generatedPayload = await generateAiPayload(input);

    if (generatedPayload) {
      provider = "openai";
      model = env.ai.model;
    } else {
      usedFallback = true;
      generatedPayload = buildFallbackOptimization(input);
      provider = env.ai.enabled ? "fallback" : "disabled";
      model = env.ai.enabled ? env.ai.model : null;
    }
  } catch (error) {
    usedFallback = true;
    errorMessage = error instanceof Error ? error.message : "AI optimization failed.";
    generatedPayload = buildFallbackOptimization(input);
    provider = "fallback";
    model = env.ai.model;
  }

  const normalizedPayload = normalizeGeneratedPayload(input, generatedPayload);
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
  const cacheRecord = await db.optimizationCache.update({
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
      status: usedFallback ? "FALLBACK" : "COMPLETED",
      usedFallback,
      warningsJson: policy.warnings,
    },
  });

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
        optimizationStatus: usedFallback ? "FALLBACK" : "COMPLETED",
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
    cacheHit: false,
    cacheRecord,
    optimizationHash: input.optimizationHash,
    payload: resultPayload,
    policy,
  };
}
