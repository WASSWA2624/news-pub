import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("auth login api route", () => {
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

  it("passes the validated credentials and user agent to the auth service", async () => {
    const createLoginResponse = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ success: true }), {
        headers: {
          "content-type": "application/json",
        },
        status: 200,
      }),
    );

    vi.doMock("@/lib/auth/api", () => ({
      createLoginResponse,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/auth/login", {
        body: JSON.stringify({
          email: "admin@example.com",
          password: "strong-password",
        }),
        headers: {
          "content-type": "application/json",
          "user-agent": "Vitest Browser",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(createLoginResponse).toHaveBeenCalledWith({
      email: "admin@example.com",
      password: "strong-password",
      user_agent: "Vitest Browser",
    });
  });
});
