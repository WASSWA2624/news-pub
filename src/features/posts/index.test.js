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
        featuredImageId: null,
        id: "post_1",
        slug: "manual-story",
        sourceName: "NewsPub Editorial",
        sourceUrl: "https://example.com/source-story",
      }),
      findUnique: vi.fn().mockResolvedValue(null),
      update: vi.fn().mockResolvedValue(null),
      ...(overrides.post || {}),
    },
    postCategory: {
      create: vi.fn().mockResolvedValue({
        categoryId: "category_1",
        postId: "post_1",
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
            providerKey: "mediastack",
          },
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            name: "Website",
            platform: "WEBSITE",
            slug: "website",
          },
          destinationId: "destination_1",
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
    failedAt: null,
    fetchedArticle: null,
    filterReasonsJson: [],
    holdReasonsJson: [],
    id: "match_1",
    publishAttempts: [],
    publishedAt: null,
    queuedAt: null,
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
        categoryId: "category_1",
      },
    ],
    editorialStage: "APPROVED",
    excerpt: "Story summary",
    featuredImage: null,
    id: "post_1",
    providerKey: "manual",
    publishedAt: new Date("2026-04-01T10:00:00.000Z"),
    scheduledPublishAt: null,
    slug: "story-title",
    sourceArticle: null,
    sourceName: "NewsPub Editorial",
    sourceUrl: "https://example.com/source-story",
    status: "PUBLISHED",
    translations: [
      {
        contentHtml: "<p>Story body</p>",
        contentMd: "Story body",
        id: "translation_1",
        locale: "en",
        seoRecord: null,
        sourceAttribution: "Source: NewsPub Editorial - https://example.com/source-story",
        structuredContentJson: {},
        summary: "Story summary",
        title: "Story title",
        updatedAt: new Date("2026-04-01T11:00:00.000Z"),
      },
    ],
    updatedAt: new Date("2026-04-01T12:00:00.000Z"),
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
          contentMd: "Manual body copy",
          sourceName: "NewsPub Editorial",
          sourceUrl: "https://example.com/source-story",
          streamId: "stream_1",
          summary: "Manual summary",
          title: "Manual Story",
        },
        {
          actorId: "user_1",
        },
        prisma,
      ),
    ).resolves.toEqual({
      locale: "en",
      postId: "post_1",
    });

    expect(prisma.fetchedArticle.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          providerConfigId: "provider_1",
          rawPayloadJson: expect.objectContaining({
            manualEntry: true,
            streamId: "stream_1",
          }),
          sourceName: "NewsPub Editorial",
          sourceUrl: "https://example.com/source-story",
          title: "Manual Story",
        }),
      }),
    );
    expect(prisma.post.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        providerKey: "manual",
        sourceArticleId: "article_1",
        status: "DRAFT",
      }),
    });
    expect(prisma.articleMatch.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        canonicalPostId: "post_1",
        destinationId: "destination_1",
        fetchedArticleId: "article_1",
        holdReasonsJson: [],
        status: "ELIGIBLE",
        streamId: "stream_1",
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
          contentMd: "Manual body copy",
          sourceName: "NewsPub Editorial",
          sourceUrl: "https://example.com/source-story",
          streamId: "stream_1",
          summary: "Manual summary",
          title: "Manual Story",
        },
        {
          actorId: "user_1",
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
          postId: post.id,
          status: "PUBLISHED",
          summary: "Updated summary",
          title: "Updated title",
        },
        {
          actorId: "user_1",
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
          postId: post.id,
          status: "PUBLISHED",
          summary: "Updated summary",
        },
        {
          actorId: "user_1",
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
          postId: post.id,
          status: "SCHEDULED",
        },
        {
          actorId: "user_1",
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
          articleMatchId: "match_1",
          postId: post.id,
        },
        {
          actorId: "user_1",
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
        articleMatchId: "match_1",
        postId: post.id,
      },
      {
        actorId: "user_1",
      },
      prisma,
    );

    expect(prisma.articleMatch.update).toHaveBeenCalledWith({
      data: {
        holdReasonsJson: ["rejected_by_editor"],
        reviewNotes: "Rejected during editor review.",
        status: "HELD_FOR_REVIEW",
        workflowStage: "HELD",
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
          policyStatus: "BLOCK",
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
          articleMatchId: "match_1",
          postId: post.id,
        },
        {
          actorId: "user_1",
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
          articleMatchId: "match_1",
          postId: post.id,
        },
        {
          actorId: "user_1",
        },
        prisma,
      ),
    ).resolves.toEqual({
      articleMatchId: "match_1",
      attemptId: "attempt_repost_1",
      postId: "post_1",
    });

    expect(manualRepostArticleMatch).toHaveBeenCalledWith(
      "match_1",
      {
        actorId: "user_1",
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
        imageUrl: "https://cdn.example.com/source-story.jpg",
        language: "en",
        providerArticleId: "provider-article-1",
        providerCategoriesJson: [],
        providerCountriesJson: [],
        providerRegionsJson: [],
        publishedAt: new Date("2026-04-01T08:00:00.000Z"),
        sourceName: "Example Source",
        sourceUrl: "https://example.com/source-story",
        summary: "Story summary",
        tagsJson: [],
        title: "Story title",
      },
    });
    const prisma = createPrismaStub({
      post: {
        findUnique: vi.fn().mockResolvedValue(post),
      },
    });

    const snapshot = await getPostEditorSnapshot({ locale: "en", postId: post.id }, prisma);

    expect(snapshot.post.featuredImage).toMatchObject({
      alt: "Story title",
      url: "https://cdn.example.com/source-story.jpg",
    });
  });

  it("uses the fetched source image in published translation snapshots when no local featured image exists", async () => {
    const { getPublishedPostTranslationBySlug } = await import("./index");
    const post = createEditorPost({
      sourceArticle: {
        imageUrl: "https://cdn.example.com/source-story.jpg",
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
              completedAt: new Date("2026-04-01T10:15:00.000Z"),
              createdAt: new Date("2026-04-01T10:05:00.000Z"),
              diagnosticsJson: {
                policyStatus: "PASS",
              },
              errorCode: "provider_payload_invalid",
              errorMessage: "Graph API returned 190: Invalid OAuth 2.0 Access Token.",
              id: "attempt_1",
              platform: "FACEBOOK",
              publishedAt: null,
              queuedAt: new Date("2026-04-01T10:00:00.000Z"),
              retryCount: 1,
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
            actorId: "user_1",
            createdAt: new Date("2026-04-01T10:16:00.000Z"),
            entityId: "attempt_1",
            entityType: "publish_attempt",
            id: "audit_1",
            payloadJson: {
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

    const snapshot = await getPostEditorSnapshot({ locale: "en", postId: post.id }, prisma);

    expect(snapshot.post.articleMatches[0].publishAttempts[0]).toMatchObject({
      errorCode: "provider_payload_invalid",
      errorMessage: "Graph API returned 190: Invalid OAuth 2.0 Access Token.",
      retryable: true,
      status: "FAILED",
    });
    expect(snapshot.auditEvents[0]).toMatchObject({
      action: "PUBLISH_ATTEMPT_FAILED",
      entityId: "attempt_1",
      entityType: "publish_attempt",
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
          optimizationStatus: "SKIPPED",
          optimizedPayloadJson: {
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

    const snapshot = await getPostEditorSnapshot({ locale: "en", postId: post.id }, prisma);

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
          optimizationStatus: "SKIPPED",
        }),
      ],
    });
    const prisma = createPrismaStub({
      auditEvent: {
        findMany: vi.fn().mockResolvedValue([
          {
            action: "AI_OPTIMIZATION_SKIPPED",
            actorId: null,
            createdAt: new Date("2026-04-01T10:20:00.000Z"),
            entityId: "match_1",
            entityType: "article_match",
            id: "audit_ai_skip",
            payloadJson: {
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

    const snapshot = await getPostEditorSnapshot({ locale: "en", postId: post.id }, prisma);

    expect(snapshot.auditEvents[0]).toMatchObject({
      action: "AI_OPTIMIZATION_SKIPPED",
      level: "warn",
      reasonCode: "ai_credentials_missing",
      reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
    });
  });
});
