import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

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

  it("derives fetch windows from the checkpoint and falls back to the previous 24 hours", async () => {
    const { resolveStreamFetchWindow } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");

    expect(
      resolveStreamFetchWindow({
        checkpoint: {
          lastSuccessfulFetchAt: new Date("2026-04-04T11:00:00.000Z"),
        },
        now,
      }),
    ).toEqual({
      end: now,
      start: new Date("2026-04-04T11:00:00.000Z"),
    });

    expect(
      resolveStreamFetchWindow({
        checkpoint: null,
        now,
      }),
    ).toEqual({
      end: now,
      start: new Date("2026-04-04T12:34:56.000Z"),
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

    await expect(runStreamFetch("stream_1", {}, prisma)).resolves.toMatchObject({
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
