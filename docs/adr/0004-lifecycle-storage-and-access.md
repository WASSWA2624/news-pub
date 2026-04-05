# ADR 0004: Lifecycle Storage And Access

- Status: Accepted
- Date: 2026-04-02
- Source sections: 11.4, 12, 22, 28, 35, 44, 46

## Context

Release 1 needs locale-ready persistence, flexible render storage, a clean editorial workflow, swappable media storage, and a minimal access model that protects admin surfaces without adding visitor accounts.

## Decision

The following lifecycle, storage, and access rules are fixed:

- `status` and `editorialStage` are separate persisted fields and must remain independent.
- Content persistence remains locale-aware even though Release 1 stores only `en` content.
- Each post locale stores Markdown, HTML, and structured JSON render artifacts.
- Media storage uses a driver abstraction.
- Release 1 starts with local `public/uploads` storage and must remain switchable to an S3-compatible backend through configuration.
- Release 1 admin authentication requires email and password.
- Public visitors do not need accounts to read published content.
- Release 1 allows guest comments, subject to moderation and security controls.

Editorial workflow policy:

- Generated content starts as draft content.
- A draft may move through editorial checkpoints without changing publish status.
- Scheduling requires explicit admin confirmation and does not bypass manual editorial control.
- Manual publish clears any pending future schedule.

## Consequences

- The Prisma schema in later steps must model separate publication status and editorial stage fields.
- Locale-aware translation and render-artifact tables remain mandatory even in English-only Release 1.
- The media layer must expose an interface that keeps local and object storage interchangeable.
- Authentication and comment-moderation work in later steps must preserve the admin-only auth and guest-comment split.
