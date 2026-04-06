# NewsPub - App Write-Up

## 1. Product Overview

`NewsPub` is a reuse-first news ingestion, review, scheduling, and publishing app.

The product consumes third-party news APIs, normalizes provider payloads into a shared internal article format, filters those articles against per-destination stream rules, stores only publishable or published records, and publishes qualifying stories to the website, Facebook, and Instagram.

Release 1 is not an AI writing product. The implementation must remove the existing AI generation architecture and replace it with provider-fed, source-attributed article ingestion.

## 2. Release 1 Goals

Release 1 must:

- let an authenticated admin configure providers, destinations, streams, templates, schedules, and review rules without code changes
- fetch broadly within the incremental window, then filter locally
- persist only publishable or published normalized articles plus operational logs
- support both `AUTO_PUBLISH` and `REVIEW_REQUIRED` stream modes
- publish to the website, Facebook, and Instagram with shared canonical render artifacts and destination-specific formatting
- keep source attribution, compliance controls, retry behavior, and auditability visible in the admin workspace

## 3. Reuse-First Architecture Constraints

- Reuse the existing Next.js App Router application, Prisma persistence layer, styled-components design system, Redux admin state pattern, Zod validation utilities, scheduled worker pattern, and SEO, analytics, and revalidation helpers.
- Reuse the current admin and public shells as the visual baseline. `app-layouts/admin-layout-*.png` and `app-layouts/public-layout-*.png` remain the reference layout direction.
- Reuse the current auth and session structure, env parsing pattern, storage adapter abstraction, admin screen composition style, and searchable select component.
- Reuse the existing `Post`, `PostTranslation`, `MediaAsset`, `SEORecord`, `ViewEvent`, and `AuditEvent` patterns where they still fit the NewsPub domain.
- Remove or fully replace equipment-specific, manufacturer-specific, AI, prompt, research, generation, and public comment features. Partial coexistence with the old product is not allowed.
- New product rules must favor adapting existing modules over introducing a parallel architecture.

## 4. Fixed Stack And Baseline Modules

Release 1 keeps these baseline runtime choices:

- Next.js `16.2.2` App Router with JavaScript
- React `19.2.4`
- Prisma `7.6.0` against MySQL or MariaDB
- styled-components `6.3.12`
- Redux Toolkit `2.11.2` for admin-facing client state only
- Zod `4.3.6` for env, API, and workflow validation
- Vitest `4.1.2` for automated verification
- `sharp` for media optimization
- local or S3-compatible storage through the existing storage adapter abstraction

The implementation must remove the Vercel AI SDK and any AI provider dependencies from the runtime contract. No model catalogs, prompt templates, or AI generation services belong in NewsPub Release 1.

### Documentation Standards

Release 1 code must remain professionally documented as the old product is reshaped into NewsPub.

- add module-level JSDoc to non-trivial runtime files so each file clearly explains its NewsPub responsibility, major exports, and where it fits in the ingest, review, publish, or admin workflow
- add JSDoc to exported functions, React components, route handlers, server actions, jobs, provider adapters, formatter utilities, validation helpers, and data mappers whenever their role, inputs, outputs, side effects, or invariants are not obvious from the implementation alone
- document provider-specific quirks, retry behavior, deduplication rules, security-sensitive branches, and fallback paths close to the code that enforces them
- add inline comments only where the logic would otherwise be hard to understand quickly; avoid placeholder comments or commentary that only repeats the code
- whenever a file changes behavior, update the related JSDoc and any required inline comments in the same change

## 5. Public Route Topology

Public website routes stay locale-prefixed so the repo can reuse the existing locale-aware routing and shell structure.

Required public routes:

- `/` redirects to `/${DEFAULT_LOCALE}`
- `/[locale]` home page with latest published stories, top categories, and search entry
- `/[locale]/news` paginated published story index
- `/[locale]/news/[slug]` published story page
- `/[locale]/category/[slug]` published category landing page
- `/[locale]/search` search results page for published website stories
- `/[locale]/about`
- `/[locale]/privacy`
- `/[locale]/disclaimer`

Release 1 default locale is `en`. Additional locales may be added later by reusing the existing locale registration flow, but only the locales configured in the environment and seeded in the database are active.

## 6. Admin Route Topology

Admin routes stay non-locale-prefixed under `/admin`.

Required admin routes:

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

The admin dashboard is the operational control plane. It must expose provider status, destination status, stream status, recent fetch results, publish results, failures, retries, and website analytics.

## 7. Environment Contract

All secrets and external credentials live in environment variables or encrypted server-side storage. News API credentials must never be entered in the dashboard.

The environment contract must cover:

