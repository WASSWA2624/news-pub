import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("jobs api route", () => {
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

  it("runs one stream with an explicit bounded fetch window", async () => {
    const runMultipleStreamFetches = vi.fn();
    const runScheduledStreams = vi.fn();
    const runStreamFetch = vi.fn().mockResolvedValue({
      id: "fetch_run_1",
      status: "SUCCEEDED",
    });

    vi.doMock("@/features/analytics", () => ({
      getAdminJobLogsSnapshot: vi.fn(),
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      runMultipleStreamFetches,
      runScheduledStreams,
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/jobs", {
        body: JSON.stringify({
          fetchWindow: {
            end: "2026-04-07T12:00:00.000Z",
            start: "2026-04-07T00:00:00.000Z",
            writeCheckpointOnSuccess: false,
          },
          stream_id: "stream_1",
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
        id: "fetch_run_1",
        status: "SUCCEEDED",
      },
      success: true,
    });
    expect(runStreamFetch).toHaveBeenCalledWith("stream_1", {
      actor_id: "admin_1",
      fetchWindow: {
        end: "2026-04-07T12:00:00.000Z",
        start: "2026-04-07T00:00:00.000Z",
      },
      trigger_type: "manual",
      writeCheckpointOnSuccess: false,
    });
    expect(runMultipleStreamFetches).not.toHaveBeenCalled();
    expect(runScheduledStreams).not.toHaveBeenCalled();
  });

  it("runs a compatible multi-stream batch through the shared-fetch workflow", async () => {
    const runMultipleStreamFetches = vi.fn().mockResolvedValue({
      requestedStreamCount: 2,
      upstreamRequestCount: 1,
    });
    const runScheduledStreams = vi.fn();
    const runStreamFetch = vi.fn();

    vi.doMock("@/features/analytics", () => ({
      getAdminJobLogsSnapshot: vi.fn(),
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      runMultipleStreamFetches,
      runScheduledStreams,
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/jobs", {
        body: JSON.stringify({
          streamIds: ["stream_1", "stream_2"],
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
        requestedStreamCount: 2,
        upstreamRequestCount: 1,
      },
      success: true,
    });
    expect(runMultipleStreamFetches).toHaveBeenCalledWith(["stream_1", "stream_2"], {
      actor_id: "admin_1",
      fetchWindow: null,
      trigger_type: "manual",
      writeCheckpointOnSuccess: null,
    });
    expect(runStreamFetch).not.toHaveBeenCalled();
    expect(runScheduledStreams).not.toHaveBeenCalled();
  });

  it("falls back to the scheduler pass when no stream ids are supplied", async () => {
    const runMultipleStreamFetches = vi.fn();
    const runScheduledStreams = vi.fn().mockResolvedValue({
      executedStreamCount: 3,
    });
    const runStreamFetch = vi.fn();

    vi.doMock("@/features/analytics", () => ({
      getAdminJobLogsSnapshot: vi.fn(),
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      runMultipleStreamFetches,
      runScheduledStreams,
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/jobs", {
        body: JSON.stringify({
          runDueStreams: true,
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
        executedStreamCount: 3,
      },
      success: true,
    });
    expect(runScheduledStreams).toHaveBeenCalledWith();
    expect(runMultipleStreamFetches).not.toHaveBeenCalled();
    expect(runStreamFetch).not.toHaveBeenCalled();
  });
});
