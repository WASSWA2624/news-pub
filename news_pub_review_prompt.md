# Refactor Prompt: NewsPub Compliance-Preserving Reliability and Provider Hardening

You are a senior staff/principal engineer performing a **full production-grade refactor review and targeted implementation pass** on the attached NewsPub repository.

Your job is **not** to rewrite compliant areas. Your job is to:

1. **Preserve all already-correct database snake_case mappings and migrations as-is.**
2. **Eliminate the remaining places where runtime code still assumes old non-snake-case or compressed physical database identifiers.**
3. **Strengthen the durable background worker / scheduler architecture so triggered, running, orphaned, and auto-publish/repost work is always recoverable, resumable, observable, and idempotent.**
4. **Review every implemented news provider integration against the official provider docs and harden both UI metadata and runtime request logic without regressing working features that are already compliant.**

Do not do a superficial cleanup. Deliver a surgical, test-backed, production-safe refactor that keeps existing correct behavior and only changes what is necessary.

---

## Ground truth from the current repository

### 1) Physical Prisma schema and migrations are already snake_case and should be preserved
The repository already maps physical tables and columns to lowercase snake_case in Prisma and migrations.

Treat the following as **already compliant** and **do not rename them again unless an inconsistency is proven**:

- `prisma/schema.prisma`
- `prisma/migrations/20260405213000_newspub_init/migration.sql`
- `prisma/migrations/20260412113000_durable_worker_leases/migration.sql`
- `scripts/verify-db-snake-case.js`

The command `npm run verify:db:naming` currently passes against the shipped Prisma schema/migrations.

**Important:** the remaining database compliance problem is **not** the Prisma schema. It is the existence of **hand-written SQL and operational queries** that still reference old compressed table names and camelCase column names.

### 2) Remaining DB compliance gaps are in hand-written SQL, not Prisma mappings
Refactor all hand-written SQL and DB-adjacent utilities so that **every physical table and column reference matches the existing snake_case database**.

Known high-priority problem areas:

#### `src/features/public-site/index.js`
This file contains raw SQL that still references old physical identifiers such as:

- `posttranslation` instead of `post_translation`
- `fetchedarticle` instead of `fetched_article`
- `postcategory` instead of `post_category`
- `publishattempt` instead of `publish_attempt`
- `postId` instead of `post_id`
- `sourceArticleId` instead of `source_article_id`
- `providerCountriesJson` instead of `provider_countries_json`
- `contentMd` instead of `content_md`
- `publishedAt` instead of `published_at`
- `updatedAt` instead of `updated_at`

This means the repo is **not yet 100% compliant at runtime**, even though Prisma/migrations are compliant.

#### `scripts/cpanel-doctor.js`
This script still queries:

- `isActive` instead of `is_active`
- `passwordHash` instead of `password_hash`

That operational health check must be fixed to match the current physical schema.

#### Verification gap
`scripts/verify-db-snake-case.js` currently verifies Prisma schema mappings and migration SQL, but it does **not** scan hand-written SQL embedded in application or script files. Extend verification so CI fails when raw SQL uses stale physical identifiers.

### 3) Worker durability is partially implemented and should be extended, not replaced blindly
The repository already includes meaningful durable-worker primitives:

- lease fields on `publish_attempt` and `fetch_run`
- `next_run_at` on `publishing_stream`
- stale-run reconciliation in `src/lib/news/workflows.js`
- atomic claim patterns using `updateMany`
- scheduled queueing via `fetch_run.queue_key`
- recovery of stranded auto-publish article matches
- fallback internal polling via `scripts/internal-scheduler.js`

Preserve the good parts.

Do **not** throw away or regress the following existing mechanisms unless you replace them with something strictly better and fully test-covered:

- `reconcileStaleFetchRuns()`
- `reconcileStalePublishAttempts()`
- `recoverStrandedAutoPublishAttempts()`
- `claimFetchRunById()` / `claimNextFetchRun()`
- `claimPublishAttemptById()` / `claimNextPublishAttempt()`
- durable `queue_key` uniqueness for scheduled fetch runs

### 4) Remaining worker/scheduler gaps to close
Even though durable worker primitives exist, the architecture still needs hardening.