- app URL, default locale, supported locales
- database URL
- admin session secret and seed admin credentials
- per-provider credentials for `mediastack`, `newsdata`, and `newsapi`
- destination auth secrets or encryption keys for persisted destination tokens
- media driver configuration
- cron secret and revalidation secret
- optional analytics and metrics toggles
- default schedule timezone and safe initial backfill window settings

Provider credential names must be explicit and provider-specific, for example:

- `MEDIASTACK_API_KEY`
- `NEWSDATA_API_KEY`
- `NEWSAPI_API_KEY`

The selected active provider determines which credential is resolved at runtime. Missing provider credentials must block fetch execution and emit a clear admin-visible error.

## 8. Persistence Model

Release 1 keeps and reuses these existing model families where possible:

- `Locale`
- `User`
- `AdminSession`
- `Category`
- `Post`
- `PostTranslation`
- `MediaAsset`
- `MediaVariant`
- `SEORecord`
- `ViewEvent`
- `AuditEvent`

Release 1 introduces or repurposes these NewsPub-specific models:

- `NewsProviderConfig`
- `Destination`
- `PublishingStream`
- `StreamCategory`
- `ProviderFetchCheckpoint`
- `FetchedArticle`
- `ArticleMatch`
- `DestinationTemplate`
- `PublishAttempt`

Expected enum families:

- `UserRole`: `SUPER_ADMIN`, `EDITOR`
- `PostStatus`: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`
- `EditorialStage`: `INGESTED`, `REVIEWED`, `EDITED`, `APPROVED`
- `DestinationPlatform`: `WEBSITE`, `FACEBOOK`, `INSTAGRAM`
- `DestinationKind`: `WEBSITE`, `FACEBOOK_PROFILE`, `FACEBOOK_PAGE`, `INSTAGRAM_PERSONAL`, `INSTAGRAM_BUSINESS`
- `ConnectionStatus`: `DISCONNECTED`, `CONNECTED`, `ERROR`
- `StreamMode`: `AUTO_PUBLISH`, `REVIEW_REQUIRED`
- `StreamStatus`: `ACTIVE`, `PAUSED`
- `ArticleMatchStatus`: `ELIGIBLE`, `HELD_FOR_REVIEW`, `QUEUED`, `PUBLISHED`, `FAILED`, `DUPLICATE`, `SKIPPED`
- `PublishAttemptStatus`: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`, `CANCELLED`
- `FetchRunStatus`: `PENDING`, `RUNNING`, `SUCCEEDED`, `FAILED`

Model responsibilities:

- `NewsProviderConfig` stores the supported provider key, whether it is selectable, provider-specific request defaults, and human-readable labels. Provider secrets stay in env, not in this table.
- `Destination` stores the destination platform, destination kind, account or page identifiers, connection status, publish defaults, and encrypted token or credential references when platform APIs require them.
- `PublishingStream` is the main per-destination automation unit. It stores destination linkage, locale, country and region rules, keyword rules, schedule, timezone, max posts per run, duplicate rules, active provider, default template, and mode.
- `StreamCategory` links streams to internal categories.
- `ProviderFetchCheckpoint` stores the previous successful fetch timestamp and provider cursor metadata per stream.
- `FetchedArticle` stores only publishable or published normalized provider items, raw provider payload JSON when needed for audit, dedupe fingerprints, source attribution, and normalized content fields.
- `ArticleMatch` stores the evaluated relationship between a normalized article and a publishing stream, including filter reasons, duplicate decisions, hold reasons, publish timestamps, and the linked canonical `Post` when one exists.
- `DestinationTemplate` stores reusable formatting templates per platform, optional category, and locale.
- `Post` and `PostTranslation` remain the canonical rendered article layer reused for website output and review workflows across destinations.
- `PublishAttempt` stores every outbound publish attempt per destination, including formatted payloads, remote identifiers, response metadata, status, retries, and error messages.

Persistence rule: non-publishable articles are never stored as full `FetchedArticle` rows in Release 1. Only aggregate fetch counts and failure logs may exist for rejected items.

## 9. Authentication And RBAC

Admin auth remains email and password with server-side sessions. There is no public authoring, no guest comments, and no public login flow in Release 1.

Role rules:

- `SUPER_ADMIN` can manage providers, destinations, streams, categories, templates, SEO settings, media, jobs, and publishing
- `EDITOR` can review held stories, edit canonical render artifacts, schedule or publish permitted items, and view operational queues
- permissions must stay explicit in a central RBAC module and drive navigation visibility, page protection, and API authorization

## 10. Supported Providers And Credential Resolution

Release 1 supports:

- `https://newsdata.io`
- `https://newsapi.org`
- `https://mediastack.com`

Rules:

- `https://mediastack.com` is the default selected provider in fresh installs
- provider switching must be configuration driven, not code driven
- each provider client must normalize its raw response into the shared `FetchedArticle` contract before any filtering occurs
- provider-specific request parameters, pagination cursors, rate limits, and response quirks live in the provider integration layer only
- provider credentials resolve from env based on the active provider key
- missing credentials, invalid response shapes, or provider throttling must appear in audit logs and the admin dashboard

