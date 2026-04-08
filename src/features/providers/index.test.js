import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createPrismaStub(overrides = {}) {
  return {
    newsProviderConfig: {
      updateMany: vi.fn().mockResolvedValue({
        count: 0,
      }),
      upsert: vi.fn().mockResolvedValue({
        id: "provider_1",
        isDefault: true,
        isEnabled: true,
        label: "News API",
        providerKey: "newsapi",
      }),
      ...(overrides.newsProviderConfig || {}),
    },
  };
}

describe("provider feature validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
    }));
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        MEDIASTACK_API_KEY: "mediastack-key",
        NEWSDATA_API_KEY: "newsdata-key",
        NEWSAPI_API_KEY: "newsapi-key",
      }),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("sanitizes and saves provider defaults before writing the record", async () => {
    const analytics = await import("@/lib/analytics");
    const { saveProviderRecord } = await import("./index");
    const prisma = createPrismaStub();

    const record = await saveProviderRecord(
      {
        baseUrl: " https://newsapi.org/v2/top-headlines ",
        description: " Official News API config ",
        isDefault: true,
        label: " News API ",
        providerKey: "newsapi",
        requestDefaultsJson: {
          category: "technology",
          endpoint: "top-headlines",
          q: "",
        },
      },
      {
        actorId: "admin_1",
      },
      prisma,
    );

    expect(prisma.newsProviderConfig.upsert).toHaveBeenCalledWith({
      create: {
        baseUrl: "https://newsapi.org/v2/top-headlines",
        description: "Official News API config",
        isDefault: true,
        isEnabled: true,
        isSelectable: true,
        label: "News API",
        providerKey: "newsapi",
        requestDefaultsJson: {
          category: "technology",
          endpoint: "top-headlines",
        },
      },
      update: {
        baseUrl: "https://newsapi.org/v2/top-headlines",
        description: "Official News API config",
        isDefault: true,
        isEnabled: true,
        isSelectable: true,
        label: "News API",
        requestDefaultsJson: {
          category: "technology",
          endpoint: "top-headlines",
        },
      },
      where: {
        providerKey: "newsapi",
      },
    });
    expect(prisma.newsProviderConfig.updateMany).toHaveBeenCalledWith({
      data: {
        isDefault: false,
      },
      where: {
        id: {
          not: "provider_1",
        },
      },
    });
    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      {
        action: "PROVIDER_CONFIG_SAVED",
        actorId: "admin_1",
        entityId: "provider_1",
        entityType: "provider_config",
        payloadJson: {
          isDefault: true,
          isEnabled: true,
          providerKey: "newsapi",
        },
      },
      prisma,
    );
    expect(record).toMatchObject({
      id: "provider_1",
      providerKey: "newsapi",
    });
  });

  it('rejects invalid provider defaults before persisting the record', async () => {
    const { saveProviderRecord } = await import("./index");
    const prisma = createPrismaStub();

    await expect(
      saveProviderRecord(
        {
          label: "News API",
          providerKey: "newsapi",
          requestDefaultsJson: {
            endpoint: "everything",
          },
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "provider_validation_failed",
      statusCode: 400,
    });

    expect(prisma.newsProviderConfig.upsert).not.toHaveBeenCalled();
    expect(prisma.newsProviderConfig.updateMany).not.toHaveBeenCalled();
  });
});
