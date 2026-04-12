import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

async function createAnalyticsMock(overrides = {}) {
  const actual = await vi.importActual("@/lib/analytics");

  return {
    ...actual,
    ...overrides,
  };
}

function createPrismaStub(overrides = {}) {
  return {
    auditEvent: {
      findMany: vi.fn().mockResolvedValue([]),
      ...(overrides.auditEvent || {}),
    },
    articleMatch: {
      create: vi.fn().mockResolvedValue({
        id: "match_1",
      }),
      ...(overrides.articleMatch || {}),
    },
    category: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "category_1",
          name: "Technology",
          slug: "technology",
        },
      ]),
      ...(overrides.category || {}),
    },
    fetchedArticle: {
      create: vi.fn().mockResolvedValue({
        id: "article_1",
      }),
      ...(overrides.fetchedArticle || {}),
    },
    post: {
      create: vi.fn().mockResolvedValue({
        excerpt: "Manual summary",
        featured_image_id: null,
        id: "post_1",
        slug: "manual-story",
        source_name: "NewsPub Editorial",
        source_url: "https://example.com/source-story",
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      ...(overrides.post || {}),
    },
    postCategory: {
      create: vi.fn().mockResolvedValue({
        category_id: "category_1",
        post_id: "post_1",
      }),
      deleteMany: vi.fn().mockResolvedValue({
        count: 0,
      }),
      ...(overrides.postCategory || {}),
    },
    postTranslation: {
      upsert: vi.fn().mockResolvedValue({
        id: "translation_1",
      }),
      ...(overrides.postTranslation || {}),
    },
    publishingStream: {
      findMany: vi.fn().mockResolvedValue([
        {
          activeProvider: {
            id: "provider_1",
            provider_key: "mediastack",
          },
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            name: "Website",
            platform: "WEBSITE",
            slug: "website",
          },
          destination_id: "destination_1",
          id: "stream_1",
          locale: "en",
          mode: "REVIEW_REQUIRED",
          name: "Website Feed",
          status: "ACTIVE",
        },
      ]),
      ...(overrides.publishingStream || {}),
    },
    sEORecord: {
      upsert: vi.fn().mockResolvedValue({
        id: "seo_1",
      }),
      ...(overrides.sEORecord || {}),
    },
  };
}

function createEditorArticleMatch(overrides = {}) {
  return {
    destination: {
      id: "destination_1",
      kind: "WEBSITE",
      name: "Website",
      platform: "WEBSITE",
      slug: "website",
    },
    failed_at: null,
    fetchedArticle: null,
    filter_reasons_json: [],
    hold_reasons_json: [],
    id: "match_1",
    publishAttempts: [],
    published_at: null,
    queued_at: null,
    status: "ELIGIBLE",
    stream: {
      id: "stream_1",
      locale: "en",
      mode: "REVIEW_REQUIRED",
      name: "Website Feed",
      status: "ACTIVE",
    },
    ...overrides,
  };
}

function createEditorPost(overrides = {}) {
  return {
    articleMatches: [],
    categories: [
      {
        category: {
          id: "category_1",
          name: "Technology",
          slug: "technology",
        },
        category_id: "category_1",
      },
    ],
    editorial_stage: "APPROVED",
    excerpt: "Story summary",
    featuredImage: null,
    id: "post_1",
    provider_key: "manual",
    published_at: new Date("2026-04-01T10:00:00.000Z"),
    scheduled_publish_at: null,
    slug: "story-title",
    sourceArticle: null,
    source_name: "NewsPub Editorial",
    source_url: "https://example.com/source-story",
    status: "PUBLISHED",
    translations: [
      {
        content_html: "<p>Story body</p>",
        content_md: "Story body",
        id: "translation_1",
        locale: "en",
        seoRecord: null,
        source_attribution: "Source: NewsPub Editorial - https://example.com/source-story",
        structured_content_json: {},
        summary: "Story summary",
        title: "Story title",
        updated_at: new Date("2026-04-01T11:00:00.000Z"),
      },
    ],
    updated_at: new Date("2026-04-01T12:00:00.000Z"),
    ...overrides,
  };
}

