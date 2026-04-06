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
