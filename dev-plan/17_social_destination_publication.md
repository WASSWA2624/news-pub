# 17 Social Destination Publication

Source sections: 11, 15, 16, 18, 19, 22, 24.
Atomic aspect: Facebook and Instagram formatting and outbound publish behavior only.
Prerequisite: step 16.

## Goal

Implement NewsPub publishing to Facebook and Instagram with full attempt history and platform-aware formatting.

## Reuse First

- Reuse the shared canonical post layer, media pipeline, scheduled-worker pattern, and audit logging structure.
- Keep social publishing adapters behind a consistent `PublishAttempt` workflow instead of embedding platform logic in admin screens.

## Implement

1. Build destination formatters for Facebook and Instagram using the template system from section `16` together with the bounded optimization layer.
2. Create outbound publisher adapters for supported Facebook and Instagram destination kinds.
3. Persist every outbound action as a `PublishAttempt` with request, response, status, retry count, and remote identifier metadata.
4. Block or hold social publishing when the destination is disconnected, missing required scopes, fails platform-specific validation, or trips policy and guardrail checks.
5. Add manual retry, optimization preview, and history visibility in the admin workspace.
6. Keep platform-specific quirks, rate limiting, duplicate cooldowns, hashtag caps, and safety checks in the integration layer only.

## Required Outputs

- social formatter modules
- Facebook and Instagram publish adapters
- publish-attempt persistence flow
- social publish tests and admin history views

## Verify

- no social publish attempt starts without a connected destination
- every social publish produces a persisted `PublishAttempt`
- retrying a failed attempt does not duplicate already-succeeded publications
- platform errors and policy blocks appear in admin logs with actionable detail

## Exit Criteria

- NewsPub can publish canonical stories to Facebook and Instagram through a durable attempt workflow
