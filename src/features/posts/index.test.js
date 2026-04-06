import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createPrismaStub(overrides = {}) {
  return {
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

    vi.doMock("@/lib/analytics", () => ({
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
    vi.doMock("@/lib/analytics", () => ({
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

    vi.doMock("@/lib/analytics", () => ({
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

    vi.doMock("@/lib/analytics", () => ({
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

    vi.doMock("@/lib/analytics", () => ({
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
});
