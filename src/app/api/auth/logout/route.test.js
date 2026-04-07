import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("auth logout api route", () => {
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

  it("logs out the authenticated session token", async () => {
    const createLogoutResponse = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      }),
    );

    vi.doMock("@/lib/auth/api", () => ({
      createLogoutResponse,
      requireAdminApiSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { POST } = await import("./route");
    const response = await POST({
      cookies: {
        get: vi.fn().mockReturnValue({
          value: "session_token_1",
        }),
      },
    });

    expect(response.status).toBe(200);
    expect(createLogoutResponse).toHaveBeenCalledWith("session_token_1");
  });
});
