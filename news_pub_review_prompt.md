# NewsPub — Full Refactor Prompt for Persistence Naming, Worker Recovery, and Provider Hardening

You are refactoring the attached **NewsPub** codebase.

Your job is to complete a **production-grade, repo-wide refactor** that brings the codebase to full compliance in three areas:

1. **Database naming compliance**: every physical database table and physical database column must be lowercase `snake_case`, and all database-facing source code must align to the same naming convention.
2. **Worker reliability**: stream fetching, queueing, retrying, and auto publication must be durable, restart-safe, lease-safe, and idempotent.
3. **Provider correctness**: every implemented news provider integration and related admin UI must match the official provider documentation and fail safely.

Do **not** rewrite code that is already compliant and correct.

---

## What the review found

Treat the following as facts about the current repository and refactor accordingly.

### 1) What is already correct and must stay as-is unless a change is required for correctness

- Physical Prisma table mappings are already lowercase `snake_case`.
- Migration SQL and raw SQL naming verification already exist.
- There is already a durable job foundation in `src/lib/news/workflows.js`, including:
  - fetch-run claiming,
  - publish-attempt claiming,
  - lease refresh / heartbeats,
  - stale fetch-run recovery,
  - stale publish-attempt recovery,
  - retry scheduling,
  - stranded auto-publish recovery,
  - scheduled draining of pending work.
- Provider request validation is already partially implemented for `mediastack`, `newsapi`, and `newsdata`.
- Existing compliant code should remain untouched except where required to complete the refactor.

### 2) What is still not fully compliant or not fully robust

#### A. Persistence naming is only physically compliant, not source-code compliant

The Prisma schema still uses a large number of camelCase field names mapped to snake_case columns with `@map(...)`.

Examples include:
- `isActive -> is_active`
- `providerConfigId -> provider_config_id`
- `lastRunStartedAt -> last_run_started_at`
- `scheduledPublishAt -> scheduled_publish_at`
- `executionDetailsJson -> execution_details_json`

The review found **24 models** with **269 mapped fields** where the canonical physical DB name is already snake_case but the database-facing source identifier remains camelCase.

That means the codebase is **not yet 100% aligned** with the DB naming convention, even though the DB itself is already compliant.

#### B. `schedule_expression` exists but is effectively dead

The schema stores `schedule_expression`, but the current runtime scheduling path uses `schedule_interval_minutes`, and stream save/update logic explicitly persists `scheduleExpression: null`.

`getStreamNextScheduledRunAt()` derives next execution from `scheduleIntervalMinutes` and `lastRunCompletedAt`, not from `scheduleExpression`.

This is an incomplete scheduling model and must be resolved. Either:
- fully implement `schedule_expression` semantics end-to-end, or
- remove it cleanly as dead persistence and UI surface.

Do not leave a persisted scheduling field that is never actually used.

#### C. The worker foundation is good, but it still behaves like app-embedded job orchestration rather than a dedicated, hardened worker runtime

The current system uses:
- `scripts/internal-scheduler.js`
- `src/app/api/jobs/scheduled-publishing/route.js`
- `runScheduledStreams()` in `src/lib/news/workflows.js`

This is a valid foundation, but the refactor must harden it into a clearly defined worker flow with deterministic startup recovery, concurrency control, and explicit queue semantics.

The final system must guarantee that triggered/running work is recoverable after restart and that auto-publish streams resume safely without duplicate destination publication.

#### D. Provider UI/runtime alignment is incomplete

The provider adapters are already fairly strong, but the review found important structural gaps:

- provider source selection is still primarily free-text instead of catalog-backed where the upstream API provides a discovery endpoint;
- provider capability handling is not fully separated into:
  - endpoint capability,
  - plan capability,
  - UI visibility,
  - runtime validation,
  - normalization provenance;
- some derived metadata in normalized articles is inferred from request context rather than explicitly marked as inferred;
- the admin UI and server validation should share a stricter single source of truth for provider constraints.

---

# Primary objective

Complete the refactor so the final repo satisfies **all** of the following:

- all physical database tables use lowercase `snake_case`
- all physical database columns use lowercase `snake_case`
- all database-facing source identifiers use lowercase `snake_case`
- compliant existing code is preserved
- worker execution is durable and restart-safe
- auto-publish streams automatically resume and publish as configured
- provider UI and runtime are corrected against official documentation
- tests and verification prevent regressions

