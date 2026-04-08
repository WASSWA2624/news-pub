import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createWorkflowArticle(id, overrides = {}) {
  return {
    body: `Story body ${id}`,
    dedupeFingerprint: `fingerprint_${id}`,
    imageUrl: `https://cdn.example.com/${id}.jpg`,
    language: "en",
    normalizedTitleHash: `title_hash_${id}`,
    providerArticleId: `provider_${id}`,
    providerCategories: ["general"],
    providerCountries: ["ug"],
    providerRegions: [],
    publishedAt: "2026-04-07T10:00:00.000Z",
    rawPayloadJson: {
      id,
    },
    sourceName: "Example Source",
    sourceUrl: `https://example.com/${id}`,
    sourceUrlHash: `source_hash_${id}`,
    summary: `Story summary ${id}`,
    tags: ["tag-one"],
    title: `Story title ${id}`,
    ...overrides,
  };
}

function createWorkflowStream({
  destinationPlatform = "FACEBOOK",
  id,
  maxPostsPerRun = 1,
  mode = "REVIEW_REQUIRED",
  providerFilters = {},
  providerKey = "newsdata",
  requestDefaultsJson = {
    endpoint: "latest",
  },
} = {}) {
  const destinationId = `destination_${id}`;
  const destinationKind =
    destinationPlatform === "WEBSITE" ? "WEBSITE" : `${destinationPlatform}_PAGE`;
  const providerConfigId = `provider_config_${providerKey}`;

  return {
    activeProvider: {
      providerKey,
      requestDefaultsJson,
    },
    activeProviderId: providerConfigId,
    categories: [],
    checkpoints: [
      {
        cursorJson: {
          page: 1,
        },
        lastSuccessfulFetchAt: new Date("2026-04-07T08:00:00.000Z"),
        providerConfigId,
        streamId: id,
      },
    ],
    consecutiveFailureCount: 0,
    countryAllowlistJson: [],
    defaultTemplate: null,
    destination: {
      id: destinationId,
      kind: destinationKind,
      platform: destinationPlatform,
    },
    destinationId,
    duplicateWindowHours: 48,
    excludeKeywordsJson: [],
    id,
    includeKeywordsJson: [],
    languageAllowlistJson: [],
    locale: "en",
    maxPostsPerRun,
    mode,
    name: `Stream ${id}`,
    regionAllowlistJson: [],
    retryLimit: 3,
    settingsJson: {
      providerFilters,
    },
    status: "ACTIVE",
  };
}

