/**
 * First-class NewsPub worker runtime wrapper around the durable scheduler
 * primitives in workflows.js.
 *
 * The workflow layer continues to own queue claiming, heartbeats, retry
 * scheduling, orphan recovery, and idempotent execution. This runtime layer
 * adds cycle-level concurrency control, deterministic startup metadata, and a
 * stable worker-facing summary for cron and admin triggers.
 */

import { runScheduledStreams } from "@/lib/news/workflows";

const WORKER_PHASES = Object.freeze([
  "startup_recovery",
  "reconcile_stale_fetch_runs",
  "reconcile_stale_publish_attempts",
  "recover_stranded_stream_executions",
  "recover_stranded_auto_publish_attempts",
  "enqueue_due_stream_fetch_runs",
  "retry_failed_publish_attempts",
  "drain_fetch_run_queue",
  "drain_publish_attempt_queue",
]);

let cycle_counter = 0;
let active_cycle = null;
let last_cycle = null;

function toDate(value, fallbackValue = new Date()) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  const parsedValue = new Date(value);

  return Number.isNaN(parsedValue.getTime()) ? fallbackValue : parsedValue;
}

function createCompletedCycleMetadata({
  coalesced_trigger_count = 0,
  completed_at,
  cycle_id,
  duration_ms,
  started_at,
  startup_recovery,
  trigger,
}) {
  return {
    coalesced_trigger_count,
    completed_at: completed_at.toISOString(),
    cycle_id,
    duration_ms,
    phases: WORKER_PHASES,
    started_at: started_at.toISOString(),
    startup_recovery,
    status: "completed",
    trigger,
  };
}

function createReusedCycleMetadata(activeCycle, trigger) {
  return {
    coalesced_trigger_count: activeCycle.coalesced_trigger_count,
    completed_at: null,
    cycle_id: activeCycle.cycle_id,
    duration_ms: null,
    phases: WORKER_PHASES,
    reused_existing_cycle: true,
    started_at: activeCycle.started_at.toISOString(),
    startup_recovery: activeCycle.startup_recovery,
    status: "running",
    trigger,
  };
}

export function resetNewsWorkerRuntimeState() {
  cycle_counter = 0;
  active_cycle = null;
  last_cycle = null;
}

export function getNewsWorkerRuntimeStatus() {
  return {
    active_cycle: active_cycle
      ? {
          cycle_id: active_cycle.cycle_id,
          started_at: active_cycle.started_at.toISOString(),
          startup_recovery: active_cycle.startup_recovery,
          status: "running",
          trigger: active_cycle.trigger,
        }
      : null,
    last_cycle,
    phases: WORKER_PHASES,
    worker_ready: true,
    worker_status: active_cycle ? "running" : "idle",
  };
}

/**
 * Runs one NewsPub worker cycle with overlap-safe trigger coalescing.
 */
export async function runNewsWorkerCycle(
  { now = new Date(), prisma, trigger = "manual" } = {},
) {
  if (active_cycle) {
    const reused_cycle = active_cycle;

    reused_cycle.coalesced_trigger_count += 1;

    const summary = await reused_cycle.promise;

    return {
      ...summary,
      cycle: createReusedCycleMetadata(reused_cycle, trigger),
    };
  }

  const started_at = toDate(now);
  const cycle_id = ++cycle_counter;
  const startup_recovery = last_cycle === null;
  const cycle_state = {
    coalesced_trigger_count: 0,
    cycle_id,
    promise: null,
    started_at,
    startup_recovery,
    trigger,
  };

  active_cycle = cycle_state;

  cycle_state.promise = (async () => {
    const summary = await runScheduledStreams(
      {
        now: started_at,
      },
      prisma,
    );
    const completed_at = new Date();
    const cycle = createCompletedCycleMetadata({
      coalesced_trigger_count: cycle_state.coalesced_trigger_count,
      completed_at,
      cycle_id,
      duration_ms: completed_at.getTime() - started_at.getTime(),
      started_at,
      startup_recovery,
      trigger,
    });
    const result = {
      ...summary,
      cycle,
    };

    last_cycle = result;

    return result;
  })();

  try {
    return await cycle_state.promise;
  } finally {
    active_cycle = null;
  }
}
