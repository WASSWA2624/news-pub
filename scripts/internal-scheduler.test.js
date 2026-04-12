import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import scheduler from "./internal-scheduler.js";

const { startInternalScheduler } = scheduler;

const originalEnv = process.env;

describe("internal scheduler", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    process.env = {
      ...originalEnv,
      CRON_SECRET: "cron-secret",
      INTERNAL_SCHEDULER_ENABLED: "true",
      INTERNAL_SCHEDULER_INTERVAL_SECONDS: "60",
      INTERNAL_SCHEDULER_STARTUP_DELAY_SECONDS: "0",
      PORT: "3000",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it("runs a bootstrap scheduler request without waiting for the polling interval", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
    });
    const logger = {
      info: vi.fn(),
      warn: vi.fn(),
    };
    const handle = startInternalScheduler({
      fetchImpl,
      logger,
    });

    await vi.runOnlyPendingTimersAsync();

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(fetchImpl).toHaveBeenCalledWith(
      "http://127.0.0.1:3000/api/jobs/scheduled-publishing",
      expect.objectContaining({
        headers: expect.objectContaining({
          "x-cron-secret": "cron-secret",
        }),
        method: "POST",
      }),
    );

    handle.stop();
  });

  it("stays disabled when the scheduler flag is off", () => {
    process.env.INTERNAL_SCHEDULER_ENABLED = "false";

    const fetchImpl = vi.fn();
    const handle = startInternalScheduler({
      fetchImpl,
      logger: {
        info: vi.fn(),
        warn: vi.fn(),
      },
    });

    expect(handle).toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
