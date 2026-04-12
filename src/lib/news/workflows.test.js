import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createWorkflowArticle(id, overrides = {}) {
  return {
    body: `Story body ${id}`,
    dedupe_fingerprint: `fingerprint_${id}`,
    image_url: `https://cdn.example.com/${id}.jpg`,
    language: "en",
    normalized_title_hash: `title_hash_${id}`,
    provider_article_id: `provider_${id}`,
    providerCategories: ["general"],
    providerCountries: ["ug"],
    providerRegions: [],
    published_at: "2026-04-07T10:00:00.000Z",
    raw_payload_json: {
      id,
    },
    source_name: "Example Source",
    source_url: `https://example.com/${id}`,
    source_url_hash: `source_hash_${id}`,
    summary: `Story summary ${id}`,
    tags: ["tag-one"],
    title: `Story title ${id}`,
    ...overrides,
  };
}

function createWorkflowStream({
  categories = [],
  destinationPlatform = "FACEBOOK",
  id,
  max_posts_per_run = 1,
  mode = "REVIEW_REQUIRED",
  providerFilters = {},
  provider_key = "newsdata",
  request_defaults_json = {
    endpoint: "latest",
  },
} = {}) {
  const destination_id = `destination_${id}`;
  const destination_kind =
    destinationPlatform === "WEBSITE" ? "WEBSITE" : `${destinationPlatform}_PAGE`;
  const provider_config_id = `provider_config_${provider_key}`;
  const streamCategories = categories.map((category, index) => ({
    id: category.id || `category_${id}_${index + 1}`,
    name: category.name,
    slug: category.slug,
  }));

  return {
    activeProvider: {
      provider_key,
      request_defaults_json,
    },
    active_provider_id: provider_config_id,
    categories: streamCategories.map((category) => ({
      category,
    })),
    checkpoints: [
      {
        cursor_json: {
          page: 1,
        },
        last_successful_fetch_at: new Date("2026-04-07T08:00:00.000Z"),
        provider_config_id,
        stream_id: id,
      },
    ],
    consecutive_failure_count: 0,
    country_allowlist_json: [],
    defaultTemplate: null,
    destination: {
      id: destination_id,
      kind: destination_kind,
      platform: destinationPlatform,
    },
    destination_id,
    duplicate_window_hours: 48,
    exclude_keywords_json: [],
    id,
    include_keywords_json: [],
    language_allowlist_json: [],
    locale: "en",
    max_posts_per_run,
    mode,
    name: `Stream ${id}`,
    region_allowlist_json: [],
    retry_limit: 3,
    settings_json: {
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
  let publishAttemptCounter = 0;
  let translationCounter = 0;

  const articleMatches = new Map();
  const fetchRuns = new Map();
  const posts = new Map();
  const publishAttempts = new Map();

  function getPostRecord(articleMatch) {
    const stream = streamsById[articleMatch.stream_id];

    return posts.get(articleMatch.canonical_post_id) || {
      excerpt: "Story summary",
      featuredImage: null,
      featured_image_id: null,
      id: articleMatch.canonical_post_id,
      slug: "story-title",
      sourceArticle: {
        body: "Story body",
        image_url: null,
        summary: "Story summary",
      },
      source_name: "Example Source",
      source_url: "https://example.com/story",
      translations: [
        {
          content_md: "Story body",
          locale: stream.locale,
          seoRecord: null,
          summary: "Story summary",
          title: "Story title",
        },
      ],
    };
  }

  function hydrateArticleMatch(articleMatch) {
    if (!articleMatch) {
      return null;
    }

    const stream = streamsById[articleMatch.stream_id];

    return {
      ...articleMatch,
      canonicalPost: getPostRecord(articleMatch),
      destination: stream.destination,
      destination_id: stream.destination_id,
      stream: {
        ...stream,
        default_template_id: stream.default_template_id || null,
        destination: stream.destination,
        destination_id: stream.destination_id,
        id: stream.id,
        locale: stream.locale,
        mode: stream.mode,
      },
      stream_id: stream.id,
    };
  }

  function hydratePublishAttempt(attempt) {
    if (!attempt) {
      return null;
    }

    const articleMatch = articleMatches.get(attempt.article_match_id);
    const stream = streamsById[attempt.stream_id];

    return {
      ...attempt,
      articleMatch: hydrateArticleMatch(articleMatch),
      destination: stream.destination,
      post: getPostRecord(articleMatch),
      stream,
    };
  }

  return {
    articleMatch: {
      create: vi.fn(({ data }) => {
        const id = `match_${++articleMatchCounter}`;
        const record = {
          canonical_post_id: data.canonical_post_id,
          destination_id: data.destination_id,
          id,
          stream_id: data.stream_id,
        };

        articleMatches.set(id, record);

        return Promise.resolve(record);
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findUnique: vi.fn(({ where }) => {
        if (where?.fetched_article_id_stream_id) {
          return Promise.resolve(null);
        }

        if (!where?.id) {
          return Promise.resolve(null);
        }

        const articleMatch = articleMatches.get(where.id);

        if (!articleMatch) {
          return Promise.resolve(null);
        }

        return Promise.resolve(hydrateArticleMatch(articleMatch));
      }),
      update: vi.fn(({ where, data }) => {
        const existingMatch = articleMatches.get(where.id);
        const updatedMatch = {
          ...(existingMatch || { id: where.id }),
          ...data,
        };

        articleMatches.set(where.id, updatedMatch);

        return Promise.resolve({
          id: where.id,
          ...data,
        });
      }),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    destinationTemplate: {
      findFirst: vi.fn().mockResolvedValue({
        body_template: "{{body}}",
        hashtags_template: "",
        is_default: true,
        locale: "en",
        platform: "WEBSITE",
        summary_template: "{{summary}}",
        title_template: "{{title}}",
      }),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    fetchRun: {
      create: vi.fn(({ data }) => {
        const run = {
          id: `fetch_run_${++fetchRunCounter}`,
          started_at: new Date("2026-04-07T12:00:00.000Z"),
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
          featured_image_id: data.featured_image_id || null,
          id: `post_${++postCounter}`,
          slug: data.slug,
          sourceArticle: {
            body: data.excerpt,
            image_url: null,
            summary: data.excerpt,
          },
          source_name: data.source_name,
          source_url: data.source_url,
          translations: [
            {
              content_md: data.excerpt,
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
    publishAttempt: {
      count: vi.fn(({ where }) =>
        Promise.resolve(
          [...publishAttempts.values()].filter((attempt) => attempt.article_match_id === where.article_match_id).length,
        )),
      create: vi.fn(({ data }) => {
        const attempt = {
          id: `attempt_${++publishAttemptCounter}`,
          created_at: new Date("2026-04-07T12:00:00.000Z"),
          updated_at: new Date("2026-04-07T12:00:00.000Z"),
          ...data,
        };

        publishAttempts.set(attempt.id, attempt);

        return Promise.resolve(attempt);
      }),
      findFirst: vi.fn().mockResolvedValue(null),
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn(({ where, select }) => {
        const attempt = publishAttempts.get(where.id);

        if (!attempt) {
          return Promise.resolve(null);
        }

        if (select) {
          return Promise.resolve(
            Object.fromEntries(
              Object.keys(select).map((key) => [key, attempt[key]]),
            ),
          );
        }

        return Promise.resolve(hydratePublishAttempt(attempt));
      }),
      update: vi.fn(({ where, data }) => {
        const updatedAttempt = {
          ...(publishAttempts.get(where.id) || { id: where.id }),
          ...data,
        };

        publishAttempts.set(where.id, updatedAttempt);

        return Promise.resolve(updatedAttempt);
      }),
      updateMany: vi.fn(({ where, data }) => {
        const attempt = publishAttempts.get(where.id);

        if (!attempt || (where.status && attempt.status !== where.status)) {
          return Promise.resolve({
            count: 0,
          });
        }

        publishAttempts.set(where.id, {
          ...attempt,
          ...data,
        });

        return Promise.resolve({
          count: 1,
        });
      }),
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
    optimization_hash: "optimization_hash_1",
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
        image_url: "https://cdn.example.com/story.jpg",
        source_url: "https://example.com/news/story",
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
        image_url: null,
        source_url: "https://example.com/news/story",
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
                payload_json: {
                  canonical_url: "https://example.com/en/news/breaking-story",
                  destination_kind: "FACEBOOK_PAGE",
                  hashtags: "#news",
                  platform: "FACEBOOK",
                  summary: "Breaking story summary",
                  title: "Breaking story",
                },
                published_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
              },
            ]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "FACEBOOK",
        },
        payload: {
          canonical_url: "https://example.com/en/news/breaking-story",
          destination_kind: "FACEBOOK_PAGE",
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
          canonical_url: "https://example.com/en/news/visual-story",
          destination_kind: "INSTAGRAM_BUSINESS",
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
          settings_json: {
            socialGuardrails: {
              instagramMaxHashtags: 3,
            },
          },
        },
        payload: {
          canonical_url: "https://example.com/en/news/visual-story",
          destination_kind: "INSTAGRAM_BUSINESS",
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
                payload_json: {
                  canonical_url: "https://example.com/en/news/breaking-story",
                  destination_kind: "FACEBOOK_PAGE",
                  platform: "FACEBOOK",
                  summary: "Breaking story summary",
                  title: "Breaking story",
                },
                published_at: new Date(Date.now() - 10 * 60 * 1000),
              },
            ]),
          },
        },
        destination: {
          id: "destination_1",
          platform: "FACEBOOK",
        },
        payload: {
          canonical_url: "https://example.com/en/news/breaking-story",
          destination_kind: "FACEBOOK_PAGE",
          platform: "FACEBOOK",
          sourceReference: "Source: Example Source - https://example.com/story",
          summary: "Breaking story summary",
          title: "Breaking story",
        },
      }),
    ).resolves.toMatchObject({
      payload: expect.objectContaining({
        canonical_url: "https://example.com/en/news/breaking-story",
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
          last_successful_fetch_at: new Date("2026-04-04T11:00:00.000Z"),
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
        max_posts_per_run: 3,
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
          created_at: new Date("2026-04-05T08:00:00.000Z"),
        },
        {
          duplicate_window_hours: 12,
          now,
        },
      ),
    ).toBe("blocked_duplicate");

    expect(
      classifyDuplicateCandidate(
        {
          created_at: new Date("2026-04-03T08:00:00.000Z"),
        },
        {
          duplicate_window_hours: 12,
          now,
        },
      ),
    ).toBe("repost_eligible_duplicate");
  });

  it("treats interval 0 as disabled and positive intervals as schedulable", async () => {
    const { getStreamNextScheduledRunAt, isStreamDueForScheduledRun, isStreamExecutionInProgress } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");

    expect(
      isStreamDueForScheduledRun(
        {
          last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
          schedule_interval_minutes: 0,
        },
        now,
      ),
    ).toBe(false);

    expect(
      isStreamDueForScheduledRun(
        {
          last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
          schedule_interval_minutes: 30,
        },
        now,
      ),
    ).toBe(true);

    expect(
      isStreamExecutionInProgress({
        last_failure_at: new Date("2026-04-05T10:00:00.000Z"),
        last_run_started_at: new Date("2026-04-05T12:20:00.000Z"),
      }),
    ).toBe(true);

    expect(
      isStreamDueForScheduledRun(
        {
          last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
          last_run_started_at: new Date("2026-04-05T12:20:00.000Z"),
          schedule_interval_minutes: 30,
        },
        now,
      ),
    ).toBe(false);

    expect(
      getStreamNextScheduledRunAt({
        last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
        schedule_interval_minutes: 30,
      }),
    ).toEqual(new Date("2026-04-05T11:30:00.000Z"));
  });

  it("prefers persisted next_run_at values when determining whether a stream is due", async () => {
    const { getStreamNextScheduledRunAt, isStreamDueForScheduledRun } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");

    expect(
      getStreamNextScheduledRunAt({
        last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
        next_run_at: new Date("2026-04-05T13:00:00.000Z"),
        schedule_interval_minutes: 30,
      }),
    ).toEqual(new Date("2026-04-05T13:00:00.000Z"));

    expect(
      isStreamDueForScheduledRun(
        {
          next_run_at: new Date("2026-04-05T13:00:00.000Z"),
          schedule_interval_minutes: 30,
        },
        now,
      ),
    ).toBe(false);

    expect(
      isStreamDueForScheduledRun(
        {
          next_run_at: new Date("2026-04-05T12:00:00.000Z"),
          schedule_interval_minutes: 30,
        },
        now,
      ),
    ).toBe(true);
  });

  it("reconciles stale publish attempts, recovers stranded auto-publish matches, and preserves scheduled queue cadence", async () => {
    const { runScheduledStreams } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    const prisma = {
      articleMatch: {
        findMany: vi.fn().mockResolvedValue([
          {
            canonicalPost: {
              scheduled_publish_at: null,
            },
            canonical_post_id: "post_1",
            destination: {
              platform: "WEBSITE",
            },
            id: "match_1",
            queued_at: now,
            stream: {
              destination: {
                platform: "WEBSITE",
              },
              destination_id: "destination_1",
              id: "stream_1",
              mode: "AUTO_PUBLISH",
              status: "ACTIVE",
            },
          },
        ]),
      },
      fetchRun: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({
          id: "fetch_run_queued_1",
          queue_key: "scheduled:stream_1:2026-04-05T12:00:00.000Z",
          status: "PENDING",
        }),
        update: vi.fn().mockResolvedValue(null),
      },
      publishAttempt: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          article_match_id: "match_1",
          id: "attempt_1",
          retry_count: 0,
          status: "PENDING",
        }),
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              last_error_code: null,
              last_error_message: null,
              id: "stale_attempt_1",
              post: {
                scheduled_publish_at: null,
              },
              started_at: new Date("2026-04-05T11:00:00.000Z"),
              status: "RUNNING",
            },
          ])
          .mockResolvedValueOnce([]),
        update: vi.fn().mockResolvedValue(null),
      },
      publishingStream: {
        findMany: vi.fn().mockResolvedValue([
          {
            active_provider_id: "provider_1",
            checkpoints: [],
            id: "stream_1",
            last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
            next_run_at: new Date("2026-04-05T12:00:00.000Z"),
            schedule_interval_minutes: 30,
            status: "ACTIVE",
          },
        ]),
        update: vi.fn().mockResolvedValue(null),
      },
    };

    const summary = await runScheduledStreams(
      {
        now,
      },
      prisma,
    );

    expect(prisma.publishAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "stale_attempt_1",
        },
        data: expect.objectContaining({
          available_at: now,
          last_error_code: "stale_publish_attempt_recovered",
          status: "PENDING",
        }),
      }),
    );
    expect(prisma.publishAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          article_match_id: "match_1",
          available_at: now,
          diagnostics_json: expect.objectContaining({
            publicationMode: "original",
            queueSource: "orphan_recovery",
          }),
          status: "PENDING",
        }),
      }),
    );
    expect(prisma.fetchRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          queue_key: expect.stringContaining("scheduled:stream_1:"),
          status: "PENDING",
          stream_id: "stream_1",
          trigger_type: "scheduled",
        }),
      }),
    );
    expect(prisma.publishingStream.update).toHaveBeenCalledWith({
      data: {
        next_run_at: new Date("2026-04-05T12:30:00.000Z"),
      },
      where: {
        id: "stream_1",
      },
    });
    expect(summary).toMatchObject({
      dueStreamCount: 1,
      processedPublishAttempts: 0,
      recoveredArticleMatchCount: 1,
      recoveredPublishAttemptCount: 1,
      retriedPublishAttempts: 0,
    });
  });

  it("reconciles stale fetch runs back to the pending queue before processing new work", async () => {
    const { runScheduledStreams } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    const prisma = {
      articleMatch: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      fetchRun: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValue([
          {
            last_error_message: null,
            id: "stale_fetch_run_1",
            last_error_code: null,
            started_at: new Date("2026-04-05T11:00:00.000Z"),
            status: "RUNNING",
            stream_id: "stream_1",
          },
        ]),
        update: vi.fn().mockResolvedValue(null),
      },
      publishAttempt: {
        findFirst: vi.fn().mockResolvedValue(null),
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      },
      publishingStream: {
        findMany: vi.fn().mockResolvedValue([]),
        update: vi.fn().mockResolvedValue(null),
      },
    };

    const summary = await runScheduledStreams(
      {
        now,
      },
      prisma,
    );

    expect(prisma.fetchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          id: "stale_fetch_run_1",
        },
        data: expect.objectContaining({
          available_at: now,
          last_error_code: "stale_fetch_run_recovered",
          status: "PENDING",
        }),
      }),
    );
    expect(prisma.publishingStream.update).toHaveBeenCalledWith({
      data: {
        last_run_started_at: null,
      },
      where: {
        id: "stream_1",
      },
    });
    expect(summary).toMatchObject({
      dueStreamCount: 0,
      processedPublishAttempts: 0,
      recoveredFetchRunCount: 1,
    });
  });

  it("queues orphaned in-progress stream state when no fetch run remains", async () => {
    const { runScheduledStreams } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    const lastStartedAt = new Date("2026-04-05T12:00:00.000Z");
    const prisma = {
      articleMatch: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      fetchRun: {
        findFirst: vi
          .fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce(null),
        findMany: vi.fn().mockResolvedValue([]),
        upsert: vi.fn().mockResolvedValue({
          id: "fetch_run_recovered_1",
          queue_key: "recovered:stream_1:2026-04-05T12:00:00.000Z",
          status: "PENDING",
        }),
      },
      publishAttempt: {
        findMany: vi.fn().mockResolvedValueOnce([]).mockResolvedValueOnce([]),
      },
      publishingStream: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([
            {
              active_provider_id: "provider_1",
              checkpoints: [],
              id: "stream_1",
              last_run_completed_at: new Date("2026-04-05T11:00:00.000Z"),
              last_run_started_at: lastStartedAt,
              schedule_interval_minutes: 0,
              status: "ACTIVE",
            },
          ])
          .mockResolvedValueOnce([]),
      },
    };

    const summary = await runScheduledStreams(
      {
        now,
      },
      prisma,
    );

    expect(prisma.fetchRun.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          provider_config_id: "provider_1",
          queue_key: "recovered:stream_1:2026-04-05T12:00:00.000Z",
          status: "PENDING",
          stream_id: "stream_1",
          trigger_type: "recovery",
        }),
      }),
    );
    expect(prisma.fetchRun.upsert.mock.calls[0][0].create.execution_details_json).toMatchObject({
      checkpointStrategy: {
        writeCheckpointOnSuccess: false,
      },
    });
    expect(summary).toMatchObject({
      dueStreamCount: 0,
      processedPublishAttempts: 0,
      recoveredStreamExecutionCount: 1,
    });
  });

  it("claims publish attempts idempotently without mutating fetch scheduler state", async () => {
    const { claimPublishAttemptById } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    let attemptRecord = {
      available_at: new Date("2026-04-05T12:00:00.000Z"),
      heartbeat_at: null,
      id: "attempt_1",
      lease_expires_at: null,
      lease_owner: null,
      started_at: null,
      status: "PENDING",
      stream_id: "stream_1",
    };
    const db = {
      publishAttempt: {
        findUnique: vi.fn(({ where }) =>
          Promise.resolve(where.id === attemptRecord.id ? { ...attemptRecord } : null)),
        updateMany: vi.fn(({ data, where }) => {
          const claimable =
            where.id === attemptRecord.id
            && attemptRecord.status === "PENDING"
            && attemptRecord.available_at <= where.available_at.lte
            && (
              attemptRecord.lease_expires_at === null
              || attemptRecord.lease_expires_at <= where.OR[1].lease_expires_at.lte
            );

          if (!claimable) {
            return Promise.resolve({
              count: 0,
            });
          }

          attemptRecord = {
            ...attemptRecord,
            ...data,
          };

          return Promise.resolve({
            count: 1,
          });
        }),
      },
      publishingStream: {
        update: vi.fn().mockResolvedValue(null),
      },
    };

    const firstClaim = await claimPublishAttemptById(
      db,
      "attempt_1",
      {
        lease_owner: "publish_lease_1",
        now,
      },
    );
    const secondClaim = await claimPublishAttemptById(
      db,
      "attempt_1",
      {
        lease_owner: "publish_lease_2",
        now,
      },
    );

    expect(firstClaim.record).toMatchObject({
      id: "attempt_1",
      lease_owner: "publish_lease_1",
      status: "RUNNING",
      stream_id: "stream_1",
    });
    expect(secondClaim.record).toBeNull();
    expect(db.publishingStream.update).not.toHaveBeenCalled();
  });

  it("claims fetch runs idempotently and increments the attempt count once", async () => {
    const { claimFetchRunById } = await import("./workflows");
    const now = new Date("2026-04-05T12:34:56.000Z");
    let fetchRunRecord = {
      attempt_count: 0,
      available_at: new Date("2026-04-05T12:00:00.000Z"),
      heartbeat_at: null,
      id: "fetch_run_1",
      lease_expires_at: null,
      lease_owner: null,
      started_at: null,
      status: "PENDING",
    };
    const db = {
      fetchRun: {
        findUnique: vi.fn(({ where }) =>
          Promise.resolve(where.id === fetchRunRecord.id ? { ...fetchRunRecord } : null)),
        updateMany: vi.fn(({ data, where }) => {
          const claimable =
            where.id === fetchRunRecord.id
            && fetchRunRecord.status === "PENDING"
            && fetchRunRecord.available_at <= where.available_at.lte
            && (
              fetchRunRecord.lease_expires_at === null
              || fetchRunRecord.lease_expires_at <= where.OR[1].lease_expires_at.lte
            );

          if (!claimable) {
            return Promise.resolve({
              count: 0,
            });
          }

          fetchRunRecord = {
            ...fetchRunRecord,
            ...data,
          };

          return Promise.resolve({
            count: 1,
          });
        }),
      },
    };

    const firstClaim = await claimFetchRunById(
      db,
      "fetch_run_1",
      {
        lease_owner: "fetch_lease_1",
        now,
      },
    );
    const secondClaim = await claimFetchRunById(
      db,
      "fetch_run_1",
      {
        lease_owner: "fetch_lease_2",
        now,
      },
    );

    expect(firstClaim.record).toMatchObject({
      attempt_count: 1,
      id: "fetch_run_1",
      lease_owner: "fetch_lease_1",
      started_at: now,
      status: "RUNNING",
    });
    expect(secondClaim.record).toBeNull();
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
          canonical_post_id: "post_1",
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
            destination_id: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
        }),
        update: vi.fn().mockResolvedValue(null),
      },
      destinationTemplate: {
        findFirst: vi.fn().mockResolvedValue({
          body_template: "{{body}}",
          hashtags_template: "",
          platform: "WEBSITE",
          summary_template: "{{summary}}",
          title_template: "{{title}}",
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
          article_match_id: "match_1",
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
              destination_id: "destination_1",
              id: "stream_1",
              locale: "en",
              mode: "AUTO_PUBLISH",
            },
          },
          article_match_id: "match_1",
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
              image_url: null,
            },
            source_name: "Example Source",
            source_url: "https://example.com/story",
            translations: [
              {
                content_md: "Story body",
                locale: "en",
                seoRecord: {
                  keywords_json: [],
                  ogImage: null,
                },
                summary: "Story summary",
                title: "Story title",
              },
            ],
          },
          post_id: "post_1",
          queued_at: now,
          stream: {
            destination: {
              id: "destination_1",
              kind: "WEBSITE",
              platform: "WEBSITE",
            },
            destination_id: "destination_1",
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
        actor_id: "admin_1",
      },
      prisma,
    );

    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PUBLISH_ATTEMPT_MANUAL_REPOST_REQUESTED",
        actor_id: "admin_1",
        entity_id: "attempt_2",
      }),
      prisma,
    );
    expect(prisma.publishAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          diagnostics_json: expect.objectContaining({
            publicationMode: "repost",
            queueSource: "manual_repost",
          }),
          retry_count: 1,
          status: "PENDING",
        }),
      }),
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
            destination_id: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
        }),
        update: vi.fn().mockResolvedValue(null),
      },
      destinationTemplate: {
        findFirst: vi.fn().mockResolvedValue({
          body_template: "{{body}}",
          hashtags_template: "",
          platform: "WEBSITE",
          summary_template: "{{summary}}",
          title_template: "{{title}}",
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
          article_match_id: "match_1",
          id: "attempt_retry_2",
          retry_count: 1,
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
            article_match_id: "match_1",
            id: "attempt_failed_1",
            platform: "WEBSITE",
            post_id: "post_1",
            retry_count: 0,
            status: "FAILED",
            stream: {
              destination_id: "destination_1",
              id: "stream_1",
              locale: "en",
              mode: "AUTO_PUBLISH",
              retry_limit: 3,
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
                destination_id: "destination_1",
                id: "stream_1",
                locale: "en",
                mode: "AUTO_PUBLISH",
              },
            },
            article_match_id: "match_1",
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
                image_url: null,
              },
              source_name: "Example Source",
              source_url: "https://example.com/story",
              translations: [
                {
                  content_md: "Story body",
                  locale: "en",
                  seoRecord: {
                    keywords_json: [],
                    ogImage: null,
                  },
                  summary: "Story summary",
                  title: "Story title",
                },
              ],
            },
            post_id: "post_1",
            queued_at: now,
            stream: {
              destination: {
                id: "destination_1",
                kind: "WEBSITE",
                platform: "WEBSITE",
              },
              destination_id: "destination_1",
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
        actor_id: "admin_1",
      },
      prisma,
    );

    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PUBLISH_ATTEMPT_RETRY_REQUESTED",
        actor_id: "admin_1",
        entity_id: "attempt_retry_2",
      }),
      prisma,
    );
    expect(prisma.publishAttempt.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          article_match_id: "match_1",
          diagnostics_json: expect.objectContaining({
            publicationMode: "retry",
            queueSource: "retry_request",
            retryOfAttemptId: "attempt_failed_1",
          }),
          retry_count: 1,
          status: "PENDING",
        }),
      }),
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
              image_url: null,
              summary: "Story summary",
            },
            translations: [
              {
                content_md: "Story body",
                locale: "en",
                seoRecord: null,
                summary: "Story summary",
                title: "Story title",
              },
            ],
          },
          canonical_post_id: "post_1",
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            name: "Website",
            platform: "WEBSITE",
          },
          destination_id: "destination_1",
          id: "match_1",
          stream: {
            default_template_id: null,
            destination: {
              id: "destination_1",
              platform: "WEBSITE",
            },
            destination_id: "destination_1",
            id: "stream_1",
            locale: "en",
            mode: "AUTO_PUBLISH",
          },
          stream_id: "stream_1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "match_1",
          optimization_status: "SKIPPED",
        }),
      },
      destinationTemplate: {
        findFirst: vi.fn().mockResolvedValue({
          body_template: "{{body}}",
          hashtags_template: "",
          is_default: true,
          locale: "en",
          platform: "WEBSITE",
          summary_template: "{{summary}}",
          title_template: "{{title}}",
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
        optimization_hash: "hash_1",
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
        entity_id: "match_1",
        entity_type: "article_match",
        level: "warn",
        message: "AI credentials are missing, so NewsPub kept deterministic content.",
        payload: expect.objectContaining({
          destination_id: "destination_1",
          optimization_status: "SKIPPED",
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
          last_error_message: "Request timed out.",
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
        optimization_hash: "hash_2",
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
        entity_id: "match_1",
        entity_type: "article_match",
        level: "warn",
        message: "AI timed out, so NewsPub fell back to deterministic formatting.",
        payload: expect.objectContaining({
          optimization_status: "FALLBACK",
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
      fetched_count: 1,
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
        trigger_type: "manual",
      },
      prisma,
    );

    expect(fetchProviderArticles).toHaveBeenCalledTimes(1);
    expect(fetchProviderArticles).toHaveBeenCalledWith(
      expect.objectContaining({
        checkpoint: null,
        provider_key: "newsdata",
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
          cursor_json: null,
          last_successful_fetch_at: new Date("2026-04-07T12:30:00.000Z"),
        }),
      }),
    );
    expect(createAuditEventRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "FETCH_SHARED_BATCH_PLANNED",
        entity_type: "fetch_run_group",
      }),
      prisma,
    );
    expect(result).toMatchObject({
      requestedStreamCount: 2,
      upstreamRequestCount: 1,
    });
    expect(result.groups[0]).toMatchObject({
      executionMode: "shared_batch",
      provider_key: "newsdata",
      streamIds: ["stream_1", "stream_2"],
    });
  });

  it("does not drop eligible stories just because no internal category label matches the source text", async () => {
    const fetchProviderArticles = vi.fn().mockResolvedValue({
      articles: [
        createWorkflowArticle("general_story", {
          providerCategories: ["general"],
          title: "Federal Reserve announces a rate decision",
        }),
      ],
      cursor: {
        page: 1,
      },
      fetched_count: 1,
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
        categories: [
          {
            id: "category_world",
            name: "World",
            slug: "world",
          },
        ],
        destinationPlatform: "WEBSITE",
        id: "website_stream",
        mode: "REVIEW_REQUIRED",
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
        trigger_type: "manual",
      },
      prisma,
    );

    expect(prisma.articleMatch.create).toHaveBeenCalledTimes(1);
    expect(completedRun).toMatchObject({
      held_count: 1,
      publishable_count: 1,
      skipped_count: 0,
      status: "SUCCEEDED",
    });
  });

  it("executes website auto-publish attempts during the stream run", async () => {
    const recordObservabilityEvent = vi.fn().mockResolvedValue(null);
    const fetchProviderArticles = vi.fn().mockResolvedValue({
      articles: [createWorkflowArticle("website_auto_story")],
      cursor: {
        page: 1,
      },
      fetched_count: 1,
    });

    vi.doMock("@/lib/ai", () => ({
      optimizeDestinationPayload: vi.fn().mockResolvedValue(createOptimizationPassResult()),
    }));
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
      recordObservabilityEvent,
    }));
    vi.doMock("@/lib/news/providers", () => ({
      fetchProviderArticles,
    }));
    vi.doMock("@/lib/revalidation", () => ({
      revalidatePublishedPostPaths: vi.fn().mockRejectedValue(new Error("revalidate failed")),
    }));
    vi.doMock("@/lib/validation/configuration", () => ({
      getStreamValidationIssues: vi.fn().mockReturnValue([]),
    }));

    const { runStreamFetch } = await import("./workflows");
    const prisma = createWorkflowExecutionPrisma({
      website_stream: createWorkflowStream({
        destinationPlatform: "WEBSITE",
        id: "website_stream",
        mode: "AUTO_PUBLISH",
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
        trigger_type: "manual",
      },
      prisma,
    );

    expect(prisma.publishAttempt.create).toHaveBeenCalledTimes(1);
    expect(completedRun).toMatchObject({
      failed_count: 0,
      published_count: 1,
      publishable_count: 1,
      queued_count: 1,
      status: "SUCCEEDED",
    });
    expect(prisma.publishAttempt.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          status: "SUCCEEDED",
        }),
      }),
    );
    expect(prisma.post.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          published_at: expect.any(Date),
          status: "PUBLISHED",
        }),
      }),
    );
    expect(recordObservabilityEvent).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "PUBLICATION_REVALIDATION_FAILED",
        entity_type: "post",
      }),
      prisma,
    );
  });

  it("processes every eligible website candidate from a broad pool even when max_posts_per_run is lower", async () => {
    const fetchProviderArticles = vi.fn().mockResolvedValue({
      articles: [
        createWorkflowArticle("website_story_1"),
        createWorkflowArticle("website_story_2", {
          dedupe_fingerprint: "fingerprint_website_story_2",
          normalized_title_hash: "title_hash_website_story_2",
          provider_article_id: "provider_website_story_2",
          source_url: "https://example.com/website_story_2",
          source_url_hash: "source_hash_website_story_2",
          title: "Story title website 2",
        }),
      ],
      cursor: {
        page: 2,
      },
      fetched_count: 2,
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
        max_posts_per_run: 1,
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
        trigger_type: "manual",
      },
      prisma,
    );

    expect(prisma.articleMatch.create).toHaveBeenCalledTimes(2);
    expect(prisma.providerFetchCheckpoint.upsert).not.toHaveBeenCalled();
    expect(completedRun).toMatchObject({
      held_count: 2,
      publishable_count: 2,
      queued_count: 0,
      status: "SUCCEEDED",
    });
    expect(prisma.fetchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          execution_details_json: expect.objectContaining({
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
            dedupe_fingerprint: "fingerprint_1",
            image_url: "https://cdn.example.com/story.jpg",
            language: "en",
            normalized_title_hash: "title_hash_1",
            provider_article_id: "provider_story_1",
            providerCategories: ["breaking"],
            providerCountries: ["ug"],
            providerRegions: [],
            published_at: "2026-04-07T10:00:00.000Z",
            raw_payload_json: {
              id: "provider_story_1",
            },
            source_name: "Example Source",
            source_url: "https://example.com/story",
            source_url_hash: "source_hash_1",
            summary: "Story summary",
            tags: ["tag-one"],
            title: "Story title",
          },
        ],
        cursor: {
          page: 1,
        },
        fetched_count: 1,
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
          started_at: new Date("2026-04-07T12:00:00.000Z"),
        }),
        update: vi.fn().mockResolvedValue({
          duplicate_count: 1,
          id: "fetch_run_1",
          publishable_count: 0,
          status: "SUCCEEDED",
        }),
      },
      fetchedArticle: {
        upsert: vi.fn().mockResolvedValue({
          id: "article_1",
          source_name: "Example Source",
          source_url: "https://example.com/story",
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
            provider_key: "newsdata",
            request_defaults_json: {},
          },
          active_provider_id: "provider_config_1",
          categories: [],
          checkpoints: [],
          consecutive_failure_count: 0,
          country_allowlist_json: [],
          defaultTemplate: null,
          destination: {
            id: "destination_1",
            kind: "FACEBOOK_PAGE",
            platform: "FACEBOOK",
          },
          destination_id: "destination_1",
          duplicate_window_hours: 48,
          exclude_keywords_json: [],
          id: "stream_1",
          include_keywords_json: [],
          language_allowlist_json: [],
          locale: "en",
          mode: "AUTO_PUBLISH",
          region_allowlist_json: [],
          retry_limit: 3,
          settings_json: {},
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
          dedupe_fingerprint: "fingerprint_1",
        },
      }),
    );
    expect(prisma.articleMatch.create).not.toHaveBeenCalled();
    expect(prisma.fetchRun.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          duplicate_count: 1,
          publishable_count: 0,
          status: "SUCCEEDED",
        }),
      }),
    );
  });
});
