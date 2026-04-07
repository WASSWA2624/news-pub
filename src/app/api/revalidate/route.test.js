import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("revalidate api route", () => {
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

  it("revalidates the requested paths for an authorized admin", async () => {
    const revalidatePaths = vi.fn().mockResolvedValue(["/news", "/news/story"]);

    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/revalidation", () => ({
      revalidatePaths,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/revalidate", {
        body: JSON.stringify({
          path: "/news",
          paths: ["/news/story"],
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        paths: ["/news", "/news/story"],
      },
      success: true,
    });
    expect(revalidatePaths).toHaveBeenCalledWith(["/news", "/news/story"]);
  });
});
