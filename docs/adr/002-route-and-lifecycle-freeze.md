# ADR 002: Route And Lifecycle Freeze

- Status: Accepted
- Date: 2026-04-05

## Context

NewsPub needs a stable public information architecture, stable admin control plane, and clear editorial lifecycle rules before feature-level refinements continue.

## Decision

- Freeze the public route families to the locale-prefixed NewsPub map in `app-write-up.md`.
- Freeze the admin route families to the non-locale control-plane map in `app-write-up.md`.
- Keep `AUTO_PUBLISH` and `REVIEW_REQUIRED` as the only Release 1 stream modes.
- Keep `PostStatus` and `EditorialStage` as separate concepts:
  - `PostStatus` controls publication and inventory state.
  - `EditorialStage` tracks editorial readiness.

## Consequences

- Public and admin navigation remain stable for feature work, testing, and release verification.
- Editorial review can advance independently from publication state.
- Stream automation remains explicit and easy to reason about in code and UI.

