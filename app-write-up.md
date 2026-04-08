# NewsPub - App Write-Up

## 1. Product Overview

`NewsPub` is a reuse-first news ingestion, review, AI-assisted optimization, scheduling, and publishing app.

The product consumes third-party news APIs, normalizes provider payloads into a shared internal article format, filters those articles against per-destination stream rules, runs a minimal AI-assisted optimization layer on eligible items, stores only publishable or published records, and publishes qualifying stories to the website, Facebook, and Instagram.

Release 1 is not an open-ended AI writing product. The AI layer is limited to formatting, rewriting, SEO packaging, platform-policy pre-checks, and destination-specific output preparation. It must preserve factual meaning, never invent facts, keep source attribution visible, and remain auditable. AI is assistive only and optional at runtime.

## 2. Release 1 Goals

Release 1 must:

- let an authenticated admin configure providers, destinations, streams, templates, schedules, and review rules without code changes
- fetch broadly within the incremental or explicit window, reuse one upstream call for compatible multi-stream batches when safe, then filter locally
- prefill stream settings plus manual run controls with the operator-visible default fetch window of the previous 24 hours through the next 30 minutes from now, explain the forward buffer clearly, and explain endpoint-specific provider mapping
- persist only publishable or published normalized articles plus operational logs
- optimize eligible stories with a cached AI layer before review approval or publication
- support both `AUTO_PUBLISH` and `REVIEW_REQUIRED` stream modes
- publish to the website, Facebook, and Instagram with shared canonical render artifacts and destination-specific formatting
- publish every website-eligible story from the fetched pool unless explicit duplicate, policy, moderation, or hold rules block it
- keep source attribution, compliance controls, retry behavior, and auditability visible in the admin workspace
- keep deterministic formatting and manual editorial flow operational when AI is disabled, misconfigured, unhealthy, rate limited, timing out, or returning invalid structured output

## 3. Reuse-First Architecture Constraints

- Reuse the existing Next.js App Router application, Prisma persistence layer, styled-components design system, Redux admin state pattern, Zod validation utilities, scheduled worker pattern, and SEO, analytics, and revalidation helpers.
- Reuse the current admin and public shells as the visual baseline. `app-layouts/admin-layout-*.png` and `app-layouts/public-layout-*.png` remain the reference layout direction.
- Reuse the current auth and session structure, env parsing pattern, storage adapter abstraction, admin screen composition style, and searchable select component.
- Reuse the existing `Post`, `PostTranslation`, `MediaAsset`, `SEORecord`, `ViewEvent`, and `AuditEvent` patterns where they still fit the NewsPub domain.
- Remove or fully replace equipment-specific, manufacturer-specific, research, open-ended generation, and public comment features. Partial coexistence with the old product is not allowed.
- Keep only a bounded AI optimization layer that operates after provider ingestion and before review approval or publication.
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
- Vercel AI SDK with an OpenAI provider for structured optimization output
- `sharp` for media optimization
- local or S3-compatible storage through the existing storage adapter abstraction

The implementation must keep the AI layer small, cheap-first, and auditable. No free-form article invention, prompt playground, or multi-model management surface belongs in NewsPub Release 1.

### AI Runtime Contract

Optional AI failures must never become hidden blockers for valid NewsPub work.

- missing AI credentials, disabled AI, model unavailability, rate limiting, timeouts, or invalid structured output must resolve to `OptimizationStatus.SKIPPED` or `OptimizationStatus.FALLBACK` rather than stopping fetch, review, scheduling, retry, or publication flows that can still proceed deterministically
- deterministic fallback payloads remain valid review and publish inputs when platform and policy requirements are otherwise satisfied
- machine-readable `aiResolution` metadata and reason details must persist on optimization results, article-match review data, publish-attempt diagnostics, and relevant audit events
- cached optimization results must preserve their AI resolution state so repeated work stays auditable
- optional AI health issues may change optimization quality or visibility, but they must not corrupt queue state or block manual editorial decisions

### Admin UX Consistency Standards

Release 1 admin forms and editors must reuse one shared interaction language across provider, destination, stream, template, settings, and post-editing surfaces.

