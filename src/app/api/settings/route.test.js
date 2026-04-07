import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("settings api route", () => {
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

  it("returns the settings snapshot for an authorized admin", async () => {
    const getSettingsSnapshot = vi.fn().mockResolvedValue({
      scheduler: {
        defaultTimezone: "UTC",
      },
    });

    vi.doMock("@/features/settings", () => ({
      getSettingsSnapshot,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/settings"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        scheduler: {
          defaultTimezone: "UTC",
        },
      },
      success: true,
    });
  });
});