## 11. Destination Connections And Streams

Release 1 destinations:

- website
- Facebook personal account
- Facebook page
- Instagram personal account
- Instagram business or creator profile

Rules:

- a destination is the connected account or endpoint
- a stream is the destination-specific automation rule set
- one destination may have multiple streams, for example separate category or language streams
- each stream stores locale, category mapping, country and region filters, language rules, include and exclude keywords, publish mode, schedule, timezone, retry policy, duplicate window, and max posts per run
- each stream may use only one active provider at a time
- website, Facebook, and Instagram streams may each point to different templates and schedules
- destination connection status and recent failures must be visible in the admin workspace

## 12. Fetch, Incremental Window, And Normalization Workflow

Every scheduled or manual run follows this order:

1. load the active stream and validate that it is enabled
2. resolve the selected provider client and provider credentials
3. read the stream checkpoint
4. fetch broadly within the incremental window for that stream
5. normalize every provider article into the shared internal article contract
6. filter locally against stream rules
7. store only publishable or published normalized articles
8. deduplicate before queueing or publishing
9. create or update the canonical `Post` render artifact when needed
10. queue website or social publication attempts
11. update the stream checkpoint only after a successful run
12. emit admin-visible logs and summary metrics

The normalized article contract must include at least:

- provider key
- provider article id when available
- source name
- source URL
- title
- summary or description
- body or content when available
- author when available
- published timestamp
- image URL when available
- language
- provider categories
- provider countries or regions when available
- tags or derived keywords
- raw payload JSON when the article is saved
- fetch timestamp
- dedupe fingerprint inputs

## 13. Filtering, Publishability, And Deduplication

Filtering must happen after normalization and must combine:

- provider categories
- title, description, and body text
- include keywords
- exclude keywords
- stream category assignments
- locale and language rules
- country and region rules
- destination platform constraints
- duplicate history for the same destination

Filtering outcomes:

- `ELIGIBLE`
- `HELD_FOR_REVIEW`
- `DUPLICATE`
- `SKIPPED`

Deduplication must consider:

- provider article id
- source URL
- normalized title
- published timestamp
- stream id
- destination id
- prior publish history
- a time-aware duplicate window configured on the stream

Already published items must never republish to the same destination unless an explicit manual override is recorded.

## 14. Review Workflow And Publication State

NewsPub supports two stream modes:

- `AUTO_PUBLISH`
- `REVIEW_REQUIRED`

Workflow rules:

- `AUTO_PUBLISH` may create or refresh the canonical `Post`, queue a `PublishAttempt`, and publish immediately if all validations pass
- `REVIEW_REQUIRED` must create or update the canonical `Post` in a held state with `PostStatus.DRAFT` and `EditorialStage.INGESTED`, then stop until an admin approves publication
- editors work from the reused post inventory and post editor surfaces
- the canonical `Post` is the editable render artifact that feeds website and social formatting
- publishing state and editorial stage remain separate fields
- scheduled publishing uses `PostStatus.SCHEDULED`
- archiving must keep audit history intact and never delete prior publish attempts

## 15. Media Handling

Media rules:

- prefer the provider image URL when available and safe to fetch
- ingest remote images through the existing storage adapter, not by hotlinking uncontrolled remote assets into the website
- generate responsive variants with the existing image pipeline
- store alt text, caption, source URL, attribution, and license notes when available
- allow local storage and S3-compatible storage through the existing adapter abstraction
- block unsafe MIME types, oversized files, or failed remote fetches
- social publication must gracefully fall back when an image is unavailable or rejected

## 16. Destination Formatting And Templates

Formatting is destination aware.

Website formatter output must include:

- title
- summary
- body
- featured image
- source attribution
- category
- locale
- slug
- SEO title
- meta description
- keywords
- canonical URL inputs

Facebook formatter output must include:

- intro or caption text
- source link
- optional media attachment
- platform-specific copy constraints

Instagram formatter output must include:

- caption
- optional hashtags
- optional media attachment
- source reference when required by policy

Templates must be configurable per platform with optional locale and category overrides. Template selection order is:

1. exact stream template
2. platform plus category template
3. platform plus locale template
4. platform default template

## 17. Website Publication

The website destination uses the existing public-site and posts architecture.

Rules:

- only `PUBLISHED` posts render on public routes
- `PostTranslation` remains the rendered website content record per locale
- category landing pages and search index only published website posts
- source attribution, provider source URL, and publish timestamps remain visible on story pages
- public route data must be cacheable and revalidatable through the existing revalidation helpers
- root redirects to the default locale

## 18. Facebook And Instagram Publication

Social publication rules:

