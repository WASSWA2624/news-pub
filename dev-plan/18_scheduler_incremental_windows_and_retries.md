# 18 Scheduler Incremental Windows And Retries

Source sections: 7, 12, 13, 14, 18, 19, 21, 22.
Atomic aspect: scheduled execution, incremental checkpoints, and retry handling only.
Prerequisite: step 17.

## Goal

Automate stream execution with safe checkpoints, idempotent workers, and visible retry behavior.

## Reuse First

- Reuse the current scheduled-worker, cron-endpoint, and audit-event patterns.
- Extend the worker system to streams and publish attempts instead of replacing it with a second job runner.

## Implement

1. Schedule enabled streams according to their configured timezone and cadence.
2. Add manual run-now execution without bypassing the same worker path.
3. Read checkpoints before execution and update them only after a successful fetch run.
4. Generate stable execution keys so retries remain idempotent.
5. Implement retry and backoff rules for publish attempts and transient provider failures.
6. Support normalized explicit fetch windows for manual, batched, retry, and diagnostic runs without advancing checkpoints unless the caller opts in.
7. Allow scheduled and manual batches to share one upstream provider request per compatible group while still finalizing checkpoints independently per stream.
8. Persist worker summaries, retry outcomes, pause states, and shared-fetch execution details in admin-visible logs and dashboard or jobs summaries.
9. Keep hourly as the default schedule when a stream has no explicit cadence.
10. Treat optional AI outages, missing credentials, timeouts, and invalid structured output as non-blocking optimization outcomes so healthy stream runs continue with `SKIPPED` or `FALLBACK` states instead of entering avoidable retry loops.
11. Keep manual single-stream and batch-run controls aligned on the explicit last-24-hours-to-now default window and optional checkpoint-write override.
12. Ensure Meta post-interval guardrails are still enforced during scheduled publishes and retries.

## Required Outputs

- worker services
- cron or scheduled APIs
- checkpoint update flow
- retry tests and worker summaries

## Verify

- due streams run only when enabled and due
- checkpoints are not advanced on failed runs
- explicit bounded windows do not advance checkpoints unless requested explicitly
- grouped executions reuse upstream provider calls only when the compatibility rules stay safe
- retries follow configured limits and remain visible in logs, dashboard metrics, and jobs summaries
- repeated executions do not republish the same successful attempt
- optional AI degradation does not turn an otherwise valid stream execution into a failed scheduled run when deterministic handling remains available
- scheduled publishes and retries do not bypass Meta pacing intervals

## Exit Criteria

- NewsPub can execute streams automatically and recover safely from transient failures
