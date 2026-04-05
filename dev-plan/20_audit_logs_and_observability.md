# 20 Audit Logs And Observability

Source sections: 10, 12, 18, 19, 21, 22, 24.
Atomic aspect: operational logs, timelines, and observability only.
Prerequisite: step 19.

## Goal

Expose the fetch, filter, publish, retry, and failure timeline that operators need to run NewsPub safely.

## Reuse First

- Reuse the current `AuditEvent` pattern, jobs screen shape, and structured error handling.
- Keep observability data append-only and queryable instead of scattering ad hoc logs across feature modules.

## Implement

1. Emit `AuditEvent` records for provider fetch starts, successes, failures, checkpoint updates, duplicate decisions, queue transitions, publish attempts, retries, and destination connection errors.
2. Build job and log views for stream runs, publish attempts, and failure summaries.
3. Add filters for provider, stream, destination, status, and time window.
4. Keep redactable secrets and raw tokens out of log payloads.
5. Surface connection health and recent failures in admin-facing summaries.

## Required Outputs

- audit-event emitters
- jobs and observability queries
- admin log screens or panels
- tests for key audit-event payloads

## Verify

- every major operational transition emits an audit event
- admin users can inspect recent runs, failures, and retry outcomes
- secret values are redacted from observable payloads
- connection and run health can be derived from persisted observability data

## Exit Criteria

- NewsPub has a trustworthy operational timeline for debugging and support