function createWorkflowExecutionPrisma(streamsById) {
  let articleCounter = 0;
  let articleMatchCounter = 0;
  let fetchRunCounter = 0;
  let postCounter = 0;
  let translationCounter = 0;

  const articleMatches = new Map();
  const fetchRuns = new Map();
  const posts = new Map();

  return {
    articleMatch: {
      create: vi.fn(({ data }) => {
        const id = `match_${++articleMatchCounter}`;
        const record = {
          canonicalPostId: data.canonicalPostId,
          destinationId: data.destinationId,
          id,
          streamId: data.streamId,
        };

        articleMatches.set(id, record);

        return Promise.resolve(record);
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn(({ where }) => {
        if (where?.fetchedArticleId_streamId) {
          return Promise.resolve(null);
        }

        if (!where?.id) {
          return Promise.resolve(null);
        }

        const articleMatch = articleMatches.get(where.id);

        if (!articleMatch) {
          return Promise.resolve(null);
        }

        const stream = streamsById[articleMatch.streamId];
        const post = posts.get(articleMatch.canonicalPostId) || {
          excerpt: "Story summary",
          featuredImage: null,
          featuredImageId: null,
          id: articleMatch.canonicalPostId,
          slug: "story-title",
          sourceArticle: {
            body: "Story body",
            imageUrl: null,
            summary: "Story summary",
          },
          sourceName: "Example Source",
          sourceUrl: "https://example.com/story",
          translations: [
            {
              contentMd: "Story body",
              locale: stream.locale,
              seoRecord: null,
              summary: "Story summary",
              title: "Story title",
            },
          ],
        };

        return Promise.resolve({
          canonicalPost: post,
          canonicalPostId: articleMatch.canonicalPostId,
          destination: stream.destination,
          destinationId: stream.destinationId,
          id: articleMatch.id,
          stream: {
            defaultTemplateId: null,
            destination: stream.destination,
            destinationId: stream.destinationId,
            id: stream.id,
            locale: stream.locale,
            mode: stream.mode,
          },
          streamId: stream.id,
        });
      }),
      update: vi.fn(({ where, data }) =>
        Promise.resolve({
          id: where.id,
          ...data,
        })),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    destinationTemplate: {
      findFirst: vi.fn().mockResolvedValue({
        bodyTemplate: "{{body}}",
        hashtagsTemplate: "",
        isDefault: true,
        locale: "en",
        platform: "WEBSITE",
        summaryTemplate: "{{summary}}",
        titleTemplate: "{{title}}",
      }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    fetchRun: {
      create: vi.fn(({ data }) => {
        const run = {
          id: `fetch_run_${++fetchRunCounter}`,
          startedAt: new Date("2026-04-07T12:00:00.000Z"),
          ...data,
        };

        fetchRuns.set(run.id, run);

        return Promise.resolve(run);
      }),
      update: vi.fn(({ where, data }) =>
        Promise.resolve({
          ...fetchRuns.get(where.id),
          ...data,
          id: where.id,
        })),
    },
    fetchedArticle: {
      upsert: vi.fn(({ create }) =>
        Promise.resolve({
          id: `article_${++articleCounter}`,
          ...create,
        })),
    },
    post: {
      create: vi.fn(({ data }) => {
        const post = {
          excerpt: data.excerpt,
          featuredImage: null,
          featuredImageId: data.featuredImageId || null,
          id: `post_${++postCounter}`,
          slug: data.slug,
          sourceArticle: {
            body: data.excerpt,
            imageUrl: null,
            summary: data.excerpt,
          },
          sourceName: data.sourceName,
          sourceUrl: data.sourceUrl,
          translations: [
            {
              contentMd: data.excerpt,
              locale: "en",
              seoRecord: null,
              summary: data.excerpt,
              title: data.slug,
            },
          ],
        };

        posts.set(post.id, post);

        return Promise.resolve(post);
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(({ where }) => Promise.resolve(posts.get(where.id) || null)),
      update: vi.fn(({ where, data }) =>
        Promise.resolve({
          ...(posts.get(where.id) || { id: where.id }),
          ...data,
          id: where.id,
        })),
    },
    postCategory: {
      createMany: vi.fn().mockResolvedValue({
        count: 0,
      }),
      deleteMany: vi.fn().mockResolvedValue({
        count: 0,
      }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    postTranslation: {
      upsert: vi.fn(({ create }) =>
        Promise.resolve({
          id: `translation_${++translationCounter}`,
          ...create,
        })),
    },
    providerFetchCheckpoint: {
      upsert: vi.fn().mockResolvedValue(null),
    },
    publishingStream: {
      findUnique: vi.fn(({ where }) => Promise.resolve(streamsById[where.id] || null)),
      update: vi.fn().mockResolvedValue(null),
    },
    sEORecord: {
      upsert: vi.fn().mockResolvedValue({
        id: "seo_1",
      }),
    },
  };
}

function createOptimizationPassResult() {
  return {
    aiResolution: null,
    cacheHit: false,
    cacheRecord: {
      id: "cache_1",
      status: "SUCCESS",
    },
    optimizationHash: "optimization_hash_1",
    payload: {
      body: "Optimized body",
      title: "Optimized title",
    },
    policy: {
      readinessChecks: [],
      reasons: [],
      riskScore: 0,
      status: "PASS",
      warnings: [],
    },
  };
}

describe("news workflow image resolution", () => {
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

  it("preserves provider image urls when one is already available", async () => {
    const { resolveFetchedArticleImageUrl } = await import("./workflows");

    await expect(
      resolveFetchedArticleImageUrl({
        imageUrl: "https://cdn.example.com/story.jpg",
        sourceUrl: "https://example.com/news/story",
      }),
    ).resolves.toBe("https://cdn.example.com/story.jpg");
  });

  it("falls back to source-page discovery when providers omit image urls", async () => {
    const discoverRemoteImageUrl = vi.fn().mockResolvedValue("https://cdn.example.com/discovered-story.jpg");

    vi.doMock("@/lib/media", async () => ({
      ...(await vi.importActual("@/lib/media")),
      discoverRemoteImageUrl,
    }));

    const { resolveFetchedArticleImageUrl } = await import("./workflows");

    await expect(
      resolveFetchedArticleImageUrl({
        imageUrl: null,
        sourceUrl: "https://example.com/news/story",
      }),
    ).resolves.toBe("https://cdn.example.com/discovered-story.jpg");
    expect(discoverRemoteImageUrl).toHaveBeenCalledWith("https://example.com/news/story");
  });
});

describe("social publishing guardrails", () => {
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

  it("blocks recently duplicated social stories for the same destination", async () => {
    const { applySocialPublishingGuardrails } = await import("./workflows");

    await expect(
      applySocialPublishingGuardrails({
        db: {
          publishAttempt: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: "attempt_1",
                payloadJson: {
                  canonicalUrl: "https://example.com/en/news/breaking-story",
                  destinationKind: "FACEBOOK_PAGE",
                  hashtags: "#news",
                  platform: "FACEBOOK",
                  summary: "Breaking story summary",
                  title: "Breaking story",
                },
                publishedAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
              },
            ]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "FACEBOOK",
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          destinationKind: "FACEBOOK_PAGE",
          hashtags: "#news",
          platform: "FACEBOOK",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Breaking story summary",
          title: "Breaking story",
        },
      }),
    ).rejects.toMatchObject({
      status: "destination_policy_guardrail_blocked",
    });
  });

  it("trims Instagram hashtags to the configured safe maximum", async () => {
    const { applySocialPublishingGuardrails } = await import("./workflows");

    await expect(
      applySocialPublishingGuardrails({
        db: {
          publishAttempt: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "INSTAGRAM",
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/visual-story",
          destinationKind: "INSTAGRAM_BUSINESS",
          hashtags: "#one #two #three #four #five #six #seven #eight #nine",
          platform: "INSTAGRAM",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Visual story summary",
          title: "Visual story",
        },
      }),
    ).resolves.toMatchObject({
      adjustments: {
        instagramHashtagsTrimmedTo: 8,
      },
      payload: expect.objectContaining({
        hashtags: "#one #two #three #four #five #six #seven #eight",
      }),
    });
  });

  it("honors destination-specific Meta guardrail overrides before falling back to env defaults", async () => {
    const { applySocialPublishingGuardrails } = await import("./workflows");

    await expect(
      applySocialPublishingGuardrails({
        db: {
          publishAttempt: {
            findMany: vi.fn().mockResolvedValue([]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "INSTAGRAM",
          settingsJson: {
            socialGuardrails: {
              instagramMaxHashtags: 3,
            },
          },
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/visual-story",
          destinationKind: "INSTAGRAM_BUSINESS",
          hashtags: "#one #two #three #four #five",
          platform: "INSTAGRAM",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Visual story summary",
          title: "Visual story",
        },
      }),
    ).resolves.toMatchObject({
      adjustments: {
        instagramHashtagsTrimmedTo: 3,
      },
      payload: expect.objectContaining({
        hashtags: "#one #two #three",
      }),
    });
  });

  it("allows the manual repost path to bypass duplicate and cooldown guardrails", async () => {
    const { applySocialPublishingGuardrails } = await import("./workflows");

    await expect(
      applySocialPublishingGuardrails({
        bypassDuplicateCooldown: true,
        db: {
          publishAttempt: {
            findMany: vi.fn().mockResolvedValue([
              {
                id: "attempt_1",
                payloadJson: {
                  canonicalUrl: "https://example.com/en/news/breaking-story",
                  destinationKind: "FACEBOOK_PAGE",
                  platform: "FACEBOOK",
                  summary: "Breaking story summary",
                  title: "Breaking story",
                },
                publishedAt: new Date(Date.now() - 10 * 60 * 1000),
              },
            ]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "FACEBOOK",
        },
        payload: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          destinationKind: "FACEBOOK_PAGE",
          platform: "FACEBOOK",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Breaking story summary",
          title: "Breaking story",
        },
      }),
    ).resolves.toMatchObject({
      payload: expect.objectContaining({
        canonicalUrl: "https://example.com/en/news/breaking-story",
      }),
    });
  });
});

describe("stream selection and scheduling helpers", () => {
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

  it("derives fetch windows from the checkpoint and keeps the 30-minute forward buffer", async () => {
    const { resolveStreamFetchWindow } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");

    expect(
      resolveStreamFetchWindow({
        checkpoint: {
          lastSuccessfulFetchAt: new Date("2026-04-04T11:00:00.000Z"),
        },
        now,
      }),
    ).toMatchObject({
      end: new Date("2026-04-05T13:04:56.000Z"),
      source: "checkpoint",
      start: new Date("2026-04-04T11:00:00.000Z"),
      usesExplicitBoundaries: false,
      usesProviderCheckpoint: true,
      writeCheckpointOnSuccess: true,
    });

    expect(
      resolveStreamFetchWindow({
        checkpoint: null,
        now,
      }),
    ).toMatchObject({
      end: new Date("2026-04-05T13:04:56.000Z"),
      source: "default",
      start: new Date("2026-04-04T12:34:56.000Z"),
      usesExplicitBoundaries: false,
      usesProviderCheckpoint: false,
      writeCheckpointOnSuccess: true,
    });
  });

  it("selects unique candidates first and only uses repost-eligible duplicates for leftover slots", async () => {
    const { selectStreamRunCandidates } = await import("./workflows");
    const uniqueEligibleCandidates = [{ id: "unique_1" }, { id: "unique_2" }];
    const repostEligibleDuplicates = [{ id: "duplicate_1" }, { id: "duplicate_2" }];

    expect(
      selectStreamRunCandidates({
        maxPostsPerRun: 3,
        repostEligibleDuplicates,
        uniqueEligibleCandidates,
      }),
    ).toEqual([
      { id: "unique_1" },
      { id: "unique_2" },
      { id: "duplicate_1" },
    ]);
  });

  it("classifies duplicates inside the cooldown window as blocked and older ones as repost eligible", async () => {
    const { classifyDuplicateCandidate } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");

    expect(
      classifyDuplicateCandidate(
        {
          createdAt: new Date("2026-04-05T08:00:00.000Z"),
        },
        {
          duplicateWindowHours: 12,
          now,
        },
      ),
    ).toBe("blocked_duplicate");

    expect(
      classifyDuplicateCandidate(
        {
          createdAt: new Date("2026-04-03T08:00:00.000Z"),
        },
        {
          duplicateWindowHours: 12,
          now,
        },
      ),
    ).toBe("repost_eligible_duplicate");
  });

  it("treats interval 0 as disabled and positive intervals as schedulable", async () => {
    const { isStreamDueForScheduledRun } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");

    expect(
      isStreamDueForScheduledRun(
        {
          lastRunCompletedAt: new Date("2026-04-05T11:00:00.000Z"),
          scheduleIntervalMinutes: 0,
        },
        now,
      ),
    ).toBe(false);

    expect(
      isStreamDueForScheduledRun(
        {
          lastRunCompletedAt: new Date("2026-04-05T11:00:00.000Z"),
          scheduleIntervalMinutes: 30,
        },
        now,
      ),
    ).toBe(true);
  });

  it("audits manual repost requests before executing a fresh publish attempt", async () => {
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/lib/revalidation", () => ({
      revalidatePublishedPostPaths: vi.fn().mockResolvedValue(null),
    }));

    const analytics = await import("@/lib/analytics");
    const { manualRepostArticleMatch } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    const prisma = {
      articleMatch: {
        findUnique: vi.fn().mockResolvedValue({
          canonicalPost: {
            id: "post_1",
          },
          canonicalPostId: "post_1",
          destination: {
            id: "destination_1",
            platform: "WEBSITE",
          },
          id: "match_1",
          publishAttempts: [
            {
              id: "attempt_1",
              status: "SUCCEEDED",
            },
          ],
          stream: {
            destination: {
              id: "destination_1",
              kind: "WEBSITE",
              platform: "WEBSITE",
            },
            destinationId: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
        }),
        update: vi.fn().mockResolvedValue(null),
      },
      destinationTemplate: {
        findFirst: vi.fn().mockResolvedValue({
          bodyTemplate: "{{body}}",
          hashtagsTemplate: "",
          platform: "WEBSITE",
          summaryTemplate: "{{summary}}",
          titleTemplate: "{{title}}",
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      post: {
        update: vi.fn().mockResolvedValue(null),
      },
      postCategory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      publishAttempt: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({
          articleMatchId: "match_1",
          id: "attempt_2",
        }),
        findUnique: vi.fn().mockResolvedValue({
          articleMatch: {
            destination: {
              id: "destination_1",
              kind: "WEBSITE",
              platform: "WEBSITE",
            },
            id: "match_1",
            stream: {
              destination: {
                id: "destination_1",
                kind: "WEBSITE",
                platform: "WEBSITE",
              },
              destinationId: "destination_1",
              id: "stream_1",
              locale: "en",
              mode: "AUTO_PUBLISH",
            },
          },
          articleMatchId: "match_1",
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            platform: "WEBSITE",
          },
          id: "attempt_2",
          platform: "WEBSITE",
          post: {
            excerpt: "Story summary",
            featuredImage: null,
            slug: "story-title",
            sourceArticle: {
              body: "Story body",
              imageUrl: null,
            },
            sourceName: "Example Source",
            sourceUrl: "https://example.com/story",
            translations: [
              {
                contentMd: "Story body",
                locale: "en",
                seoRecord: {
                  keywordsJson: [],
                  ogImage: null,
                },
                summary: "Story summary",
                title: "Story title",
              },
            ],
          },
          postId: "post_1",
          queuedAt: now,
          stream: {
            destination: {
              id: "destination_1",
              kind: "WEBSITE",
              platform: "WEBSITE",
            },
            destinationId: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
        }),
        update: vi.fn().mockResolvedValue({
          id: "attempt_2",
          status: "SUCCEEDED",
        }),
      },
    };

    await manualRepostArticleMatch(
      "match_1",
      {
        actorId: "admin_1",
      },
      prisma,
    );

    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PUBLISH_ATTEMPT_MANUAL_REPOST_REQUESTED",
        actorId: "admin_1",
        entityId: "attempt_2",
      }),
      prisma,
    );
  });

  it("audits manual retry requests before creating a fresh publish attempt", async () => {
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/lib/revalidation", () => ({
      revalidatePublishedPostPaths: vi.fn().mockResolvedValue(null),
    }));

    const analytics = await import("@/lib/analytics");
    const { retryPublishAttempt } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    const prisma = {
      articleMatch: {
        findUnique: vi.fn().mockResolvedValue({
          canonicalPost: {
            id: "post_1",
          },
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            platform: "WEBSITE",
          },
          id: "match_1",
          stream: {
            destination: {
              id: "destination_1",
              kind: "WEBSITE",
              platform: "WEBSITE",
            },
            destinationId: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
        }),
        update: vi.fn().mockResolvedValue(null),
      },
      destinationTemplate: {
        findFirst: vi.fn().mockResolvedValue({
          bodyTemplate: "{{body}}",
          hashtagsTemplate: "",
          platform: "WEBSITE",
          summaryTemplate: "{{summary}}",
          titleTemplate: "{{title}}",
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
      post: {
        update: vi.fn().mockResolvedValue(null),
      },
      postCategory: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      publishAttempt: {
        count: vi.fn().mockResolvedValue(1),
        create: vi.fn().mockResolvedValue({
          articleMatchId: "match_1",
          id: "attempt_retry_2",
          retryCount: 1,
        }),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            articleMatch: {
              publishAttempts: [
                {
                  id: "attempt_failed_1",
                  status: "FAILED",
                },
              ],
            },
            articleMatchId: "match_1",
            id: "attempt_failed_1",
            platform: "WEBSITE",
            postId: "post_1",
            retryCount: 0,
            status: "FAILED",
            stream: {
              destinationId: "destination_1",
              id: "stream_1",
              locale: "en",
              mode: "AUTO_PUBLISH",
              retryLimit: 3,
            },
          })
          .mockResolvedValueOnce({
            articleMatch: {
              destination: {
                id: "destination_1",
                kind: "WEBSITE",
                platform: "WEBSITE",
              },
              id: "match_1",
              stream: {
                destination: {
                  id: "destination_1",
                  kind: "WEBSITE",
                  platform: "WEBSITE",
                },
                destinationId: "destination_1",
                id: "stream_1",
                locale: "en",
                mode: "AUTO_PUBLISH",
              },
            },
            articleMatchId: "match_1",
            destination: {
              id: "destination_1",
              kind: "WEBSITE",
              platform: "WEBSITE",
            },
            id: "attempt_retry_2",
            platform: "WEBSITE",
            post: {
              excerpt: "Story summary",
              featuredImage: null,
              slug: "story-title",
              sourceArticle: {
                body: "Story body",
                imageUrl: null,
              },
              sourceName: "Example Source",
              sourceUrl: "https://example.com/story",
              translations: [
                {
                  contentMd: "Story body",
                  locale: "en",
                  seoRecord: {
                    keywordsJson: [],
                    ogImage: null,
                  },
                  summary: "Story summary",
                  title: "Story title",
                },
              ],
            },
            postId: "post_1",
            queuedAt: now,
            stream: {
              destination: {
                id: "destination_1",
                kind: "WEBSITE",
                platform: "WEBSITE",
              },
              destinationId: "destination_1",
              id: "stream_1",
              locale: "en",
              mode: "AUTO_PUBLISH",
            },
          }),
        update: vi.fn().mockResolvedValue({
          id: "attempt_retry_2",
          status: "FAILED",
        }),
      },
    };

    await retryPublishAttempt(
      "attempt_failed_1",
      {
        actorId: "admin_1",
      },
      prisma,
    );

    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PUBLISH_ATTEMPT_RETRY_REQUESTED",
        actorId: "admin_1",
        entityId: "attempt_retry_2",
      }),
      prisma,
    );
  });
});

describe("AI optimization observability", () => {
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

  function createRefreshOptimizationPrisma() {
    return {
      articleMatch: {
        findUnique: vi.fn().mockResolvedValue({
          canonicalPost: {
            featuredImage: null,
            id: "post_1",
            sourceArticle: {
              body: "Story body",
              imageUrl: null,
              summary: "Story summary",
            },
            translations: [
              {
                contentMd: "Story body",
                locale: "en",
                seoRecord: null,
                summary: "Story summary",
                title: "Story title",
              },
            ],
          },
          canonicalPostId: "post_1",
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            name: "Website",
            platform: "WEBSITE",
          },
          destinationId: "destination_1",
          id: "match_1",
          stream: {
            defaultTemplateId: null,
            destination: {
              id: "destination_1",
              platform: "WEBSITE",
            },
            destinationId: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
          streamId: "stream_1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "match_1",
          optimizationStatus: "SKIPPED",
        }),
      },
      destinationTemplate: {
        findFirst: vi.fn().mockResolvedValue({
          bodyTemplate: "{{body}}",
          hashtagsTemplate: "",
          isDefault: true,
          locale: "en",
          platform: "WEBSITE",
          summaryTemplate: "{{summary}}",
          titleTemplate: "{{title}}",
        }),
        findUnique: vi.fn().mockResolvedValue(null),
      },
    };
  }

  it("records skipped AI optimization as a warning observability event instead of a workflow failure", async () => {
    const recordObservabilityEvent = vi.fn().mockResolvedValue(null);

    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent,
    }));
    vi.doMock("@/lib/ai", () => ({
      optimizeDestinationPayload: vi.fn().mockResolvedValue({
        aiResolution: {
          reasonCode: "ai_credentials_missing",
          reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
          status: "SKIPPED",
          usedDeterministicFallback: true,
        },
        cacheHit: false,
        cacheRecord: {
          id: "cache_1",
          status: "SKIPPED",
        },
        optimizationHash: "hash_1",
        payload: {
          body: "Deterministic body",
          title: "Deterministic title",
        },
        policy: {
          readinessChecks: [],
          reasons: [],
          riskScore: 0,
          status: "PASS",
          warnings: [],
        },
      }),
    }));

    const { refreshArticleMatchOptimization } = await import("./workflows");
    const prisma = createRefreshOptimizationPrisma();

    await refreshArticleMatchOptimization("match_1", {}, prisma);

    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AI_OPTIMIZATION_SKIPPED",
        entityId: "match_1",
        entityType: "article_match",
        level: "warn",
        message: "AI credentials are missing, so NewsPub kept deterministic content.",
        payload: expect.objectContaining({
          destinationId: "destination_1",
          optimizationStatus: "SKIPPED",
          reasonCode: "ai_credentials_missing",
          usedDeterministicFallback: true,
        }),
      }),
      prisma,
    );
  });

  it("records fallback AI optimization as a warning observability event with deterministic context", async () => {
    const recordObservabilityEvent = vi.fn().mockResolvedValue(null);

    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent,
    }));
    vi.doMock("@/lib/ai", () => ({
      optimizeDestinationPayload: vi.fn().mockResolvedValue({
        aiResolution: {
          errorMessage: "Request timed out.",
          reasonCode: "ai_timeout",
          reasonMessage: "AI timed out, so NewsPub fell back to deterministic formatting.",
          status: "FALLBACK",
          usedDeterministicFallback: true,
        },
        cacheHit: false,
        cacheRecord: {
          id: "cache_2",
          status: "FALLBACK",
        },
        optimizationHash: "hash_2",
        payload: {
          body: "Deterministic fallback body",
          title: "Deterministic fallback title",
        },
        policy: {
          readinessChecks: [],
          reasons: [],
          riskScore: 0,
          status: "PASS",
          warnings: [],
        },
      }),
    }));

    const { refreshArticleMatchOptimization } = await import("./workflows");
    const prisma = createRefreshOptimizationPrisma();

    await refreshArticleMatchOptimization("match_1", {}, prisma);

    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "AI_OPTIMIZATION_FALLBACK_USED",
        entityId: "match_1",
        entityType: "article_match",
        level: "warn",
        message: "AI timed out, so NewsPub fell back to deterministic formatting.",
        payload: expect.objectContaining({
          optimizationStatus: "FALLBACK",
          reasonCode: "ai_timeout",
          usedDeterministicFallback: true,
        }),
      }),
      prisma,
    );
  });
});