#### A. Auto-publish is still too inline with fetch execution
In `processFetchedArticlesForStream()` the code still creates a canonical post, creates/updates the article match, optimizes it, and then can immediately call `publishArticleMatch()` inside the fetch-run execution path.

Refactor this so that:

- fetch execution persists publishable work durably
- publish execution is handled through durable publish-attempt queue semantics
- a crash during a long fetch run cannot leave publication only partially transitioned
- the fetch path becomes a queueing/orchestration path, not an inline publication pipeline

#### B. Fetch-run leases are claimed, but not refreshed throughout long execution
The current code claims fetch-run leases and releases them on completion/failure, but long-running fetch/process/publish flows can exceed the lease duration if upstream latency, AI optimization, media handling, or downstream publication becomes slow.

Add a heartbeat/lease-refresh strategy for **fetch runs**, similar in spirit to what exists for publish attempts, so long executions do not get incorrectly recovered as stale while still alive.

#### C. Scheduler behavior should remain multi-instance-safe
Keep the API/cron-triggered scheduling pattern, but ensure the end-to-end system remains correct under:

- multiple app instances
- repeated cron invocations
- process restarts
- partial failures
- long-running publish bursts

Do not rely on process-local state for correctness.

#### D. Recovery should cover triggered/running stream work end to end
Guarantee that the following can always be recovered safely:

- stale `RUNNING` fetch runs
- stale `RUNNING` publish attempts
- article matches in `AUTO_PUBLISH` mode that were queued but never converted into publish work
- streams that became due while another process was running
- scheduled publications whose due time passed during downtime
- retryable failed publish attempts after backoff elapses

#### E. Observability and diagnostics should become first-class
Expose enough durable diagnostics so operators can answer:

- what was queued
- what was claimed
- what was recovered as orphaned/stale
- what was retried
- what was skipped and why
- whether a publish action was original publication, retry, or repost
- whether page-limit truncation or provider-limit truncation occurred upstream

### 5) Provider integrations are more advanced than older review notes imply; preserve what already works
The repository already implements more provider functionality than an older review might suggest.

**Do not remove working provider behavior that is already present and test-backed.**

Examples already present in the repo and expected to remain:

- **Mediastack:** `sources` support is already modeled in provider definitions and request building.
- **Mediastack:** offset-based pagination is already implemented in the runtime fetch loop.
- **NewsAPI:** `page` pagination is already implemented.
- **NewsAPI:** `sources` is already modeled and validated against `country` / `category` incompatibility for `top-headlines`.
- **NewsData:** `nextPage`/`page` cursor traversal is already implemented.
- **NewsData:** `latest` timeframe and `archive` from/to date handling are already modeled.
- Provider diagnostics and retry-event recording already exist.

The task is to **harden and complete**, not to re-solve already-solved problems.

### 6) Provider gaps to fix precisely

#### A. Cap request sizes at provider-safe limits inside runtime request builders
The current helper `getProviderFetchBatchSize()` returns `max(maxArticlesHint * 3, 25)`, which is reasonable as a fetch target heuristic, but the request builders do not consistently cap that value per provider.

Concrete examples:

- `buildNewsApiRequest()` uses `pageSize = getProviderFetchBatchSize(...)` directly.
- `buildNewsDataRequest()` uses `size = getProviderFetchBatchSize(...)` directly.
- `buildMediastackRequest()` already uses a provider cap helper.

Refactor request sizing so that runtime request builders enforce documented provider limits rather than relying only on UI/editor limits.

At minimum:

- hard-cap NewsAPI `pageSize` to documented limits
- cap NewsData `size` to a documented/plan-safe ceiling, with explicit configuration if plan-dependent
- preserve or improve Mediastack’s current capping logic

#### B. Add docs-aligned validation that is still missing or too implicit
Review all implemented request parameters against official docs and harden validation, including but not limited to:

- NewsAPI `sources` maximum count / format handling
- NewsAPI endpoint-specific parameter compatibility
- NewsData plan-sensitive request sizing and endpoint-specific filter rules
- Mediastack source/category/language/country include/exclude formatting
- consistent validation messages in the admin UI before execution

