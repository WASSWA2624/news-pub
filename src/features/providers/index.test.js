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
        is_default: true,
        is_enabled: true,
        label: "News API",
        provider_key: "newsapi",
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
        base_url: " https://newsapi.org/v2/top-headlines ",
        description: " Official News API config ",
        is_default: true,
        label: " News API ",
        provider_key: "newsapi",
        request_defaults_json: {
          category: "technology",
          endpoint: "top-headlines",
          q: "",
        },
      },
      {
        actor_id: "admin_1",
      },
      prisma,
    );

    expect(prisma.newsProviderConfig.upsert).toHaveBeenCalledWith({
      create: {
        base_url: "https://newsapi.org/v2/top-headlines",
        description: "Official News API config",
        is_default: true,
        is_enabled: true,
        is_selectable: true,
        label: "News API",
        provider_key: "newsapi",
        request_defaults_json: {
          category: "technology",
          endpoint: "top-headlines",
        },
      },
      update: {
        base_url: "https://newsapi.org/v2/top-headlines",
        description: "Official News API config",
        is_default: true,
        is_enabled: true,
        is_selectable: true,
        label: "News API",
        request_defaults_json: {
          category: "technology",
          endpoint: "top-headlines",
        },
      },
      where: {
        provider_key: "newsapi",
      },
    });
    expect(prisma.newsProviderConfig.updateMany).toHaveBeenCalledWith({
      data: {
        is_default: false,
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
        actor_id: "admin_1",
        entity_id: "provider_1",
        entity_type: "provider_config",
        payload_json: {
          is_default: true,
          is_enabled: true,
          provider_key: "newsapi",
        },
      },
      prisma,
    );
    expect(record).toMatchObject({
      id: "provider_1",
      provider_key: "newsapi",
    });
  });

  it('rejects invalid provider defaults before persisting the record', async () => {
    const { saveProviderRecord } = await import("./index");
    const prisma = createPrismaStub();

    await expect(
      saveProviderRecord(
        {
          label: "News API",
          provider_key: "newsapi",
          request_defaults_json: {
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
