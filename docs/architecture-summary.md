# NewsPub Architecture Summary

## Scope

NewsPub Release 1 is a reuse-first news ingestion, review, scheduling, and publishing platform implemented on the existing Next.js App Router foundation and aligned to `app-write-up.md`.

## Fixed Stack

- Next.js App Router with JavaScript
- Prisma with MySQL or MariaDB
- styled-components for styling
- Redux Toolkit for admin-side client state
- Zod-based environment and payload validation
- locale-prefixed public routing with non-locale admin routing

## Route Families

Public routes:

- `/`
- `/[locale]`
- `/[locale]/news`
- `/[locale]/news/[slug]`
- `/[locale]/category/[slug]`
- `/[locale]/search`
- `/[locale]/about`
- `/[locale]/privacy`
- `/[locale]/disclaimer`

Admin routes:

- `/admin`
- `/admin/login`
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

## Data Model Split

The NewsPub persistence model keeps the pipeline responsibilities separate:

- `FetchedArticle` stores normalized provider facts and raw provider payloads.
- `ArticleMatch` stores per-stream filtering, dedupe, hold, queue, and publishability state.
- `Post` stores the canonical NewsPub story record.
- `PostTranslation` stores rendered markdown, HTML, structured JSON, and source attribution per locale.
- `PublishAttempt` stores outbound delivery history for website and social destinations.
- `FetchRun`, `AuditEvent`, and `ViewEvent` store operational history, observability, and analytics.

## Workflow Map

1. Admins configure providers, destinations, streams, templates, categories, and settings.
2. `runStreamFetch` resolves the active provider, fetches provider items, normalizes them, filters them, and blocks duplicates.
3. Eligible items become canonical `Post` records plus `ArticleMatch` records.
4. `AUTO_PUBLISH` streams publish immediately; `REVIEW_REQUIRED` streams hold items for editorial review.
5. Website publication updates the canonical post, records a `PublishAttempt`, and revalidates affected public routes.
6. Facebook and Instagram publication use the shared template context plus platform adapters behind the same `PublishAttempt` workflow.
7. Failed retryable publish attempts are retried by the scheduler or manually from `/admin/jobs`.
8. Public traffic is recorded as `ViewEvent`, while operational activity is captured in `AuditEvent`.

## Security Rules

- Provider secrets are env-only and never stored in the database.
- Destination access tokens are encrypted at rest before persistence.
- Public routes never expose provider credentials, destination tokens, or raw internal error payloads.
- Remote media ingestion validates protocol, MIME type, and file-size limits before storage.

## Documentation Standard

Non-trivial runtime modules carry module-level and exported-function JSDoc in the workflow, provider, SEO, analytics, revalidation, and editor layers. Inline comments remain reserved for non-obvious behavior such as retry selection or platform fallbacks.

## Reuse Decisions

Retained and reworked:

- app layout and shell structure
- env, auth, prisma, storage, SEO, analytics, and revalidation foundations
- locale routing helpers
- canonical `Post` and `PostTranslation` rendering model

Repurposed:

- `src/components/layout/public-equipment-search.js` as the public story search entry point
- legacy admin screens into NewsPub provider, destination, stream, post, and reporting surfaces

Removed or fully replaced:

- AI and generation modules
- research queue modules
- comments and moderation modules
- equipment and manufacturer domain modules

