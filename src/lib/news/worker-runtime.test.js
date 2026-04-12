import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

describe("news worker runtime", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("coalesces overlapping worker triggers onto one durable scheduler cycle", async () => {
    const runScheduledStreams = vi.fn(
      () =>
        new Promise((resolve) => {
          setTimeout(
            () =>
              resolve({
                dueStreamCount: 2,
                processedPublishAttempts: 1,
              }),
            5,
          );
        }),
    );

    vi.doMock("@/lib/news/workflows", () => ({
      runScheduledStreams,
    }));

    const { resetNewsWorkerRuntimeState, runNewsWorkerCycle } = await import("./worker-runtime");

    resetNewsWorkerRuntimeState();

    const [firstResult, secondResult] = await Promise.all([
      runNewsWorkerCycle({
        now: new Date("2026-04-12T10:00:00.000Z"),
        trigger: "cron",
      }),
      runNewsWorkerCycle({
        now: new Date("2026-04-12T10:00:01.000Z"),
        trigger: "admin",
      }),
    ]);

    expect(runScheduledStreams).toHaveBeenCalledTimes(1);
    expect(firstResult).toMatchObject({
      cycle: {
        cycle_id: 1,
        startup_recovery: true,
        trigger: "cron",
      },
      dueStreamCount: 2,
      processedPublishAttempts: 1,
    });
    expect(secondResult).toMatchObject({
      cycle: {
        cycle_id: 1,
        reused_existing_cycle: true,
        startup_recovery: true,
        trigger: "admin",
      },
      dueStreamCount: 2,
      processedPublishAttempts: 1,
    });
  });

  it("reports idle and last-cycle status snapshots for diagnostics", async () => {
    const runScheduledStreams = vi.fn().mockResolvedValue({
      dueStreamCount: 0,
      processedPublishAttempts: 0,
    });

    vi.doMock("@/lib/news/workflows", () => ({
      runScheduledStreams,
    }));

    const {
      getNewsWorkerRuntimeStatus,
      resetNewsWorkerRuntimeState,
      runNewsWorkerCycle,
    } = await import("./worker-runtime");

    resetNewsWorkerRuntimeState();

    expect(getNewsWorkerRuntimeStatus()).toMatchObject({
      active_cycle: null,
      worker_ready: true,
      worker_status: "idle",
    });

    await runNewsWorkerCycle({
      now: new Date("2026-04-12T10:00:00.000Z"),
      trigger: "cron",
    });

    expect(getNewsWorkerRuntimeStatus()).toMatchObject({
      active_cycle: null,
      last_cycle: {
        cycle: {
          cycle_id: 1,
          startup_recovery: true,
          trigger: "cron",
        },
      },
      worker_status: "idle",
    });
  });
});