describe("shared stream execution and website completeness", () => {
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

  it("shares one upstream fetch across compatible streams and still writes per-stream checkpoints", async () => {
    const createAuditEventRecord = vi.fn().mockResolvedValue(null);
    const fetchProviderArticles = vi.fn().mockResolvedValue({
      articles: [createWorkflowArticle("shared_story")],
      cursor: {
        page: "next",
      },
      fetchedCount: 1,
    });

    vi.doMock("@/lib/ai", () => ({
      optimizeDestinationPayload: vi.fn().mockResolvedValue(createOptimizationPassResult()),
    }));
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord,
      recordObservabilityEvent: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/lib/news/providers", () => ({
      fetchProviderArticles,
    }));
    vi.doMock("@/lib/validation/configuration", () => ({
      getStreamValidationIssues: vi.fn().mockReturnValue([]),
    }));

    const { runMultipleStreamFetches } = await import("./workflows");
    const prisma = createWorkflowExecutionPrisma({
      stream_1: createWorkflowStream({
        id: "stream_1",
        providerFilters: {
          category: ["business"],
        },
      }),
      stream_2: createWorkflowStream({
        id: "stream_2",
        providerFilters: {
          category: ["technology"],
        },
      }),
    });
    const now = new Date("2026-04-07T12:00:00.000Z");
    const result = await runMultipleStreamFetches(
      ["stream_1", "stream_2"],
      {
        now,
        triggerType: "manual",
      },
      prisma,
    );

    expect(fetchProviderArticles).toHaveBeenCalledTimes(1);
    expect(fetchProviderArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpoint: null,
        providerKey: "newsdata",
        requestValues: expect.objectContaining({
          category: ["business", "technology"],
          endpoint: "latest",
        }),
      }),
    );
    expect(prisma.articleMatch.create).toHaveBeenCalledTimes(2);
    expect(prisma.providerFetchCheckpoint.upsert).toHaveBeenCalledTimes(2);
    expect(prisma.providerFetchCheckpoint.upsert).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        update: expect.objectContaining({
          cursorJson: null,
          lastSuccessfulFetchAt: new Date("2026-04-07T12:30:00.000Z"),
        }),
      }),
    );
    expect(createAuditEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FETCH_SHARED_BATCH_PLANNED",
        entityType: "fetch_run_group",
      }),
      prisma,
    );
    expect(result).toMatchObject({
      requestedStreamCount: 2,
      upstreamRequestCount: 1,
    });
    expect(result.groups[0]).toMatchObject({
      executionMode: "shared_batch",
      providerKey: "newsdata",
      streamIds: ["stream_1", "stream_2"],
    });
  });

  it("processes every eligible website candidate from a broad pool even when maxPostsPerRun is lower", async () => {
    const fetchProviderArticles = vi.fn().mockResolvedValue({
      articles: [
        createWorkflowArticle("website_story_1"),
        createWorkflowArticle("website_story_2", {
          dedupeFingerprint: "fingerprint_website_story_2",
          normalizedTitleHash: "title_hash_website_story_2",
          providerArticleId: "provider_website_story_2",
          sourceUrl: "https://example.com/website_story_2",
          sourceUrlHash: "source_hash_website_story_2",
          title: "Story title website 2",
        }),
      ],
      cursor: {
        page: 2,
      },
      fetchedCount: 2,
    });

    vi.doMock("@/lib/ai", () => ({
      optimizeDestinationPayload: vi.fn().mockResolvedValue(createOptimizationPassResult()),
    }));
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/lib/news/providers", () => ({
      fetchProviderArticles,
    }));
    vi.doMock("@/lib/validation/configuration", () => ({
      getStreamValidationIssues: vi.fn().mockReturnValue([]),
    }));

    const { runStreamFetch } = await import("./workflows");
    const prisma = createWorkflowExecutionPrisma({
      website_stream: createWorkflowStream({
        destinationPlatform: "WEBSITE",
        id: "website_stream",
        maxPostsPerRun: 1,
      }),
    });
    const completedRun = await runStreamFetch(
      "website_stream",
      {
        fetchWindow: {
          end: "2026-04-07T12:00:00.000Z",
          start: "2026-04-07T00:00:00.000Z",
        },
        now: new Date("2026-04-07T12:00:00.000Z"),
        triggerType: "manual",
      },
      prisma,
    );

    expect(prisma.articleMatch.create).toHaveBeenCalledTimes(2);
    expect(prisma.providerFetchCheckpoint.upsert).not.toHaveBeenCalled();
    expect(completedRun).toMatchObject({
      heldCount: 2,
      publishableCount: 2,
      queuedCount: 0,
      status: "SUCCEEDED",
    });
    expect(prisma.fetchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          executionDetailsJson: expect.objectContaining({
            checkpointStrategy: expect.objectContaining({
              writeCheckpointOnSuccess: false,
            }),
            streamFetchWindow: expect.objectContaining({
              source: "explicit",
            }),
          }),
        }),
      }),
    );
  });
});