describe("manual post creation", () => {
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

  it("creates a manual website story and queues publication through the selected stream", async () => {
    const publishArticleMatch = vi.fn().mockResolvedValue({
      id: "attempt_1",
    });

    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      publishArticleMatch,
    }));

    const { createManualPostRecord } = await import("./index");
    const prisma = createPrismaStub();

    await expect(
      createManualPostRecord(
        {
          action: "publish",
          categoryIds: ["category_1"],
          content_md: "Manual body copy",
          source_name: "NewsPub Editorial",
          source_url: "https://example.com/source-story",
          stream_id: "stream_1",
          summary: "Manual summary",
          title: "Manual Story",
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).resolves.toEqual({
      locale: "en",
      post_id: "post_1",
    });

    expect(prisma.fetchedArticle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          provider_config_id: "provider_1",
          raw_payload_json: expect.objectContaining({
            manualEntry: true,
            stream_id: "stream_1",
          }),
          source_name: "NewsPub Editorial",
          source_url: "https://example.com/source-story",
          title: "Manual Story",
        }),
      }),
    );
    expect(prisma.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        provider_key: "manual",
        source_article_id: "article_1",
        status: "DRAFT",
      }),
    });
    expect(prisma.articleMatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canonical_post_id: "post_1",
        destination_id: "destination_1",
        fetched_article_id: "article_1",
        hold_reasons_json: [],
        status: "ELIGIBLE",
        stream_id: "stream_1",
      }),
    });
    expect(publishArticleMatch).toHaveBeenCalledWith("match_1", {}, prisma);
  });

  it("requires a future publish time when the manual story is scheduled", async () => {
    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      publishArticleMatch: vi.fn(),
    }));

    const { createManualPostRecord } = await import("./index");
    const prisma = createPrismaStub();

    await expect(
      createManualPostRecord(
        {
          action: "schedule",
          content_md: "Manual body copy",
          source_name: "NewsPub Editorial",
          source_url: "https://example.com/source-story",
          stream_id: "stream_1",
          summary: "Manual summary",
          title: "Manual Story",
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "manual_post_validation_failed",
    });

    expect(prisma.fetchedArticle.create).not.toHaveBeenCalled();
    expect(prisma.post.create).not.toHaveBeenCalled();
  });
});

describe("post editor updates", () => {
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

  it("saves an already published story without triggering publication again", async () => {
    const publishArticleMatch = vi.fn().mockResolvedValue({
      id: "attempt_1",
    });

    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      publishArticleMatch,
    }));

    const { updatePostEditorialRecord } = await import("./index");
    const post = createEditorPost();
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
        update: vi.fn().mockResolvedValue(post),
      },
    });

    await expect(
      updatePostEditorialRecord(
        {
          action: "save",
          post_id: post.id,
          status: "PUBLISHED",
          summary: "Updated summary",
          title: "Updated title",
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).resolves.toMatchObject({
      post: {
        id: "post_1",
        status: "PUBLISHED",
      },
    });

    expect(publishArticleMatch).not.toHaveBeenCalled();
  });

  it("still publishes when the API requests a published status without an explicit action", async () => {
    const publishArticleMatch = vi.fn().mockResolvedValue({
      id: "attempt_1",
    });

    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      publishArticleMatch,
    }));

    const { updatePostEditorialRecord } = await import("./index");
    const post = createEditorPost({
      articleMatches: [createEditorArticleMatch()],
      status: "DRAFT",
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
        update: vi.fn().mockResolvedValue(post),
      },
    });

    await expect(
      updatePostEditorialRecord(
        {
          post_id: post.id,
          status: "PUBLISHED",
          summary: "Updated summary",
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).resolves.toMatchObject({
      post: {
        id: "post_1",
      },
    });

    expect(publishArticleMatch).toHaveBeenCalledWith("match_1", {}, prisma);
  });

  it("requires a future publish time when scheduling from the editor", async () => {
    const publishArticleMatch = vi.fn().mockResolvedValue({
      id: "attempt_1",
    });

    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      publishArticleMatch,
    }));

    const { updatePostEditorialRecord } = await import("./index");
    const post = createEditorPost({
      status: "DRAFT",
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
        update: vi.fn().mockResolvedValue(post),
      },
    });

    await expect(
      updatePostEditorialRecord(
        {
          action: "schedule",
          post_id: post.id,
          status: "SCHEDULED",
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "manual_post_validation_failed",
    });

    expect(publishArticleMatch).not.toHaveBeenCalled();
  });

  it("re-optimizes the selected destination match only when explicitly requested", async () => {
    const publishArticleMatch = vi.fn().mockResolvedValue({
      id: "attempt_1",
    });
    const refreshArticleMatchOptimization = vi.fn().mockResolvedValue({
      cacheHit: false,
      payload: {
        title: "Optimized title",
      },
      policy: {
        reasons: [],
        status: "PASS",
      },
    });

    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      manualRepostArticleMatch: vi.fn(),
      publishArticleMatch,
      refreshArticleMatchOptimization,
    }));

    const { updatePostEditorialRecord } = await import("./index");
    const post = createEditorPost({
      articleMatches: [createEditorArticleMatch()],
      status: "DRAFT",
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
        update: vi.fn().mockResolvedValue(post),
      },
    });

    await expect(
      updatePostEditorialRecord(
        {
          action: "optimize",
          article_match_id: "match_1",
          post_id: post.id,
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).resolves.toMatchObject({
      post: {
        id: "post_1",
      },
    });

    expect(refreshArticleMatchOptimization).toHaveBeenCalledWith(
      "match_1",
      { force: true },
      prisma,
    );
    expect(publishArticleMatch).not.toHaveBeenCalled();
  });

  it("holds a selected destination match when the editor rejects publication", async () => {
    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      manualRepostArticleMatch: vi.fn(),
      publishArticleMatch: vi.fn(),
      refreshArticleMatchOptimization: vi.fn(),
    }));

    const { updatePostEditorialRecord } = await import("./index");
    const post = createEditorPost({
      articleMatches: [createEditorArticleMatch()],
      status: "DRAFT",
    });
    const prisma = createPrismaStub({
      articleMatch: {
        create: vi.fn().mockResolvedValue({
          id: "match_1",
        }),
        update: vi.fn().mockResolvedValue({
          id: "match_1",
          status: "HELD_FOR_REVIEW",
        }),
      },
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
        update: vi.fn().mockResolvedValue(post),
      },
    });

    await updatePostEditorialRecord(
      {
        action: "reject",
        article_match_id: "match_1",
        post_id: post.id,
      },
      {
        actor_id: "user_1",
      },
      prisma,
    );

    expect(prisma.articleMatch.update).toHaveBeenCalledWith({
      data: {
        hold_reasons_json: ["rejected_by_editor"],
        review_notes: "Rejected during editor review.",
        status: "HELD_FOR_REVIEW",
        workflow_stage: "HELD",
      },
      where: {
        id: "match_1",
      },
    });
  });

  it("blocks approval while the selected destination match still has blocked policy findings", async () => {
    vi.doMock("@/lib/analytics", async () =>
      createAnalyticsMock({
        createAuditEventRecord: vi.fn().mockResolvedValue(null),
      }));
    vi.doMock("@/lib/news/workflows", () => ({
      manualRepostArticleMatch: vi.fn(),
      publishArticleMatch: vi.fn(),
      refreshArticleMatchOptimization: vi.fn(),
    }));

    const { updatePostEditorialRecord } = await import("./index");
    const post = createEditorPost({
      articleMatches: [
        createEditorArticleMatch({
          policy_status: "BLOCK",
        }),
      ],
      status: "DRAFT",
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
        update: vi.fn().mockResolvedValue(post),
      },
    });

    await expect(
      updatePostEditorialRecord(
        {
          action: "approve",
          article_match_id: "match_1",
          post_id: post.id,
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "article_match_policy_blocked",
    });
  });
});