---

# Non-negotiable rules

- **Leave compliant code unchanged.**
- **Do not introduce unrelated architectural churn.**
- **Do not do cosmetic rewrites.**
- **Do not weaken existing safety mechanisms** such as leases, retries, idempotency keys, checkpoint handling, or diagnostics.
- **Do not silently change business behavior** unless the current behavior is wrong or incomplete.
- Prefer **surgical, high-confidence changes** over broad rewrites.

---

# Workstream 1 — Full snake_case persistence alignment

## Goal

Make `snake_case` the canonical naming convention for all persistence-backed identifiers across the codebase, not just the physical DB.

## Required outcome

### 1. Prisma schema

Refactor the Prisma schema so database-backed model fields are snake_case in the application-facing Prisma layer as well.

This includes at minimum:
- primary keys
- foreign keys
- timestamps
- JSON columns
- status fields
- counters
- scheduling fields
- lease fields
- checkpoint fields
- any other persisted field

The desired end state is:
- physical DB names are snake_case
- Prisma database-facing field names are snake_case
- repo-wide DB query code uses snake_case
- `@map(...)` is only retained where truly necessary, not to preserve legacy camelCase identifiers

### 2. Query code

Update every Prisma usage across the repository, including:
- `where`
- `data`
- `select`
- `include`
- `orderBy`
- relation foreign-key usage
- composite key usage
- upserts
- seed data
- tests and fixtures

### 3. API/service/admin shapes

Any internal shape that directly represents persisted data must move to snake_case.

This includes:
- feature service return values that are thin DB projections
- workflow payloads that move persisted fields around
- admin CRUD payload handling for persisted entities
- test fixtures and mocks
- runtime verification scripts

Do **not** rename framework-idiomatic React component names or local non-persisted variables unless needed.

## Required file scope

At minimum, review and refactor:
- `prisma/schema.prisma`
- all files under `prisma/migrations/**`
- `prisma/seed.js`
- `scripts/verify-db-snake-case.js`
- `scripts/cpanel-db-utils.js`
- `scripts/cpanel-db-deploy.js`
- `scripts/cpanel-db-seed.js`
- `src/lib/news/workflows.js`
- `src/features/providers/index.js`
- `src/features/streams/index.js`
- `src/features/posts/index.js`
- `src/features/public-site/index.js`
- `src/features/templates/index.js`
- `src/features/categories/index.js`
- `src/features/settings/index.js`
- `src/lib/analytics/index.js`
- `src/lib/auth/index.js`
- `src/lib/ai/index.js`
- `scripts/perf/seed-public-fixtures.js`
- every test fixture touching persisted records

## Required verification

Strengthen the existing DB naming checks so CI fails if any of the following regress:
- non-snake_case physical table names
- non-snake_case physical column names
- legacy raw SQL identifier usage
- newly introduced camelCase persistence field names in Prisma schema
- newly introduced camelCase database-facing query fields in repository code

Add a dedicated verification step that scans Prisma schema metadata plus DB-facing query code.

## Acceptance criteria

The refactor is not complete until:
- Prisma model field names used for persisted fields are snake_case
- DB query code no longer depends on camelCase aliases for persisted fields
- migrations are deterministic and non-destructive where possible
- tests and verification scripts pass

---

# Workstream 2 — Worker/runtime hardening for stream recovery and auto publication

## Goal

Ensure the background worker flow is robust enough to reschedule and complete all triggered/running work for fetches and auto publication.

## Current foundation to preserve

The following existing behavior must be retained and hardened, not replaced blindly:

- stale fetch-run recovery
- stale publish-attempt recovery
- stranded auto-publish match recovery
- retry scheduling
- lease ownership for fetch runs and publish attempts
- queue draining from `runScheduledStreams()`
- scheduler entry via `scripts/internal-scheduler.js` and cron-protected job route

## Required fixes and upgrades

### 1. Define the worker as a first-class runtime

Refactor the job flow so there is a clear worker boundary.

The final architecture must make it explicit which code is responsible for:
- scheduling due stream work
- claiming fetch jobs
- refreshing fetch leases
- finalizing fetch runs
- claiming publish jobs
- refreshing publish leases
- retry queueing
- orphan reconciliation
- startup recovery
- metrics / diagnostics / audit output

