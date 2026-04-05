# 16 Scheduled Publishing Worker

Source sections: 3.3, 35.3, 42.
Atomic aspect: schedule execution only.
Prerequisite: step 15.

## Goal

Publish scheduled posts exactly once at the correct time.

## Implement

1. Build the internal job runner and queue worker for scheduled publishing.
2. Poll or trigger against `scheduledPublishAt`.
3. Add idempotency so the same scheduled post cannot publish twice.
4. Add retry handling and failure logging.
5. Trigger cache revalidation after successful publish.
6. Write audit events for scheduled publish execution.

## Required Outputs

- scheduled publish worker
- retry and idempotency logic
- publish-time revalidation hook

## Verify

- a scheduled post publishes once within the accepted tolerance window
- failed runs are logged and retry safely
- duplicate publishes do not occur

## Exit Criteria

- scheduling is production-safe and deterministic