- every outbound social post must create a `PublishAttempt`
- publish history must be queryable by destination, platform, stream, article, and status
- platform tokens or page credentials must be encrypted at rest when stored in the database
- platform-specific failures, rate limits, permission problems, and content-policy rejections must surface in admin logs
- publish retries must be idempotent and tied to the same `ArticleMatch`
- platform rules must never mutate provider facts or invent article content

## 19. Scheduler, Retries, And Recovery

Scheduling rules:

- manual run now is required
- hourly is the default cadence when no schedule is set
- each stream uses its configured timezone
- scheduled workers may run multiple streams in one batch but must process them independently
- checkpoint updates happen only after the stream run succeeds
- retries must apply to publish attempts and transient provider failures
- retry behavior must be stored in stream or attempt metadata and visible in the admin workspace
- repeated failures must pause automatic re-execution only when the configured retry ceiling is reached or an admin manually pauses the stream

## 20. SEO, Search, And Public Discovery

The website reuses the existing SEO and discovery architecture with NewsPub content.

Release 1 requires:

- story-level metadata and structured data
- sitemap and robots routes
- category landing pages
- website search against published stories
- related story selection based on category and shared source signals
- social preview metadata for website links
- search route kept public but excluded from sitemap if that remains the existing policy

## 21. Analytics, Logs, And Auditability

Release 1 must expose:

- total fetched items per run
- total publishable items per run
- total published items per destination
- failed fetches
- failed publish attempts
- duplicate skips
- retry counts
- stream connection health
- website view analytics
- top published stories
- structured audit events for provider, stream, article, post, and publish operations

`AuditEvent` remains the central append-only operational log. `ViewEvent` remains the public analytics event store.

## 22. Security And Compliance

Security rules:

- provider secrets are env-only
- destination tokens are encrypted before persistence
- protected admin APIs require session-based authorization and permission checks
- public routes never expose provider secrets, destination tokens, or raw internal error payloads
- remote media ingestion must validate URL protocol, content type, and safe storage behavior
- publishing code must respect target platform policies, rate limits, and auth scopes
- Release 1 must not ship the old AI provider, prompt, or model-management flows

## 23. Repo Reshape And Module Reuse Map

Retain and rebrand:

- `src/app/layout.js`
- `src/app/admin/layout.js`
- `src/components/layout/admin-shell.js`
- `src/components/layout/site-shell.js`
- `src/components/common/searchable-select.js`
- `src/styles/theme.js`
- `src/styles/styled-registry.js`
- `src/store/*`
- `src/lib/env/*`
- `src/lib/auth/*`
- `src/lib/prisma/index.js`
- `src/lib/storage/index.js`
- `src/lib/seo/*`
- `src/lib/analytics/*`
- `src/lib/revalidation/*`
- `src/lib/jobs/*`
- `src/features/posts/*`
- `src/features/public-site/*`
- `src/features/media/*`
- `src/features/analytics/*`

Repurpose:

- `src/components/admin/provider-configuration-screen.js` for news provider settings
- `src/components/admin/source-configuration-screen.js` for stream and filter configuration
- `src/components/admin/post-inventory-screen.js` for review queue and published inventory
- `src/components/admin/post-editor-screen.js` for canonical story review and publish control
- `src/components/admin/analytics-dashboard-screen.js` for NewsPub operations and traffic reporting
- `src/components/layout/public-story-search.js` as the public story search and autocomplete component
- `src/messages/en.json` and locale helpers for website copy and route metadata
- `src/app/[locale]/*` page family for NewsPub public routes

Remove or fully replace:

- `src/lib/ai/*`
- `src/lib/generation/*`
- `src/lib/research/*`
- equipment-specific normalization and equipment or manufacturer discovery modules
- prompt-management pages
- public comments components and moderation modules
- equipment or manufacturer public routes that do not belong to NewsPub
- any tests or seed data that describe the old equipment-generation product

## 24. Release 1 Acceptance Criteria

Release 1 is complete only when:

- the repo is rebranded from the old equipment app to `NewsPub`
- the AI and equipment-generation architecture is removed
- every public and admin route listed in this document exists
- provider, destination, stream, fetch, filter, dedupe, review, publish, retry, SEO, analytics, and audit flows are implemented
- only publishable or published normalized articles are persisted
- provider credential resolution is env-based
- destination publish history is stored and queryable
- website, Facebook, and Instagram publication paths are all supported
- implementation modules are documented with current JSDoc and targeted inline comments that explain file purpose, exported behavior, and non-obvious workflow logic
- automated checks and manual verification cover the end-to-end workflow

## 25. Source Of Truth Rule

`app-write-up.md` is the authoritative product and architecture contract for NewsPub.

If an implementation artifact, dev-plan step, or historical document conflicts with this file, this file wins until it is explicitly revised.
