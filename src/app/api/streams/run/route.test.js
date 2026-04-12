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
    const runMultipleStreamFetches = vi.fn();
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
      runMultipleStreamFetches,
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/streams/run", {
        body: JSON.stringify({
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
        run: {
          id: "fetch_run_1",
          status: "SUCCEEDED",
        },
      },
      success: true,
    });
    expect(runStreamFetch).toHaveBeenCalledWith("stream_1", {
      actor_id: "admin_1",
      fetchWindow: null,
      trigger_type: "manual",
      writeCheckpointOnSuccess: null,
    });
  });

  it("starts a manual shared-fetch batch when several stream ids are requested together", async () => {
    const runMultipleStreamFetches = vi.fn().mockResolvedValue({
      requestedStreamCount: 2,
      results: [
        {
          run: {
            id: "fetch_run_1",
            status: "SUCCEEDED",
            stream_id: "stream_1",
          },
          stream: {
            id: "stream_1",
          },
        },
        {
          run: {
            id: "fetch_run_2",
            status: "SUCCEEDED",
            stream_id: "stream_2",
          },
          stream: {
            id: "stream_2",
          },
        },
      ],
      upstreamRequestCount: 1,
    });
    const runStreamFetch = vi.fn();

    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/news/workflows", () => ({
      runMultipleStreamFetches,
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/streams/run", {
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
        batch: {
          requestedStreamCount: 2,
          results: [
            {
              run: {
                id: "fetch_run_1",
                status: "SUCCEEDED",
                stream_id: "stream_1",
              },
              stream: {
                id: "stream_1",
              },
            },
            {
              run: {
                id: "fetch_run_2",
                status: "SUCCEEDED",
                stream_id: "stream_2",
              },
              stream: {
                id: "stream_2",
              },
            },
          ],
          upstreamRequestCount: 1,
        },
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
  });

  it("forwards explicit manual fetch windows and checkpoint-write intent to the workflow layer", async () => {
    const runMultipleStreamFetches = vi.fn();
    const runStreamFetch = vi.fn().mockResolvedValue({
      id: "fetch_run_2",
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
      runMultipleStreamFetches,
      runStreamFetch,
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/streams/run", {
        body: JSON.stringify({
          fetchWindow: {
            end: "2026-04-08T12:00:00.000Z",
            start: "2026-04-07T12:00:00.000Z",
            writeCheckpointOnSuccess: true,
          },
          stream_id: "stream_1",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );

    expect(response.status).toBe(200);
    expect(runStreamFetch).toHaveBeenCalledWith("stream_1", {
      actor_id: "admin_1",
      fetchWindow: {
        end: "2026-04-08T12:00:00.000Z",
        start: "2026-04-07T12:00:00.000Z",
      },
      trigger_type: "manual",
      writeCheckpointOnSuccess: true,
    });
    expect(runMultipleStreamFetches).not.toHaveBeenCalled();
  });
});