A dedicated worker entrypoint is preferred over a purely route-driven implicit worker model, but keep compatibility with the existing protected route where useful.

### 2. Recovery guarantees

Guarantee all of the following:

- if a stream run was triggered but left `PENDING` or `RUNNING`, it is recoverable
- if a publish attempt was left `PENDING` or `RUNNING`, it is recoverable
- if an auto-publish match has no publish attempt, it is recovered automatically
- restart/crash mid-run does not lose work
- restart/crash mid-run does not duplicate publication
- retries are bounded and reason-coded
- disconnected or invalid destinations fail clearly and do not loop forever

### 3. Scheduling semantics

Resolve the incomplete schedule model.

Specifically:
- audit all uses of `schedule_interval_minutes`
- audit all uses of `schedule_expression`
- implement exactly one coherent scheduling model
- if both are retained, define precedence, validation, storage semantics, next-run calculation, and UI behavior
- if `schedule_expression` is not retained, remove the dead field/UI/runtime references cleanly

### 4. Idempotency and duplicate-safe publication

Strengthen guarantees around:
- queue-key uniqueness
- idempotency keys
- retry chaining
- orphan recovery
- repost handling
- destination submission after timeout / partial uncertainty

A publish must not execute twice because:
- the app restarted,
- the scheduler fired twice,
- a lease expired mid-flight,
- the downstream destination returned an ambiguous error,
- the same pending work was recovered twice.

### 5. Stream-mode correctness

Enforce mode semantics consistently:
- `AUTO_PUBLISH` publishes automatically when eligible
- `REVIEW_REQUIRED` never auto publishes
- paused streams do not run
- destination readiness gates auto publication correctly
- per-stream settings drive publication behavior deterministically

## Required file scope

At minimum, review and refactor:
- `scripts/internal-scheduler.js`
- `scripts/start-standalone.js`
- `src/app/api/jobs/scheduled-publishing/route.js`
- `src/app/api/streams/run/route.js`
- `src/lib/news/workflows.js`
- `src/lib/news/publishers.js`
- `src/lib/news/destination-runtime.js`
- `src/lib/news/publish-diagnostics.js`
- `src/lib/news/shared-fetch.js`
- `src/lib/news/fetch-window.js`
- `src/features/streams/index.js`
- related tests

## Required tests

Add or update tests covering at minimum:
- due stream enqueueing exactly once per schedule window
- stale fetch-run recovery
- stale publish-attempt recovery
- stranded auto-publish recovery
- retryable failure requeueing
- non-retryable failure non-looping behavior
- restart-safe drain behavior
- lease expiry during long-running execution
- auto-publish vs review-required mode behavior
- paused stream non-execution
- disconnected destination handling

---

# Workstream 3 — Provider review against official documentation

## Goal

Review all implemented news providers against their official documentation and make UI, validation, request building, pagination, normalization, and diagnostics fully consistent.

Providers in scope:
- `mediastack`
- `newsapi`
- `newsdata`

## Important instruction

Where the current implementation is already correct, leave it as-is.

The review already found that several things are good and should be preserved:
- NewsAPI `top-headlines` vs `everything` split exists
- NewsAPI `sources` count validation already exists
- NewsAPI incompatible `sources` + `country/category` handling already exists
- NewsData `latest` vs `archive` split already exists
- NewsData `nextPage` pagination already exists
- Mediastack offset/limit pagination already exists
- provider diagnostics and retry instrumentation already exist

Build from these foundations instead of rewriting them.

## Provider-specific requirements

### A. NewsAPI

Audit the implementation against the official docs and ensure all runtime/UI behavior is correct for:
- `top-headlines`
- `everything`
- `/sources` discovery support where useful in admin UX

Required enforcement:
- `top-headlines` supports `country`, `category`, `sources`, `q`, `page`, `pageSize`
- `sources` cannot be combined with `country` or `category`
- `everything` supports `q`, `searchIn`, `sources`, `domains`, `excludeDomains`, `from`, `to`, `language`, `sortBy`, `page`, `pageSize`
- `sources` max count must remain enforced
- endpoint-specific field visibility must be correct in UI and server validation
- normalization must clearly distinguish provider-returned metadata vs request-inferred metadata
- diagnostics must expose endpoint, page, request shape, retry events, and response-shape failures

Also add a provider-backed admin affordance for source ID selection or validation using documented source discovery where possible, instead of relying only on free-text IDs.

