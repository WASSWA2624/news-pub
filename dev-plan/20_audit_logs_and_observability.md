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

1. Emit `AuditEvent` records for provider fetch starts, successes, failures, shared-fetch group planning, checkpoint updates, duplicate decisions, queue transitions, publish attempts, retries, destination connection errors, and optional AI skip or fallback outcomes.
2. Build job and log views for stream runs, publish attempts, failure summaries, shared-fetch execution mode or window details, and AI skip or fallback visibility.
3. Add filters for provider, stream, destination, status, and time window.
4. Keep redactable secrets and raw tokens out of log payloads.
5. Surface connection health, recent failures, AI runtime visibility, and warning or error severity in admin-facing summaries.

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
- shared upstream groups expose their execution mode, group id, partition reasons, and normalized fetch window in persisted fetch-run details
- AI skip and fallback audit events include machine-readable reason details without exposing secrets
- jobs, dashboard, post editor, and settings surfaces expose the same warning-level AI observability story consistently

## Exit Criteria

- NewsPub has a trustworthy operational timeline for debugging and support