- shared field labels, helper text, error text, validation summaries, and pending-action buttons must behave consistently across the admin workspace
- shared sticky side cards, split card headers, metadata pill rails, and platform icon badges must be reused across stream, destination, template, and taxonomy directory screens instead of recreated per route
- shared disclosure sections must expose a title, summary, and status metadata while collapsed, auto-open when they contain blocking errors or missing required data, and remain keyboard accessible with correct `aria-expanded` behavior
- shared control sizing tokens must keep primary buttons, secondary buttons, destructive buttons, icon buttons, compact pills, and select triggers aligned across cards, tables, toolbars, and modal footers
- submit failures must scroll and focus the first blocking form control instead of leaving operators to search for the error manually
- modal editing flows must preserve header context, keep footer actions stable, and avoid nested scroll traps during long edits
- manual story creation, category editing, and media upload modals must use the same shared disclosure and validation recovery contract as provider, destination, stream, template, and post-editor forms
- dashboard, jobs, post editor, and settings surfaces must surface AI runtime state and machine-readable skip or fallback reasons in operator-friendly language
- legacy standalone admin screens or duplicate helper modules must be removed when their responsibilities are fully covered by the shared admin UI and active feature routes

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
- `/admin/posts/new`
- `/admin/posts/review`
- `/admin/posts/published`
- `/admin/posts/[id]`
- `/admin/media`
- `/admin/templates`
- `/admin/jobs`
- `/admin/seo`
- `/admin/settings`

The admin dashboard is the operational control plane. It must expose provider status, destination status, stream status, recent fetch results, publish results, failures, retries, website analytics, AI runtime visibility, skip or fallback counts, and recent observability events.

## 7. Environment Contract

All secrets and external credentials live in environment variables or encrypted server-side storage. News API credentials must never be entered in the dashboard.

The environment contract must cover:

- app URL, default locale, supported locales
- database URL
- admin session secret and seed admin credentials
- per-provider credentials for `mediastack`, `newsdata`, and `newsapi`
- destination auth secrets or encryption keys for persisted destination tokens
- media driver configuration
- AI provider credentials, model choice, optimization toggle, and policy thresholds
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
- `FetchRun`
- `FetchedArticle`
- `ArticleMatch`
- `OptimizationCache`
- `DestinationTemplate`
- `PublishAttempt`

Expected enum families:

