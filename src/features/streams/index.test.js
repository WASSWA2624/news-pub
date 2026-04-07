import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createPrismaStub(overrides = {}) {
  return {
    destination: {
      findUnique: vi.fn().mockResolvedValue({
        id: "destination_1",
        kind: "WEBSITE",
        name: "Website",
        platform: "WEBSITE",
        slug: "website",
      }),
      ...(overrides.destination || {}),
    },
    destinationTemplate: {
      findUnique: vi.fn().mockResolvedValue(null),
      ...(overrides.destinationTemplate || {}),
    },
    newsProviderConfig: {
      findUnique: vi.fn().mockResolvedValue({
        id: "provider_1",
        providerKey: "mediastack",
      }),
      ...(overrides.newsProviderConfig || {}),
    },
    providerFetchCheckpoint: {
      upsert: vi.fn().mockResolvedValue({
        id: "checkpoint_1",
      }),
      ...(overrides.providerFetchCheckpoint || {}),
    },
    publishingStream: {
      delete: vi.fn().mockResolvedValue({
        activeProviderId: "provider_1",
        destinationId: "destination_1",
        id: "stream_1",
        name: "Website via Mediastack",
        slug: "website-via-mediastack",
      }),
      findUnique: vi.fn().mockResolvedValue({
        activeProviderId: "provider_1",
        destinationId: "destination_1",
        id: "stream_1",
        name: "Website via Mediastack",
        slug: "website-via-mediastack",
      }),
      upsert: vi.fn().mockResolvedValue({
        activeProviderId: "provider_1",
        destinationId: "destination_1",
        id: "stream_1",
        mode: "REVIEW_REQUIRED",
        status: "ACTIVE",
      }),
      ...(overrides.publishingStream || {}),
    },
    streamCategory: {
      create: vi.fn().mockResolvedValue({
        id: "stream_category_1",
      }),
      deleteMany: vi.fn().mockResolvedValue({
        count: 0,
      }),
      ...(overrides.streamCategory || {}),
    },
  };
}

