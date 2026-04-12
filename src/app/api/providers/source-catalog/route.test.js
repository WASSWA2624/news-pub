import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("provider source catalog api route", () => {
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

  it("loads source catalog options for authorized provider or stream admins", async () => {
    const fetchProviderSourceCatalog = vi.fn().mockResolvedValue({
      options: [
        {
          label: "TechCrunch",
          value: "techcrunch",
        },
      ],
      supported: true,
    });

    vi.doMock("@/lib/auth/api", () => ({
      createAdminAuthorizationFailureResponse: vi.fn(),
      requireAdminApiSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/auth/rbac", () => ({
      ADMIN_PERMISSIONS: {
        MANAGE_PROVIDERS: "MANAGE_PROVIDERS",
        MANAGE_STREAMS: "MANAGE_STREAMS",
      },
      hasAdminPermission: vi.fn().mockReturnValue(true),
    }));
    vi.doMock("@/lib/news/providers", () => ({
      fetchProviderSourceCatalog,
    }));

    const { GET } = await import("./route");
    const values = encodeURIComponent(
      JSON.stringify({
        category: "technology",
        endpoint: "top-headlines",
      }),
    );
    const response = await GET(
      new Request(
        `https://example.com/api/providers/source-catalog?provider_key=newsapi&scope=stream&query=tech&values=${values}`,
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toMatchObject({
      data: {
        options: [
          {
            label: "TechCrunch",
            value: "techcrunch",
          },
        ],
        sourceCatalogSupport: {
          available: true,
          provider_key: "newsapi",
        },
        supported: true,
      },
      success: true,
    });
    expect(fetchProviderSourceCatalog).toHaveBeenCalledWith(
      expect.objectContaining({
        provider_key: "newsapi",
        query: "tech",
        requestValues: expect.objectContaining({
          category: "technology",
          endpoint: "top-headlines",
        }),
      }),
    );
  });
});