- `UserRole`: `SUPER_ADMIN`, `EDITOR`
- `PostStatus`: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`
- `EditorialStage`: `INGESTED`, `REVIEWED`, `EDITED`, `APPROVED`
- `WorkflowStage`: `INGESTED`, `OPTIMIZED`, `HELD`, `REVIEW_REQUIRED`, `APPROVED`, `SCHEDULED`, `PUBLISHED`, `FAILED`
- `OptimizationStatus`: `NOT_REQUESTED`, `PENDING`, `COMPLETED`, `FALLBACK`, `SKIPPED`, `FAILED`
- `PolicyReviewStatus`: `PASS`, `HOLD`, `BLOCK`
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
- `ProviderFetchCheckpoint` stores the previous successful fetch timestamp and provider cursor metadata per stream. Shared upstream batches still update each stream independently, but grouped executions persist a provider cursor only when exactly one stream owned the upstream request.
- `FetchRun` stores one per-stream execution record, including the normalized stream window, summary counts, provider cursor before or after values, and structured execution details for shared-batch mode, group membership, and endpoint-specific time-boundary handling.
- `FetchedArticle` stores only publishable or published normalized provider items, raw provider payload JSON when needed for audit, dedupe fingerprints, source attribution, and normalized content fields.
- `ArticleMatch` stores the evaluated relationship between a normalized article and a publishing stream, including filter reasons, duplicate decisions, hold reasons, publish timestamps, and the linked canonical `Post` when one exists.
- `OptimizationCache` stores deterministic optimization results keyed by content hash and destination settings hash so unchanged stories can reuse prior AI or fallback output.
- `DestinationTemplate` stores reusable formatting templates per platform, optional category, and locale.
- `Post` and `PostTranslation` remain the canonical rendered article layer reused for website output and review workflows across destinations.
- `PublishAttempt` stores every outbound publish attempt per destination, including formatted payloads, remote identifiers, response metadata, status, retries, and error messages.

Persistence rule: non-publishable articles are never stored as full `FetchedArticle` rows in Release 1. Only aggregate fetch counts and failure logs may exist for rejected items.

Operational rule: optional AI outages or misconfiguration should normally be represented as `SKIPPED` or `FALLBACK`. `FAILED` is reserved for broader workflow or persistence failure states, not for healthy deterministic degradation.

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
- provider time-boundary capabilities are endpoint specific and explicit: `mediastack` uses direct date bounds, `newsdata` `archive` uses direct date bounds, `newsdata` `latest` uses a relative timeframe, `newsapi` `everything` uses direct datetime bounds, and `newsapi` `top-headlines` relies on local-only window filtering
- stream settings and manual run dialogs must surface those endpoint-specific capability differences directly, while still pre-filling the normalized default window of the previous 24 hours through the next 30 minutes from now
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
- selected stream batches may share one upstream provider request when provider compatibility rules allow NewsPub to widen the request safely without underfetching
- stream settings and manual run surfaces must show one explicit normalized fetch window, defaulted to the previous 24 hours through the next 30 minutes from now, before provider-specific date, datetime, relative-lookback, or local-only mapping is applied
- new website streams default to `AUTO_PUBLISH`, while new Facebook and Instagram streams default to `REVIEW_REQUIRED`
- `maxPostsPerRun` bounds social destination batch size, while website streams still process every locally eligible article from the fetched pool
- website, Facebook, and Instagram streams may each point to different templates and schedules
- destination connection status and recent failures must be visible in the admin workspace

## 12. Fetch, Incremental Window, And Normalization Workflow

Every scheduled or manual run follows this order. A single execution request may contain one stream or a batch of stream ids.

1. load the requested stream or streams and validate that each target stream is active and configuration-complete
2. resolve one normalized fetch window per stream from the previous checkpoint, an explicit manual window, or the default lookback
3. partition the requested streams into the minimum safe number of compatible provider groups using provider key, endpoint shape, runtime credential source, time-boundary semantics, and restrictive provider request fields
4. resolve the selected provider client and provider credentials for each compatible group
5. widen the compatible group's provider request envelope and fetch broadly once for that group
6. normalize every provider article into the shared internal article contract exactly once per fetched item
7. fan the shared candidate pool back out into per-stream local filtering, including fetch-window checks when the upstream provider cannot express the full local boundary
8. store only publishable or published normalized articles
9. deduplicate before queueing or publishing
10. create or update the canonical `Post` render artifact when needed
11. optimize eligible destination payloads with cache reuse, fallback formatting, and policy review
12. queue website or social publication attempts
13. update each stream checkpoint only after that stream run succeeds
14. emit admin-visible logs, execution-mode details, and summary metrics

Optimization rule: when the AI layer is disabled, missing credentials, unavailable, rate limited, timing out, or returning invalid structured output, the workflow must persist a structured reason, set the optimization outcome to `SKIPPED` or `FALLBACK`, and continue with deterministic formatting or manual review instead of treating the run as a hard AI failure.

Fetch-window rule: explicit bounded windows may be used for manual runs, batched runs, retries, and diagnostics. Those explicit windows do not advance checkpoints unless `writeCheckpointOnSuccess` is explicitly set to `true`.

Admin UX rule: stream settings plus single-stream and multi-stream manual run controls must prefill the previous 24 hours through the next 30 minutes from now, show that default explicitly, explain that the extra 30-minute forward buffer protects against provider indexing and processing delays, and explain whether the chosen provider endpoint supports direct upstream bounds, only a relative lookback, or local-only enforcement.

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
- the normalized fetch window for that stream
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

Shared-fetch rule: the same fetched article may legitimately create separate `ArticleMatch` records for multiple streams when each stream accepts it after local filtering. This fan-out must stay idempotent per stream.

## 14. Review Workflow And Publication State

NewsPub supports two stream modes:

- `AUTO_PUBLISH`
- `REVIEW_REQUIRED`

Workflow rules:

- `AUTO_PUBLISH` may create or refresh the canonical `Post`, queue a `PublishAttempt`, and publish immediately if all validations pass
- `REVIEW_REQUIRED` must create or update the canonical `Post` in a held state with `PostStatus.DRAFT` and `EditorialStage.INGESTED`, then stop until an admin approves publication
- AI optimization runs after filtering and before approval or publication. It may move a destination match into `WorkflowStage.OPTIMIZED`, `WorkflowStage.REVIEW_REQUIRED`, or `WorkflowStage.HELD` depending on policy results and stream mode.
- review queues, the post editor, and publish diagnostics must expose optimization status and reason details so editors can distinguish successful AI output from `SKIPPED` or `FALLBACK` deterministic handling without losing publish control
- shared upstream fetching must not collapse downstream review state; each accepted stream keeps its own article-match record, hold reasons, optimization status, and publish diagnostics
- the manual story creation route at `/admin/posts/new` must feed the same canonical post and publication workflow as automated stories, including shared validation recovery and destination linkage
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

- rephrased title below 15 words
- rephrased summary and body suitable for website publication
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

- a bold-style headline of at most 10 words
- a body between 20 and 100 words
- source link
- optional media attachment
- platform-specific copy constraints

Instagram formatter output must include:

- concise caption
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
- website streams process every locally eligible candidate from the fetched pool and are not capped by `maxPostsPerRun`
- category landing pages and search index only published website posts
- source attribution, provider source URL, and publish timestamps remain visible on story pages
- fallback and non-AI website publication paths must still produce valid canonical URLs, SEO titles, meta descriptions, and synchronized Open Graph or Twitter metadata
- public route data must be cacheable and revalidatable through the existing revalidation helpers
- root redirects to the default locale

## 18. Facebook And Instagram Publication

Social publication rules:

- every outbound social post must create a `PublishAttempt`
- publish history must be queryable by destination, platform, stream, article, and status
- platform tokens or page credentials must be encrypted at rest when stored in the database
- platform-specific failures, rate limits, permission problems, and content-policy rejections must surface in admin logs
- Meta destinations must enforce a minimum post interval through the existing guardrail layer, and pacing or policy blocks must remain visible in publish diagnostics, jobs history, and post history
- publish retries must be idempotent and tied to the same `ArticleMatch`
- platform rules must never mutate provider facts or invent article content

## 19. Scheduler, Retries, And Recovery

Scheduling rules:

- manual run now is required
- hourly is the default cadence when no schedule is set
- each stream uses its configured timezone
- scheduled workers may run multiple streams in one batch, partition them into safe shared-fetch groups, and still finalize checkpoints, summaries, retries, and downstream state independently per stream
- checkpoint updates happen only after the stream run succeeds
- explicit manual or diagnostic windows do not advance checkpoints unless the caller opts in
- scheduled runs and retries for Facebook or Instagram destinations must respect the configured minimum post interval instead of publishing unsafe back-to-back bursts
- retries must apply to publish attempts and transient provider failures
- retry behavior must be stored in stream or attempt metadata and visible in the admin workspace
- repeated failures must pause automatic re-execution only when the configured retry ceiling is reached or an admin manually pauses the stream
- optional AI degradation must not advance a healthy stream run into a failed retry loop when deterministic or manual handling remains available

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
- optimized items
- optimization cache reuses
- AI optimization skip and fallback outcomes with machine-readable reason codes and operator-facing reason messages
- shared-fetch run counts, upstream request counts, execution mode, and per-run fetch-window details
- items blocked before publish by policy or guardrails
- duplicate skips
- retry counts
- stream connection health
- website view analytics
- top published stories
- structured audit events for provider, stream, article, post, and publish operations

Operational visibility must include dashboard and jobs counters for AI skip or fallback outcomes, the settings-page AI runtime summary, recent publish-attempt diagnostics, review-surface optimization details, flattened pacing or guardrail reason codes and messages in jobs or post history, and audit events that explain when AI optimization was skipped or when deterministic fallback was used.

`AuditEvent` remains the central append-only operational log. `ViewEvent` remains the public analytics event store.

## 22. Security And Compliance

Security rules:

- provider secrets are env-only
- destination tokens are encrypted before persistence
- protected admin APIs require session-based authorization and permission checks
- public routes never expose provider secrets, destination tokens, or raw internal error payloads
- remote media ingestion must validate URL protocol, content type, and safe storage behavior
- publishing code must respect target platform policies, rate limits, and auth scopes
- AI optimization must preserve facts, keep attribution, validate structured output, and degrade safely to deterministic formatting

## 23. Repo Reshape And Module Reuse Map

Retain and rebrand:

- `src/app/layout.js`
- `src/app/admin/layout.js`
- `src/components/layout/admin-shell.js`
- `src/components/layout/site-shell.js`
- `src/components/admin/*`
- `src/components/admin/admin-form-primitives.js`
- `src/components/admin/admin-ui-contract.js`
- `src/components/public/*`
- `src/components/common/searchable-select.js`
- `src/components/common/notice-page.js`
- `src/styles/theme.js`
- `src/styles/styled-registry.js`
- `src/store/*`
- `src/lib/env/*`
- `src/lib/auth/*`
- `src/lib/prisma/index.js`
- `src/lib/storage/index.js`
- `src/lib/seo/*`
- `src/lib/analytics/*`
- `src/lib/ai/*`
- `src/lib/revalidation/*`
- `src/lib/validation/*`
- `src/lib/news/*`
- `src/features/posts/*`
- `src/features/public-site/*`
- `src/features/media/*`
- `src/features/analytics/*`
- `src/features/providers/*`
- `src/features/destinations/*`
- `src/features/streams/*`
- `src/features/templates/*`

Repurpose:

- `src/components/admin/provider-form-card.js` for provider settings
- `src/components/admin/destination-form-card.js` for destination connectivity and guardrails
- `src/components/admin/stream-management-screen.js` for stream filtering, scheduling, and run controls
- `src/app/admin/posts/[id]/page.js` for canonical story review, optimization, and publish control
- `src/app/admin/jobs/page.js` for job activity, retry visibility, and publish diagnostics
- `src/components/layout/public-story-search.js` as the public story search and autocomplete component
- `src/messages/en.json` and locale helpers for website copy and route metadata
- `src/app/[locale]/*` page family for NewsPub public routes

Remove or fully replace:

- `src/lib/generation/*`
- `src/lib/research/*`
- equipment-specific normalization and equipment or manufacturer discovery modules
- prompt-management pages
- public comments components and moderation modules
- dead editor scaffolds, scaffold-named request helpers, and other misleading transitional runtime modules
- equipment or manufacturer public routes that do not belong to NewsPub
- any tests or seed data that describe the old equipment-generation product

## 24. Release 1 Acceptance Criteria

Release 1 is complete only when:

- the repo is rebranded from the old equipment app to `NewsPub`
- the old equipment-generation architecture is removed while the new bounded AI optimization layer is documented and operational
- every public and admin route listed in this document exists
- provider, destination, stream, fetch, filter, dedupe, review, publish, retry, SEO, analytics, and audit flows are implemented
- AI optimization, policy review, and cache-reuse flows are implemented and auditable
- AI-disabled, AI-misconfigured, AI-timeout, rate-limit, and invalid-structured-output paths degrade to `SKIPPED` or `FALLBACK` instead of blocking the product
- only publishable or published normalized articles are persisted
- provider credential resolution is env-based
- destination publish history is stored and queryable
- website, Facebook, and Instagram publication paths are all supported
- implementation modules are documented with current JSDoc and targeted inline comments that explain file purpose, exported behavior, and non-obvious workflow logic
- shared admin disclosure, validation, modal, and control-sizing primitives are applied across the major admin forms and editorial surfaces
- README, app write-up, and dev plan reflect the real repo structure without references to a missing `docs/` tree
- automated checks and manual verification cover the end-to-end workflow

## 25. Source Of Truth Rule

`app-write-up.md` is the authoritative product and architecture contract for NewsPub.

If an implementation artifact, dev-plan step, or historical document conflicts with this file, this file wins until it is explicitly revised.
