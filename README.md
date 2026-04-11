# NewsPub

`news-pub` is a specification-first project for building a reuse-first news ingestion, review, AI-assisted optimization, scheduling, and publishing platform.

Release 1 is designed to let an authenticated admin configure providers, destinations, streams, templates, safety guardrails, and schedules, fetch news from supported external APIs, filter it locally, optimize eligible stories with a bounded AI layer, and publish qualifying stories to the website, Facebook, and Instagram without treating AI health as a hidden prerequisite for the rest of the workflow. Compatible multi-stream runs may share one upstream provider request when NewsPub can widen that request safely and then fan the candidate pool back out into per-stream local filtering, deduplication, review, and publication.

## Current Status

The active application, Prisma schema, admin/public routes, and automated tests all target the NewsPub product.

The repo-truth documents are:

- [`README.md`](./README.md): operational overview, route map, verification commands, and repo layout
- [`app-write-up.md`](./app-write-up.md): the authoritative product, architecture, workflow, and acceptance contract
- [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md): the ordered 24-step implementation plan
- [`dev-plan/24_release_traceability_and_cutover.md`](./dev-plan/24_release_traceability_and_cutover.md): release-readiness, traceability, and cutover expectations
- `src/**/*.test.js`: executable verification for env parsing, routes, workflows, validation, AI optimization, publishing, and UI-facing snapshots

## Release 1 Scope

NewsPub Release 1 includes:

- Next.js App Router using JavaScript
- Prisma with MySQL or MariaDB persistence
- styled-components for styling
- Redux Toolkit for admin-side client state
- Zod for env, API, and workflow validation
- locale-prefixed public routes with `en` as the default active locale
- admin authentication with RBAC
- env-based credential resolution for `mediastack`, `newsdata`, and `newsapi`
- normalized fetch-window handling for scheduled, manual, batched, and diagnostic stream runs
- stream settings plus single-stream and batch-run controls that prefill the previous 24 hours through the next 30 minutes from now, explain the forward buffer, and show how each provider endpoint maps that normalized window upstream
- AI SDK-based optimization for eligible posts with deterministic cache reuse, policy checks, and non-blocking `SKIPPED` or `FALLBACK` outcomes when AI is disabled, misconfigured, or unhealthy
- provider-aware shared-fetch batching for compatible multi-stream execution requests
- website, Facebook, and Instagram publishing
- stream-based scheduling, filtering, deduplication, retries, and auditability
- SEO metadata, sitemap, robots, search, analytics, and operational reporting

Release 1 is not an open-ended AI content-generation product. AI is used only for bounded rewriting, SEO packaging, destination-specific formatting, and policy pre-checks. The app must preserve factual meaning, keep source attribution visible, validate structured output, and fall back safely when AI is unavailable. Skipped or fallback AI states must remain visible in review queues, post editor surfaces, job history, and audit logs.

## Runtime Guarantees

- compatible stream batches share provider calls only when provider key, endpoint shape, credential source, time-boundary semantics, and restrictive provider filters stay safe to widen; NewsPub then filters the shared candidate pool locally per stream
- explicit fetch windows override checkpoint windows for manual or diagnostic runs and do not advance checkpoints unless the caller explicitly opts in with `writeCheckpointOnSuccess`
- manual run surfaces show the normalized default window of the previous 24 hours through the next 30 minutes from now, together with endpoint-specific notes for direct, relative, or local-only provider time-boundary support
- new website streams default to `AUTO_PUBLISH`, while new Facebook and Instagram streams default to `REVIEW_REQUIRED`
- website streams process every locally eligible candidate from the fetched pool; `maxPostsPerRun` remains a social-batch bound instead of a website-publication cap
- publish diagnostics in jobs and post history flatten Meta pacing or guardrail blocks into one visible reason code and message

## Public And Admin Surfaces

Required public route families:

- `/`
- `/[locale]`
- `/[locale]/news`
- `/[locale]/news/[slug]`
- `/[locale]/category/[slug]`
- `/[locale]/search`
- `/[locale]/about`
- `/[locale]/privacy`
- `/[locale]/disclaimer`

Required admin route families:

- `/admin/login`
- `/admin`
- `/admin/providers`
- `/admin/destinations`
- `/admin/streams`
- `/admin/categories`
- `/admin/posts/new`
- `/admin/posts/review`
- `/admin/posts/published`
- `/admin/posts/[id]`
- `/admin/media`
- `/admin/templates`
- `/admin/jobs`
- `/admin/seo`
- `/admin/settings`

## Admin UX Standards

Release 1 admin forms share one interaction contract across provider, destination, stream, template, modal, and editorial screens.

- shared control sizing tokens keep primary buttons, secondary buttons, icon buttons, compact pills, and select triggers aligned across cards, tables, toolbars, and modal footers
- shared sticky side panels, split card headers, icon badges, and metadata pill rails must be reused by directory-style admin screens instead of recreated per route
- shared disclosure sections show a section title, summary, and blocking state even while collapsed, and auto-open when a section contains validation errors or missing required data
- shared validation summaries and field-level helper or error text keep problems close to the relevant section and field
- submit failures scroll and focus the first blocking field so keyboard-only editors can recover quickly
- modal editors keep header context stable, contain overscroll, and keep footer actions reachable during long edits
- dashboard, jobs, post-editor, and settings surfaces expose AI runtime health plus `SKIPPED` or `FALLBACK` reasons without treating optional AI issues as hard failures
- manual story creation, post editing, category editing, and media upload flows reuse the same disclosure, validation, and footer-action contract
- obsolete standalone admin screens and duplicate UI primitives should be removed once their shared-route replacements are live

