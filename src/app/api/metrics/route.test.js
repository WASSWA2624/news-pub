import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("metrics api route", () => {
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

  it("returns the dashboard snapshot for an authorized admin", async () => {
    const getAdminDashboardSnapshot = vi.fn().mockResolvedValue({
      summary: {
        postCount: 12,
      },
    });

    vi.doMock("@/features/analytics", () => ({
      getAdminDashboardSnapshot,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/metrics"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        summary: {
          postCount: 12,
        },
      },
      success: true,
    });
    expect(getAdminDashboardSnapshot).toHaveBeenCalledWith({
      id: "admin_1",
    });
  });
});