#### C. Make page-limit truncation explicit
The provider runtime uses a fixed `maxProviderPageCount` and target-count logic. Preserve bounded behavior, but make sure the system never silently hides that an upstream result set was truncated due to local page caps.

Add diagnostics and tests so operators can tell the difference between:

- provider exhausted
- article target reached
- page limit reached
- empty page
- duplicate cursor
- invalid response
- retry exhaustion

#### D. Expand retry/error taxonomy coverage and tests
The shared outbound fetch helper already supports timeout/retry/jitter and `Retry-After` parsing. Harden and fully test it for provider usage.

Add or improve tests for:

- `Retry-After` seconds and HTTP-date parsing
- 408 / 429 / 5xx retry behavior
- bounded retry counts
- jittered delays
- non-retryable 4xx handling
- malformed JSON / invalid response shapes
- diagnostics emitted for partial-page/provider failures

### 7) Test and verification expectations
You must leave the repo with a verification story that catches regressions.

Implement or update tests for:

#### Database naming / raw SQL
- a scanner or verifier that detects stale physical identifiers in raw SQL strings
- coverage for the `public-site` raw queries
- coverage for `cpanel-doctor` operational queries

#### Worker durability
- stale fetch-run recovery
- stale publish-attempt recovery
- heartbeat/lease refresh for long-running fetch runs
- idempotent claim behavior across concurrent claim attempts
- crash-recovery path from queued article match to publish attempt
- due stream queueing under repeated scheduler invocations
- retry scheduling/backoff behavior

#### Provider integrations
- Mediastack request building, pagination, sources, and offset progression
- NewsAPI request sizing caps, sources compatibility, and page traversal
- NewsData page cursor traversal, endpoint-specific filters, and plan-safe size behavior
- diagnostics for page-limit truncation and partial failures
- outbound fetch retry semantics

If existing tests are already correct, keep them. Only change them where behavior is intentionally improved.

### 8) Operational constraints
- Keep the public product behavior stable unless a change is required for correctness or docs compliance.
- Keep existing compliant Prisma `@map` / `@@map` mappings unless you can prove they are wrong.
- Do not regress cPanel deployment scripts.
- Do not regress manual publishing, review-required streams, repost flows, or website publishing.
- Preserve idempotency and duplicate/repost cooldown rules unless a bug demands a fix.
- Favor additive migrations when schema/runtime durability changes are required.

---

## Implementation requirements

Execute the refactor in this order:

1. **Inventory and fix stale raw SQL physical identifiers** across app code and scripts.
2. **Upgrade verification tooling** so raw SQL regressions fail CI.
3. **Refactor fetch execution to durable queue-first publication orchestration** rather than inline best-effort publication.
4. **Add fetch-run heartbeat/lease refresh** and ensure stale recovery remains safe.
5. **Harden provider request builders** with provider-specific runtime caps and docs-aligned validation.
6. **Expand provider diagnostics and retry-path test coverage.**
7. **Run/repair all impacted tests** and add missing ones.
8. **Document the final architecture changes** in concise code comments where needed.

---

## Definition of done

The work is only done when all of the following are true:

- All physical DB names remain lowercase snake_case.
- No hand-written SQL references stale compressed or camelCase physical identifiers.
- CI verifies both Prisma mappings/migrations **and** raw SQL usage.
- Scheduled, triggered, in-flight, orphaned, and retryable stream/publish work is durably recoverable.
- Auto-publish/repost execution is queue-safe and restart-safe.
- Provider request builders are docs-aligned and runtime-capped.
- Provider UI definitions and validation rules match actual runtime behavior.
- Diagnostics clearly distinguish exhaustion, truncation, retries, failures, and recoveries.
- The refactor leaves already-compliant behavior untouched wherever possible.

---

## Deliverables

Produce:

1. The code changes.
2. Any required migration(s).
3. Updated/added tests.
4. Updated verification tooling.
5. A short engineer-facing summary of:
   - what was already compliant and preserved
   - what was actually fixed
   - what architectural reliability guarantees are now provided
   - what provider limitations remain intentionally bounded by plan or upstream API constraints

