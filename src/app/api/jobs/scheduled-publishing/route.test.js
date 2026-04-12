import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("scheduled publishing job api route", () => {
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

  it("runs scheduled streams when the cron secret is valid", async () => {
    const runNewsWorkerCycle = vi.fn().mockResolvedValue({
      executedStreamCount: 2,
    });

    vi.doMock("@/lib/auth/internal", () => ({
      hasRequestSecret: vi.fn().mockReturnValue(true),
    }));
    vi.doMock("@/lib/news/worker-runtime", () => ({
      runNewsWorkerCycle,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn(),
    }));

    const { POST } = await import("./route");
    const response = await POST(new Request("https://example.com/api/jobs/scheduled-publishing"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        executedStreamCount: 2,
      },
      success: true,
    });
    expect(runNewsWorkerCycle).toHaveBeenCalledWith({
      trigger: "cron",
    });
  });
});