describe("stream feature validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
    }));
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects default templates that do not match the selected destination platform", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "FACEBOOK_PAGE",
          name: "Facebook Page",
          platform: "FACEBOOK",
          slug: "facebook-page",
        }),
      },
      destinationTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          id: "template_1",
          name: "Website Default",
          platform: "WEBSITE",
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          activeProviderId: "provider_1",
          defaultTemplateId: "template_1",
          destinationId: "destination_1",
          locale: "en",
          mode: "REVIEW_REQUIRED",
          name: "Mismatch stream",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });
  });

  it("rejects auto-publish streams for instagram personal destinations", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "INSTAGRAM_PERSONAL",
          name: "Instagram Personal",
          platform: "INSTAGRAM",
          slug: "instagram-personal",
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          activeProviderId: "provider_1",
          destinationId: "destination_1",
          locale: "en",
          mode: "AUTO_PUBLISH",
          name: "Instagram auto stream",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });
  });

  it("sanitizes and saves provider-side stream filters with allowlists", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "WEBSITE",
          name: "Website",
          platform: "WEBSITE",
          slug: "website",
        }),
      },
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          providerKey: "newsdata",
        }),
      },
    });

    await saveStreamRecord(
      {
        activeProviderId: "provider_1",
        categoryIds: ["category_1"],
        countryAllowlistJson: ["UG", "US"],
        destinationId: "destination_1",
        excludeKeywordsJson: "rumor",
        includeKeywordsJson: "ai, policy",
        languageAllowlistJson: ["EN", "FR"],
        locale: "en",
        mode: "REVIEW_REQUIRED",
        name: "NewsData stream",
        providerFilters: {
          bogus: "drop-me",
          category: ["technology", "technology"],
          endpoint: "latest",
          excludeCountries: ["gb"],
          fullContent: "",
          image: "1",
          removeDuplicate: "1",
        },
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          countryAllowlistJson: ["ug", "us"],
          excludeKeywordsJson: ["rumor"],
          includeKeywordsJson: ["ai", "policy"],
          languageAllowlistJson: ["en", "fr"],
          settingsJson: {
            providerFilters: {
              category: ["technology"],
              endpoint: "latest",
              excludeCountries: ["gb"],
              fullContent: "",
              image: "1",
              removeDuplicate: "1",
            },
            socialPost: {
              linkPlacement: "RANDOM",
              linkUrl: null,
            },
          },
        }),
      }),
    );
    expect(prisma.streamCategory.create).toHaveBeenCalledWith({
      data: {
        categoryId: "category_1",
        streamId: "stream_1",
      },
    });
    expect(prisma.providerFetchCheckpoint.upsert).toHaveBeenCalledWith({
      create: {
        providerConfigId: "provider_1",
        streamId: "stream_1",
      },
      update: {},
      where: {
        streamId_providerConfigId: {
          providerConfigId: "provider_1",
          streamId: "stream_1",
        },
      },
    });
  });

  it('rejects NewsAPI "Everything" streams without a query or domain filter', async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "WEBSITE",
          name: "Website",
          platform: "WEBSITE",
          slug: "website",
        }),
      },
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          providerKey: "newsapi",
          requestDefaultsJson: {
            category: "general",
            endpoint: "top-headlines",
          },
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          activeProviderId: "provider_1",
          destinationId: "destination_1",
          locale: "en",
          mode: "REVIEW_REQUIRED",
          name: "NewsAPI everything stream",
          providerFilters: {
            domains: "",
            endpoint: "everything",
            q: "",
          },
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });

    expect(prisma.publishingStream.upsert).not.toHaveBeenCalled();
  });

  it("moves provider-filter allowlists into the stream allowlist columns", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          providerKey: "newsapi",
          requestDefaultsJson: {
            category: "general",
            endpoint: "top-headlines",
          },
        }),
      },
    });

    await saveStreamRecord(
      {
        activeProviderId: "provider_1",
        destinationId: "destination_1",
        locale: "en",
        mode: "REVIEW_REQUIRED",
        name: "NewsAPI top headlines stream",
        providerFilters: {
          category: "sports",
          countryAllowlistJson: "us",
          endpoint: "top-headlines",
        },
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          countryAllowlistJson: ["us"],
          settingsJson: {
            providerFilters: {
              category: "sports",
              endpoint: "top-headlines",
            },
            socialPost: {
              linkPlacement: "RANDOM",
              linkUrl: null,
            },
          },
        }),
      }),
    );
  });

  it("stores social post link settings and allows schedule interval 0 to disable auto-runs", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub();

    await saveStreamRecord(
      {
        activeProviderId: "provider_1",
        destinationId: "destination_1",
        locale: "en",
        mode: "REVIEW_REQUIRED",
        name: "Website stream with social link",
        postLinkPlacement: "END",
        postLinkUrl: "/go/deeper",
        scheduleIntervalMinutes: "0",
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          scheduleExpression: null,
          scheduleIntervalMinutes: 0,
          settingsJson: {
            providerFilters: {},
            socialPost: {
              linkPlacement: "END",
              linkUrl: "https://example.com/go/deeper",
            },
          },
        }),
      }),
    );
  });

  it("deletes streams and records the audit event payload", async () => {
    const analytics = await import("@/lib/analytics");
    const { deleteStreamRecord } = await import("./index");
    const prisma = createPrismaStub();

    const record = await deleteStreamRecord(
      "stream_1",
      {
        actorId: "admin_1",
      },
      prisma,
    );

    expect(prisma.publishingStream.findUnique).toHaveBeenCalledWith({
      select: {
        activeProviderId: true,
        destinationId: true,
        id: true,
        name: true,
        slug: true,
      },
      where: {
        id: "stream_1",
      },
    });
    expect(prisma.publishingStream.delete).toHaveBeenCalledWith({
      where: {
        id: "stream_1",
      },
    });
    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      {
        action: "STREAM_DELETED",
        actorId: "admin_1",
        entityId: "stream_1",
        entityType: "publishing_stream",
        payloadJson: {
          destinationId: "destination_1",
          providerConfigId: "provider_1",
          slug: "website-via-mediastack",
        },
      },
      prisma,
    );
    expect(record).toMatchObject({
      id: "stream_1",
      slug: "website-via-mediastack",
    });
  });

  it("rejects deleting a stream that does not exist", async () => {
    const { deleteStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      publishingStream: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      deleteStreamRecord(
        "missing_stream",
        {
          actorId: "admin_1",
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
      statusCode: 404,
    });
    expect(prisma.publishingStream.delete).not.toHaveBeenCalled();
  });
});