describe("manual reposts", () => {
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

  it("creates a fresh repost attempt even when the post is already archived", async () => {
    const manualRepostArticleMatch = vi.fn().mockResolvedValue({
      id: "attempt_repost_1",
    });

    vi.doMock("@/lib/news/workflows", () => ({
      manualRepostArticleMatch,
      publishArticleMatch: vi.fn(),
    }));

    const { repostPostRecord } = await import("./index");
    const post = createEditorPost({
      articleMatches: [
        createEditorArticleMatch({
          status: "PUBLISHED",
        }),
      ],
      status: "ARCHIVED",
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    });

    await expect(
      repostPostRecord(
        {
          article_match_id: "match_1",
          post_id: post.id,
        },
        {
          actor_id: "user_1",
        },
        prisma,
      ),
    ).resolves.toEqual({
      article_match_id: "match_1",
      attemptId: "attempt_repost_1",
      post_id: "post_1",
    });

    expect(manualRepostArticleMatch).toHaveBeenCalledWith(
      "match_1",
      {
        actor_id: "user_1",
      },
      prisma,
    );
  });
});

describe("post image fallbacks", () => {
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

  it("uses the fetched source image in the editor snapshot when no local featured image exists", async () => {
    const { getPostEditorSnapshot } = await import("./index");
    const post = createEditorPost({
      sourceArticle: {
        author: null,
        body: null,
        id: "article_1",
        image_url: "https://cdn.example.com/source-story.jpg",
        language: "en",
        provider_article_id: "provider-article-1",
        provider_categories_json: [],
        provider_countries_json: [],
        provider_regions_json: [],
        published_at: new Date("2026-04-01T08:00:00.000Z"),
        source_name: "Example Source",
        source_url: "https://example.com/source-story",
        summary: "Story summary",
        tags_json: [],
        title: "Story title",
      },
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    });

    const snapshot = await getPostEditorSnapshot({ locale: "en", post_id: post.id }, prisma);

    expect(snapshot.post.featuredImage).toMatchObject({
      alt: "Story title",
      url: "https://cdn.example.com/source-story.jpg",
    });
  });

  it("uses the fetched source image in published translation snapshots when no local featured image exists", async () => {
    const { getPublishedPostTranslationBySlug } = await import("./index");
    const post = createEditorPost({
      sourceArticle: {
        image_url: "https://cdn.example.com/source-story.jpg",
      },
    });
    const prisma = createPrismaStub({
      post: {
        findFirst: vi.fn().mockResolvedValue(post),
      },
    });

    const snapshot = await getPublishedPostTranslationBySlug({ locale: "en", slug: post.slug }, prisma);

    expect(snapshot.featuredImage).toMatchObject({
      alt: "Story title",
      url: "https://cdn.example.com/source-story.jpg",
    });
  });

  it("surfaces publish failures together with the latest audit trail in the editor snapshot", async () => {
    const { getPostEditorSnapshot } = await import("./index");
    const post = createEditorPost({
      articleMatches: [
        createEditorArticleMatch({
          publishAttempts: [
            {
              completed_at: new Date("2026-04-01T10:15:00.000Z"),
              created_at: new Date("2026-04-01T10:05:00.000Z"),
              diagnostics_json: {
                policy_status: "PASS",
              },
              last_error_code: "provider_payload_invalid",
              last_error_message: "Graph API returned 190: Invalid OAuth 2.0 Access Token.",
              id: "attempt_1",
              platform: "FACEBOOK",
              published_at: null,
              queued_at: new Date("2026-04-01T10:00:00.000Z"),
              retry_count: 1,
              retryable: true,
              status: "FAILED",
            },
          ],
        }),
      ],
    });
    const prisma = createPrismaStub({
      auditEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            action: "PUBLISH_ATTEMPT_FAILED",
            actor_id: "user_1",
            created_at: new Date("2026-04-01T10:16:00.000Z"),
            entity_id: "attempt_1",
            entity_type: "publish_attempt",
            id: "audit_1",
            payload_json: {
              level: "error",
              reasonCode: "provider_payload_invalid",
              reasonMessage: "Graph API returned 190: Invalid OAuth 2.0 Access Token.",
            },
          },
        ]),
      },
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    });

    const snapshot = await getPostEditorSnapshot({ locale: "en", post_id: post.id }, prisma);

    expect(snapshot.post.articleMatches[0].publishAttempts[0]).toMatchObject({
      last_error_code: "provider_payload_invalid",
      last_error_message: "Graph API returned 190: Invalid OAuth 2.0 Access Token.",
      retryable: true,
      status: "FAILED",
    });
    expect(snapshot.auditEvents[0]).toMatchObject({
      action: "PUBLISH_ATTEMPT_FAILED",
      entity_id: "attempt_1",
      entity_type: "publish_attempt",
      level: "error",
      reasonCode: "provider_payload_invalid",
      reasonMessage: "Graph API returned 190: Invalid OAuth 2.0 Access Token.",
    });
  });

  it("surfaces skipped AI reasons in editor snapshots so admins can see why deterministic content was used", async () => {
    const { getPostEditorSnapshot } = await import("./index");
    const post = createEditorPost({
      articleMatches: [
        createEditorArticleMatch({
          optimization_status: "SKIPPED",
          optimized_payload_json: {
            aiResolution: {
              reasonCode: "ai_credentials_missing",
              reasonMessage: "AI credentials are missing, so NewsPub used deterministic formatting instead.",
              status: "SKIPPED",
              usedDeterministicFallback: true,
            },
            body: "Deterministic website body",
            title: "Deterministic title",
          },
        }),
      ],
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    });

    const snapshot = await getPostEditorSnapshot({ locale: "en", post_id: post.id }, prisma);

    expect(snapshot.post.articleMatches[0].optimizationDetails).toMatchObject({
      reasonCode: "ai_credentials_missing",
      status: "SKIPPED",
      usedDeterministicFallback: true,
    });
  });

  it("maps skipped AI audit events into the editor timeline with warning severity and reason text", async () => {
    const { getPostEditorSnapshot } = await import("./index");
    const post = createEditorPost({
      articleMatches: [
        createEditorArticleMatch({
          optimization_status: "SKIPPED",
        }),
      ],
    });
    const prisma = createPrismaStub({
      auditEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            action: "AI_OPTIMIZATION_SKIPPED",
            actor_id: null,
            created_at: new Date("2026-04-01T10:20:00.000Z"),
            entity_id: "match_1",
            entity_type: "article_match",
            id: "audit_ai_skip",
            payload_json: {
              level: "warn",
              reasonCode: "ai_credentials_missing",
              reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
            },
          },
        ]),
      },
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    });

    const snapshot = await getPostEditorSnapshot({ locale: "en", post_id: post.id }, prisma);

    expect(snapshot.auditEvents[0]).toMatchObject({
      action: "AI_OPTIMIZATION_SKIPPED",
      level: "warn",
      reasonCode: "ai_credentials_missing",
      reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
    });
  });
});