describe("stream execution dedupe safety", () => {
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

  it("skips candidates that already have a fetched article match for the same stream", async () => {
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent: vi.fn().mockResolvedValue(null),
    }));
    vi.doMock("@/lib/news/providers", () => ({
      fetchProviderArticles: vi.fn().mockResolvedValue({
        articles: [
          {
            body: "Story body",
            dedupeFingerprint: "fingerprint_1",
            imageUrl: "https://cdn.example.com/story.jpg",
            language: "en",
            normalizedTitleHash: "title_hash_1",
            providerArticleId: "provider_story_1",
            providerCategories: ["breaking"],
            providerCountries: ["ug"],
            providerRegions: [],
            publishedAt: "2026-04-07T10:00:00.000Z",
            rawPayloadJson: {
              id: "provider_story_1",
            },
            sourceName: "Example Source",
            sourceUrl: "https://example.com/story",
            sourceUrlHash: "source_hash_1",
            summary: "Story summary",
            tags: ["tag-one"],
            title: "Story title",
          },
        ],
        cursor: {
          page: 1,
        },
        fetchedCount: 1,
      }),
    }));
    vi.doMock("@/lib/validation/configuration", () => ({
      getStreamValidationIssues: vi.fn().mockReturnValue([]),
    }));

    const { runStreamFetch } = await import("./workflows");
    const prisma = {
      articleMatch: {
        create: vi.fn(),
        findFirst: vi.fn().mockResolvedValue(null),
        findUnique: vi.fn().mockResolvedValue({
          id: "match_existing_1",
        }),
      },
      fetchRun: {
        create: vi.fn().mockResolvedValue({
          id: "fetch_run_1",
          startedAt: new Date("2026-04-07T12:00:00.000Z"),
        }),
        update: vi.fn().mockResolvedValue({
          duplicateCount: 1,
          id: "fetch_run_1",
          publishableCount: 0,
          status: "SUCCEEDED",
        }),
      },
      fetchedArticle: {
        upsert: vi.fn().mockResolvedValue({
          id: "article_1",
          sourceName: "Example Source",
          sourceUrl: "https://example.com/story",
          summary: "Story summary",
          title: "Story title",
        }),
      },
      providerFetchCheckpoint: {
        upsert: vi.fn().mockResolvedValue(null),
      },
      publishingStream: {
        findUnique: vi.fn().mockResolvedValue({
          activeProvider: {
            providerKey: "newsdata",
            requestDefaultsJson: {},
          },
          activeProviderId: "provider_config_1",
          categories: [],
          checkpoints: [],
          consecutiveFailureCount: 0,
          countryAllowlistJson: [],
          defaultTemplate: null,
          destination: {
            id: "destination_1",
            kind: "FACEBOOK_PAGE",
            platform: "FACEBOOK",
          },
          destinationId: "destination_1",
          duplicateWindowHours: 48,
          excludeKeywordsJson: [],
          id: "stream_1",
          includeKeywordsJson: [],
          languageAllowlistJson: [],
          locale: "en",
          mode: "AUTO_PUBLISH",
          regionAllowlistJson: [],
          retryLimit: 3,
          settingsJson: {},
          status: "ACTIVE",
        }),
        update: vi.fn().mockResolvedValue(null),
      },
    };

    await expect(
      runStreamFetch(
        "stream_1",
        {
          now: new Date("2026-04-07T12:00:00.000Z"),
        },
        prisma,
      ),
    ).resolves.toMatchObject({
      id: "fetch_run_1",
      status: "SUCCEEDED",
    });

    expect(prisma.fetchedArticle.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          dedupeFingerprint: "fingerprint_1",
        },
      }),
    );
    expect(prisma.articleMatch.create).not.toHaveBeenCalled();
    expect(prisma.fetchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          duplicateCount: 1,
          publishableCount: 0,
          status: "SUCCEEDED",
        }),
      }),
    );
  });
});
