# NewsPub

`news-pub` is a specification-first project for building a reuse-first news ingestion, review, scheduling, and publishing platform.

Release 1 is designed to let an authenticated admin configure providers, destinations, streams, templates, and schedules, fetch news from supported external APIs, filter it locally, and publish qualifying stories to the website, Facebook, and Instagram.

## Current Status

The planning layer now targets the NewsPub product.

The two authoritative planning documents are:

- [`app-write-up.md`](./app-write-up.md): the single source of truth for product scope, architecture, routes, persistence, workflows, and constraints
- [`dev-plan/00_plan_index.md`](./dev-plan/00_plan_index.md): the ordered implementation plan that breaks the build into 24 chronological steps

Important note:

- much of the current application code still reflects the retired equipment and AI product and should be treated as legacy until the implementation is rebuilt against the new NewsPub plan
- older files under [`docs/`](./docs/) and [`docs/evidence/`](./docs/evidence/) are historical unless they are explicitly regenerated for NewsPub

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
- website, Facebook, and Instagram publishing
- stream-based scheduling, filtering, deduplication, retries, and auditability
- SEO metadata, sitemap, robots, search, analytics, and operational reporting

Release 1 is not an AI content-generation product.

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
- `/admin/posts/review`
- `/admin/posts/published`
- `/admin/posts/[id]`
- `/admin/media`
- `/admin/templates`
- `/admin/jobs`
- `/admin/seo`
- `/admin/settings`

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
|-- app-write-up.md
|-- README.md
|-- dev-plan/
|   |-- 00_plan_index.md
|   |-- 01_architecture_decisions.md
|   |-- ...
|   `-- 24_release_traceability_and_cutover.md
`-- docs/
    |-- architecture-summary.md
    `-- evidence/
```

## Historical Documentation

These docs currently belong to the retired product shape unless they are explicitly regenerated:

- [`docs/architecture-summary.md`](./docs/architecture-summary.md)
- [`docs/adr/`](./docs/adr/)
- [`docs/evidence/`](./docs/evidence/)

They are useful as repository history, but they are not the active source of truth for NewsPub.