## Source Of Truth Rules

All implementation decisions must follow [`app-write-up.md`](./app-write-up.md).

- If an implementation artifact conflicts with the write-up, the write-up wins.
- The dev plan must stay synchronized with the write-up.
- Legacy code and historical docs do not override the new NewsPub planning documents.

## How To Use The Dev Plan

Follow the files in [`dev-plan`](./dev-plan) in exact numeric order.

1. Start with [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md).
2. Execute each step in sequence.
3. Do not skip verification criteria.
4. Stop and fix any failed step before moving to the next one.
5. Capture evidence for files changed, commands run, automated checks, and manual verification notes.

Implementation is complete only when step 24 proves full traceability to the current [`app-write-up.md`](./app-write-up.md).

## Environment And Repo Hygiene

Copy [`.env.example`](./.env.example) to `.env.development.local` for local development, then replace the placeholder values before you run the app. Use `.env.production.local` only for production or cPanel values.

- `.env.development.local` and `.env.production.local` must stay untracked and must never be committed.
- Any credential that was previously committed or shared from this repo must be rotated before it is used again.
- `DATABASE_URL` must point to a reachable local MySQL or MariaDB database before you run migrations, seeding, or the live dev server.
- `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD` are local bootstrap credentials only and must be replaced before any shared, staging, or production deployment.
- Run `npm run repo:check` before opening a PR to catch tracked env files, obvious secrets, and lockfile drift.
- If you change `package.json`, update `package-lock.json` in the same change so `npm ci` keeps working from a fresh checkout.

## Verification

Run the close-out checks from the repo root in this order:

```bash
npm ci
npm run repo:check
npm run prisma:generate
npm run lint
npm test
npm run build
npm run prisma:validate
```

Use [`prisma/seed.js`](./prisma/seed.js) together with [`scripts/bootstrap-dev-db.js`](./scripts/bootstrap-dev-db.js) when you need a local Release 1 baseline. Keep local secret files such as `.env.development.local` and `.env.production.local` out of source control; the committed env contract is [`.env.example`](./.env.example).

## Dev Plan Sequence

1. [`dev-plan/01_architecture_decisions.md`](./dev-plan/01_architecture_decisions.md)
2. [`dev-plan/02_repo_scaffold.md`](./dev-plan/02_repo_scaffold.md)
3. [`dev-plan/03_environment_schema.md`](./dev-plan/03_environment_schema.md)
4. [`dev-plan/04_database_schema.md`](./dev-plan/04_database_schema.md)
5. [`dev-plan/05_database_indexes_and_seeds.md`](./dev-plan/05_database_indexes_and_seeds.md)
6. [`dev-plan/06_authentication.md`](./dev-plan/06_authentication.md)
7. [`dev-plan/07_authorization_rbac.md`](./dev-plan/07_authorization_rbac.md)
8. [`dev-plan/08_public_routing_and_information_architecture.md`](./dev-plan/08_public_routing_and_information_architecture.md)
9. [`dev-plan/09_admin_information_architecture.md`](./dev-plan/09_admin_information_architecture.md)
10. [`dev-plan/10_provider_registry_and_credentials.md`](./dev-plan/10_provider_registry_and_credentials.md)
11. [`dev-plan/11_destination_connections_and_streams.md`](./dev-plan/11_destination_connections_and_streams.md)
12. [`dev-plan/12_fetch_and_normalization_pipeline.md`](./dev-plan/12_fetch_and_normalization_pipeline.md)
13. [`dev-plan/13_filtering_publishability_and_deduplication.md`](./dev-plan/13_filtering_publishability_and_deduplication.md)
14. [`dev-plan/14_review_queue_and_publication_state.md`](./dev-plan/14_review_queue_and_publication_state.md)
15. [`dev-plan/15_media_ingestion_and_storage.md`](./dev-plan/15_media_ingestion_and_storage.md)
16. [`dev-plan/16_website_rendering_and_publication.md`](./dev-plan/16_website_rendering_and_publication.md)
17. [`dev-plan/17_social_destination_publication.md`](./dev-plan/17_social_destination_publication.md)
18. [`dev-plan/18_scheduler_incremental_windows_and_retries.md`](./dev-plan/18_scheduler_incremental_windows_and_retries.md)
19. [`dev-plan/19_seo_search_and_public_discovery.md`](./dev-plan/19_seo_search_and_public_discovery.md)
20. [`dev-plan/20_audit_logs_and_observability.md`](./dev-plan/20_audit_logs_and_observability.md)
21. [`dev-plan/21_analytics_dashboard_and_reporting.md`](./dev-plan/21_analytics_dashboard_and_reporting.md)
22. [`dev-plan/22_performance_and_scalability.md`](./dev-plan/22_performance_and_scalability.md)
23. [`dev-plan/23_security_compliance_and_secret_handling.md`](./dev-plan/23_security_compliance_and_secret_handling.md)
24. [`dev-plan/24_release_traceability_and_cutover.md`](./dev-plan/24_release_traceability_and_cutover.md)

## Repository Layout

```text
.
|-- .env.example
|-- app-write-up.md
|-- README.md
|-- dev-plan/
|   |-- 00_plan_index.md
|   |-- 01_architecture_decisions.md
|   |-- ...
|   `-- 24_release_traceability_and_cutover.md
|-- prisma/
|   |-- migrations/
|   |-- schema.prisma
|   `-- seed.js
`-- src/
    |-- app/
    |-- components/
    |-- features/
    |-- lib/
    |-- store/
    |-- styles/
    `-- test/
```
