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
6. Persist worker summaries, retry outcomes, and pause states in admin-visible logs.
7. Keep hourly as the default schedule when a stream has no explicit cadence.
8. Treat optional AI outages, missing credentials, timeouts, and invalid structured output as non-blocking optimization outcomes so healthy stream runs continue with `SKIPPED` or `FALLBACK` states instead of entering avoidable retry loops.

## Required Outputs

- worker services
- cron or scheduled APIs
- checkpoint update flow
- retry tests and worker summaries

## Verify

- due streams run only when enabled and due
- checkpoints are not advanced on failed runs
- retries follow configured limits and remain visible in logs
- repeated executions do not republish the same successful attempt
- optional AI degradation does not turn an otherwise valid stream execution into a failed scheduled run when deterministic handling remains available

## Exit Criteria

- NewsPub can execute streams automatically and recover safely from transient failures
