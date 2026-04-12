import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("seo api route", () => {
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

  it("returns the seo snapshot for an authorized admin", async () => {
    const getSeoManagementSnapshot = vi.fn().mockResolvedValue({
      defaults: {
        title_template: "%s | NewsPub",
      },
    });

    vi.doMock("@/features/seo", () => ({
      getSeoManagementSnapshot,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/seo"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        defaults: {
          title_template: "%s | NewsPub",
        },
      },
      success: true,
    });
  });
});