### B. Mediastack

Audit the implementation against the official docs and ensure runtime/UI correctness for:
- `access_key`
- `sources`
- `categories`
- `countries`
- `languages`
- `keywords`
- `date`
- `sort`
- `limit`
- `offset`
- `/sources` discovery where useful in admin UX

Required enforcement:
- keep include/exclude formatting correct
- preserve `limit <= 100`
- validate/surface pagination expectations correctly
- preserve historical date/date-range handling
- improve source discovery and validation in the UI if upstream source catalogs are available
- normalize partial response records safely

### C. NewsData

Audit the implementation against the official docs and ensure runtime/UI correctness for:
- `latest` vs `archive`
- `timeframe` vs `from_date` / `to_date`
- `page` / `nextPage`
- `q`, `qInTitle`, `qInMeta`
- `language`, `country`, `category`
- exclusion filters
- domain-related fields
- advanced flags such as duplicate/media/full-content filters where documented

Required enforcement:
- keep exact latest/archive incompatibility rules server-side
- retain local exact-bound filtering where upstream latest only supports relative lookback
- distinguish plan-limited fields from universally available fields
- make the admin UI explicit when a field is endpoint-limited or plan-limited
- expose better diagnostics for cursor loops, empty pages, invalid response shapes, and provider exhaustion

## Provider capability model

Create or strengthen a single capability model that drives all of the following from one place:
- UI field visibility
- UI helper text
- server validation
- runtime request shaping
- endpoint compatibility
- plan restrictions
- fetch window mapping
- source catalog availability

Do not scatter provider rules across multiple partially duplicated sources of truth.

## Normalization requirements

For every provider, make article normalization resilient and explicit.

Requirements:
- tolerate missing author/body/image/source fields
- preserve raw payloads for diagnostics
- normalize timestamps safely
- capture provider-originated metadata accurately
- when metadata is inferred from request context, mark it as inferred rather than presenting it as source-provided truth

## Required file scope

At minimum, review and refactor:
- `src/lib/news/provider-definitions.js`
- `src/lib/news/providers.js`
- `src/lib/news/outbound-fetch.js`
- `src/components/admin/provider-form-card.js`
- `src/components/admin/provider-filter-fields.js`
- `src/components/admin/stream-form-card.js`
- `src/components/admin/stream-management-screen.js`
- `src/features/providers/index.js`
- `src/features/streams/index.js`
- provider tests and admin helper tests

## Required tests

Add or update tests for:
- endpoint-specific field gating
- invalid request combinations
- source count limits
- page/cursor pagination behavior
- provider diagnostics shape
- response-shape failure handling
- inferred-metadata normalization markers
- source-catalog-assisted validation where implemented

---

# Workstream 4 — Do not regress what is already compliant

Before changing any subsystem, explicitly classify each piece as one of:
- already compliant and should be preserved
- incomplete but directionally correct and should be hardened
- incorrect and must be changed
- dead code and should be removed

Apply that discipline repo-wide.

Examples of things that appear directionally correct and should usually be hardened rather than replaced:
- durable lease fields in `fetch_run` and `publish_attempt`
- stale-run reconciliation paths
- queue-key / idempotency-key patterns
- provider diagnostics scaffolding
- existing DB naming verification

---

# Deliverables

Produce all of the following:

## 1. Code changes
A working refactor across schema, runtime, UI, and tests.

## 2. Migrations
Safe migration(s) for any schema changes required.

## 3. Verification
Updated CI-safe checks preventing naming regressions and provider/worker regressions.

## 4. Tests
Comprehensive updated tests covering naming, scheduling, recovery, provider correctness, and admin validation.

## 5. Final engineering summary
At the end of the refactor, provide a concise summary of:
- what changed
- what was intentionally left untouched because it was already compliant
- migration impact
- worker/runtime risk notes
- provider/runtime follow-up recommendations

---

# Definition of done

The task is complete only when all of the following are true:

- all physical DB identifiers are lowercase snake_case
- all database-facing Prisma/model/query identifiers are snake_case
- no meaningful camelCase persistence leakage remains
- the worker flow safely recovers triggered/running work after restart
- auto-publish streams republish/publish automatically according to stream settings
- retries and orphan recovery are deterministic and bounded
- provider UI and runtime behavior are aligned with official docs
- compliant existing code remains in place
- tests and verification prevent regression

