import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("stream run api route", () => {
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

  it("starts a manual stream run with the signed-in admin as the actor", async () => {
    const runStreamFetch = vi.fn().mockResolvedValue({
      id: "fetch_run_1",
      status: "SUCCEEDED",
    });

    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/streams/run", {
        body: JSON.stringify({
          streamId: "stream_1",
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
        run: {
          id: "fetch_run_1",
          status: "SUCCEEDED",
        },
      },
      success: true,
    });
    expect(runStreamFetch).toHaveBeenCalledWith("stream_1", {
      actorId: "admin_1",
      triggerType: "manual",
    });
  });
});
