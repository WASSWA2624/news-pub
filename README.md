# Equip Blog

`equip-blog` is a specification-first project for building an AI-assisted medical equipment publishing platform.

The app is designed to let an authenticated admin enter an equipment name, generate a source-grounded draft, review it, then manually schedule or publish it to a public English website that uses a locale-ready architecture for future expansion.

## Current Repo State

This repository contains the Release 1 application implementation, the source-of-truth write-up, and the execution evidence gathered while building against the numbered dev plan.

The two most important files are:

- [`app-write-up.md`](./app-write-up.md): the single source of truth for the application
- [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md): the ordered execution plan used to build the app step by step
- [`docs/architecture-summary.md`](./docs/architecture-summary.md): the frozen Release 1 architecture summary and ADR entry point

## Release 1 Scope

Release 1 defines a production-ready app with:

# news-pub

- Next.js App Router using JavaScript
- Vercel AI SDK for draft generation
- Prisma and MySQL for persistence
- styled-components for styling
- Redux Toolkit for admin-side client state
- Zod for validation
- locale-prefixed public routes with `en` as the only active locale in Release 1
- admin authentication with RBAC
- guest comments with moderation
- manual publishing and scheduled publishing
- SEO metadata, sitemap, robots, and structured data
- search, related posts, analytics, and auditability

Future locale integration should be a small extension: add a new locale file, register it in the existing locale configuration, and reuse the existing locale-aware routing and persistence flow.

The concrete activation path is documented in [`docs/localization-workflow.md`](./docs/localization-workflow.md).

## Source Of Truth Rules

All implementation decisions must follow [`app-write-up.md`](./app-write-up.md).

- If any implementation artifact conflicts with the write-up, the write-up wins.
- Sections `1-39` and `42-46` are mandatory for Release 1 unless a specific item is explicitly marked optional.
- Sections `40-41` are future-phase only.
- Section `45` is informational only.

## How To Use The Dev Plan

Follow the files in [`dev-plan`](./dev-plan) in exact numeric order.

1. Start with [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md).
2. Execute each step in sequence.
3. Do not skip verification criteria.
4. Stop and fix any failed step before moving to the next one.
5. Capture evidence for files changed, commands run, automated checks, and manual verification notes.

Implementation is only complete when step 24 proves full traceability to all mandatory Release 1 requirements.

## Repository Layout

```text
.
|-- app-write-up.md
|-- README.md
`-- dev-plan/
    |-- 00_plan_index.md
    |-- 01_architecture_decisions.md
    |-- ...
    `-- 24_security_copyright_and_release_traceability.md
```

## Important Product Constraints

- The AI layer is not the factual source of truth; structured research is.
- Publishing must remain a manual editor action.
- Duplicate generation must be blocked until the admin explicitly chooses replace or cancel.
- Release 1 ships English-only content, but the locale architecture must stay ready for future locale files and configuration-driven expansion.
- Media usage, attribution, and copyright rules must be enforced.

## Release Evidence

Release evidence is stored under [`docs/evidence`](./docs/evidence), with the final Release 1 sign-off pack captured in the step 24 evidence set.
