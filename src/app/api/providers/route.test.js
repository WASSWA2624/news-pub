import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("providers api route", () => {
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

  it("saves providers with the current admin id", async () => {
    const saveProviderRecord = vi.fn().mockResolvedValue({
      id: "provider_1",
      label: "News API",
    });

    vi.doMock("@/features/providers", () => ({
      getProviderManagementSnapshot: vi.fn(),
      saveProviderRecord,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://example.com/api/providers", {
        body: JSON.stringify({
          label: "News API",
          provider_key: "newsapi",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        id: "provider_1",
        label: "News API",
      },
      success: true,
    });
    expect(saveProviderRecord).toHaveBeenCalledWith(
      {
        label: "News API",
        provider_key: "newsapi",
      },
      {
        actor_id: "admin_1",
      },
    );
  });
});
