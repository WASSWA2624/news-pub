# NewsPub

`news-pub` is a specification-first project for building a reuse-first news ingestion, review, scheduling, and publishing platform.

The app is designed to let an authenticated admin configure providers, destinations, streams, templates, and schedules, fetch news from supported external APIs, filter it locally, and publish qualifying stories to the website, Facebook, and Instagram.

## Current Repo State

The source-of-truth planning documents now target the NewsPub product.

The most important files are:

- [`app-write-up.md`](./app-write-up.md): the single source of truth for the NewsPub product and architecture
- [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md): the ordered implementation plan

Important note:

- the current application codebase and some legacy docs still reflect the pre-NewsPub product and should be treated as historical until the implementation is rebuilt against the new plan
- [`docs/architecture-summary.md`](./docs/architecture-summary.md) and the existing evidence pack are not yet regenerated for NewsPub

## Release 1 Scope

Release 1 defines a production-ready app with:

- Next.js App Router using JavaScript
- Prisma with MySQL or MariaDB persistence
- styled-components for styling
- Redux Toolkit for admin-side client state
- Zod for validation
- locale-prefixed public routes with `en` as the default active locale
- admin authentication with RBAC
- env-based credential resolution for `mediastack`, `newsdata`, and `newsapi`
- website, Facebook, and Instagram publishing
- stream-based scheduling, filtering, deduplication, retries, and auditability
- SEO metadata, sitemap, robots, search, analytics, and operational reporting

Release 1 is not an AI content-generation product.

## Source Of Truth Rules

All implementation decisions must follow [`app-write-up.md`](./app-write-up.md).

- If an implementation artifact conflicts with the write-up, the write-up wins.
- The dev plan must stay synchronized with the write-up.
- Legacy code or documents from the retired product do not override the new write-up.

## How To Use The Dev Plan

Follow the files in [`dev-plan`](./dev-plan) in exact numeric order.

1. Start with [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md).
2. Execute each step in sequence.
3. Do not skip verification criteria.
4. Stop and fix any failed step before moving to the next one.
5. Capture evidence for files changed, commands run, automated checks, and manual verification notes.

Implementation is complete only when step 24 proves full traceability to the current `app-write-up.md`.

## Repository Layout

```text
.
|-- app-write-up.md
|-- README.md
`-- dev-plan/
    |-- 00_plan_index.md
    |-- 01_architecture_decisions.md
    |-- ...
    `-- 24_release_traceability_and_cutover.md
```

## Release Evidence

Historical evidence is stored under [`docs/evidence`](./docs/evidence), but it belongs to the older product shape and must be regenerated once NewsPub implementation work is complete.
