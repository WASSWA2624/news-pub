import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function countWords(value) {
  return `${value || ""}`
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function createLongSourceBody(sentenceCount = 28) {
  return Array.from(
    { length: sentenceCount },
    (_, index) => `Sentence ${index + 1} shares verified reporting from the source desk for NewsPub readers.`,
  ).join(" ");
}

function createOptimizationFixture(overrides = {}) {
  return {
    articleMatch: {
      id: "match_1",
    },
    destination: {
      id: "destination_1",
      kind: "WEBSITE",
      platform: "WEBSITE",
      settingsJson: {},
      ...overrides.destination,
    },
    post: {
      excerpt: "Verified source summary for editorial review.",
      featuredImage: null,
      slug: "verified-story",
      sourceArticle: {
        body: createLongSourceBody(),
        imageUrl: null,
        summary: "Verified source summary for editorial review.",
      },
      sourceName: "Example Source",
      sourceUrl: "https://example.com/source-story",
      ...overrides.post,
    },
    stream: {
      id: "stream_1",
      locale: "en",
      mode: "AUTO_PUBLISH",
      ...overrides.stream,
    },
    template: {
      bodyTemplate: "{{body}}",
      hashtagsTemplate: "news update world desk visual bulletin",
      summaryTemplate: "{{summary}}",
      titleTemplate: "{{title}}",
      ...overrides.template,
    },
    translation: {
      contentMd: createLongSourceBody(),
      locale: "en",
      seoRecord: {
        canonicalUrl: "https://example.com/en/news/verified-story",
        keywordsJson: ["news", "update", "world", "desk", "visual", "bulletin"],
        ogImage: null,
      },
      sourceAttribution: "Source: Example Source - https://example.com/source-story",
      summary: "Verified source summary for editorial review.",
      title: "Verified Source Story For Editorial Review",
      ...overrides.translation,
    },
  };
}

function createOptimizationDb(overrides = {}) {
  return {
    articleMatch: {
      update: vi.fn().mockResolvedValue({
        id: "match_1",
      }),
      ...(overrides.articleMatch || {}),
    },
    optimizationCache: {
      create: vi.fn().mockImplementation(async ({ data }) => ({
        id: "cache_1",
        ...data,
      })),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockImplementation(async ({ where, data }) => ({
        id: where?.id || "cache_1",
        ...data,
      })),
      ...(overrides.optimizationCache || {}),
    },
  };
}

describe("destination optimization", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("reuses cached optimizations when the content and settings hashes are unchanged", async () => {
    process.env.AI_OPTIMIZATION_ENABLED = "false";

    const cachedPayload = {
      body: "Cached website body copy.",
      policyReasons: [],
      policyWarnings: [],
      readinessChecks: [],
      summary: "Cached summary",
      title: "Cached title",
    };
    const db = createOptimizationDb({
      optimizationCache: {
        create: vi.fn(),
        findUnique: vi.fn().mockResolvedValue({
          banRiskScore: 0,
          id: "cache_existing",
          policyStatus: "PASS",
          resultJson: cachedPayload,
        }),
        update: vi.fn(),
      },
    });
    const { optimizeDestinationPayload } = await import("./index");

    const result = await optimizeDestinationPayload(createOptimizationFixture(), db);

    expect(result.cacheHit).toBe(true);
    expect(result.payload).toEqual(cachedPayload);
    expect(result.policy).toEqual({
      readinessChecks: [],
      reasons: [],
      riskScore: 0,
      status: "PASS",
      warnings: [],
    });
    expect(db.optimizationCache.create).not.toHaveBeenCalled();
    expect(db.optimizationCache.update).not.toHaveBeenCalled();
  });

  it("uses deterministic fallback formatting when AI is disabled for website output", async () => {
    process.env.AI_OPTIMIZATION_ENABLED = "false";

    const db = createOptimizationDb();
    const { optimizeDestinationPayload } = await import("./index");
    const result = await optimizeDestinationPayload(
      createOptimizationFixture({
        destination: {
          kind: "WEBSITE",
          platform: "WEBSITE",
        },
      }),
      db,
    );

    expect(result.cacheHit).toBe(false);
    expect(result.cacheRecord.status).toBe("FALLBACK");
    expect(countWords(result.payload.title)).toBeLessThan(15);
    expect(countWords(result.payload.body)).toBeGreaterThanOrEqual(100);
    expect(countWords(result.payload.body)).toBeLessThanOrEqual(500);
    expect(result.payload.metaTitle).toBeTruthy();
    expect(result.payload.metaDescription).toBeTruthy();
  });

  it("normalizes facebook AI output back into the supported title and body bounds", async () => {
    process.env.OPENAI_API_KEY = "openai-key";

    vi.doMock("ai", () => ({
      generateObject: vi.fn().mockResolvedValue({
        object: {
          body: Array.from({ length: 140 }, (_, index) => `facebook${index + 1}`).join(" "),
          title: "This Facebook title is intentionally much too long for the configured channel",
          warnings: [],
        },
      }),
    }));
    vi.doMock("@ai-sdk/openai", () => ({
      createOpenAI: () => () => "mock-model",
    }));

    const db = createOptimizationDb();
    const { optimizeDestinationPayload } = await import("./index");
    const result = await optimizeDestinationPayload(
      createOptimizationFixture({
        destination: {
          kind: "FACEBOOK_PAGE",
          platform: "FACEBOOK",
        },
      }),
      db,
    );

    expect(result.cacheRecord.status).toBe("COMPLETED");
    expect(countWords(result.payload.title)).toBeLessThanOrEqual(10);
    expect(countWords(result.payload.body)).toBeGreaterThanOrEqual(20);
    expect(countWords(result.payload.body)).toBeLessThanOrEqual(100);
    expect(result.payload.hashtags).toEqual([]);
  });

  it("caps instagram hashtags and holds the match when no publishable media is available", async () => {
    process.env.OPENAI_API_KEY = "openai-key";

    vi.doMock("ai", () => ({
      generateObject: vi.fn().mockResolvedValue({
        object: {
          caption: "A concise caption for Instagram.",
          hashtags: ["one", "two", "three", "four", "five", "six", "seven", "eight", "nine"],
          title: "Instagram caption title",
          warnings: [],
        },
      }),
    }));
    vi.doMock("@ai-sdk/openai", () => ({
      createOpenAI: () => () => "mock-model",
    }));

    const db = createOptimizationDb();
    const { optimizeDestinationPayload } = await import("./index");
    const result = await optimizeDestinationPayload(
      createOptimizationFixture({
        destination: {
          kind: "INSTAGRAM_BUSINESS",
          platform: "INSTAGRAM",
        },
      }),
      db,
    );

    expect(result.cacheRecord.status).toBe("COMPLETED");
    expect(result.payload.hashtags).toHaveLength(8);
    expect(result.policy.status).toBe("HOLD");
    expect(result.policy.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "instagram_media_required",
        }),
      ]),
    );
  });

  it("falls back safely when the AI response fails structured validation", async () => {
    process.env.OPENAI_API_KEY = "openai-key";

    vi.doMock("ai", () => ({
      generateObject: vi.fn().mockRejectedValue(new Error("AI response failed schema validation.")),
    }));
    vi.doMock("@ai-sdk/openai", () => ({
      createOpenAI: () => () => "mock-model",
    }));

    const db = createOptimizationDb();
    const { optimizeDestinationPayload } = await import("./index");
    const result = await optimizeDestinationPayload(createOptimizationFixture(), db);

    expect(result.cacheRecord.status).toBe("FALLBACK");
    expect(result.cacheRecord.errorMessage).toBe("AI response failed schema validation.");
    expect(result.payload.warnings).toEqual(
      expect.arrayContaining([
        expect.stringContaining("deterministic fallback formatter"),
      ]),
    );
  });

  it("blocks policy-unsafe content before publication continues downstream", async () => {
    process.env.AI_OPTIMIZATION_ENABLED = "false";

    const db = createOptimizationDb();
    const { optimizeDestinationPayload } = await import("./index");
    const result = await optimizeDestinationPayload(
      createOptimizationFixture({
        translation: {
          title: "Act now for this verified source story",
        },
      }),
      db,
    );

    expect(result.policy.status).toBe("BLOCK");
    expect(result.policy.reasons).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "policy_blocklist_phrase",
        }),
      ]),
    );
  });
});
