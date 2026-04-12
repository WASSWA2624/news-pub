# Expert Refactor Prompt — NewsPub Full Compliance and Worker/Provider Hardening

You are refactoring the attached NewsPub codebase.

Your job is to perform a **full, production-grade refactor** of the repository so that:

1. **All database tables and all database column names are lowercase snake_case and remain 100% compliant.**
2. **All database-facing source code is aligned with the same lowercase snake_case naming convention** instead of relying on mixed camelCase-to-snake_case mappings.
3. There is a **robust, fault-tolerant background worker flow** that reliably reschedules and completes all triggered/running stream work and auto reposts/publishes to the correct destinations based on each stream’s settings.
4. **All news API providers** are reviewed and corrected against their **official documentation**, including request shaping, validation, pagination, diagnostics, UI configuration, and failure handling.
5. **Anything that is already correctly implemented and compliant must be left unchanged.**
6. The final result must be **clean, minimal, backward-safe where possible, and fully tested**.

---

## Operating principles

- **Do not rewrite compliant code for style only.**
- **Do not introduce unrelated architectural churn.**
- **Do not remove working behaviors unless they are wrong, duplicated, or block compliance.**
- Prefer **surgical, high-confidence refactors** over broad rewrites.
- Preserve existing product behavior unless it conflicts with:
  - lowercase snake_case database/source alignment,
  - worker reliability,
  - provider correctness,
  - correctness of persistence, scheduling, or publishing.

---

## Critical context from the existing codebase

The repository already contains important foundations that must be preserved and hardened rather than replaced blindly:

- There is already a DB naming verification script.
- There is already an internal scheduler entrypoint and scheduled publishing route.
- There is already workflow logic for:
  - stream fetch execution,
  - queueing publish attempts,
  - recovering stale fetch runs,
  - recovering stale publish attempts,
  - retrying failed publish attempts,
  - draining queued work.
- There are existing provider adapters and provider UI metadata definitions for:
  - `mediastack`
  - `newsapi`
  - `newsdata`

Your task is to **complete and normalize** this system, not duplicate it.

---

# PART 1 — Full snake_case compliance across the persistence layer and source code

## Objective

Make the codebase **fully aligned** with lowercase snake_case for all database-backed identifiers.

This means the final system must not merely have snake_case physical tables/columns while the source code continues using camelCase persistence fields through ORM mappings.

## Required outcome

### A. Database layer
Ensure that all of the following are lowercase snake_case:

- table names
- column names
- join tables
- indexes where relevant naming is material
- foreign-key column names
- migration SQL identifiers
- raw SQL identifiers anywhere in the repo

### B. Source code alignment
Refactor the persistence-facing code so that snake_case is the canonical naming convention for database-backed fields throughout the app layer.

This includes, at minimum:

- Prisma model field names
- Prisma relation foreign-key fields
- Prisma query `select`, `include`, `data`, `where`, `orderBy` usages
- DTOs that represent DB-backed records
- repository/service/workflow payloads that pass DB-backed fields around
- Zod/request validation objects for DB-backed records
- admin form state and request payloads for DB-backed entities
- test fixtures and mocks for DB-backed entities
- raw SQL
- migration helpers
- seeds
- analytics/job/admin snapshot builders
- API route request/response shapes where they expose DB-backed field names internally

### C. Legacy mapping cleanup
Remove or drastically reduce ORM field `@map(...)` usage where it only exists to preserve camelCase source identifiers for snake_case DB columns.

The intended end state is:

- **snake_case in the database**
- **snake_case in Prisma/database-facing code**
- minimal compatibility adapters only where absolutely required at external boundaries

## Important exception
Do **not** rename framework-idiomatic things that are not persistence-backed purely for style reasons.

Examples:
- React component names can remain PascalCase.
- Local temporary variables can remain idiomatic if they do not represent persisted fields.
- External API contracts should only be changed when needed for correctness or internal consistency.

But any identifier that represents a database table, row, column, relation key, or persisted workflow field must become snake_case.

---

## Required audit and refactor targets

Review and refactor all relevant persistence-backed entities, including but not limited to:

- locale
- user
- admin_session
- news_provider_config
- destination
- category
- media_asset
- publishing_stream
- provider_fetch_checkpoint
- fetched_article
- post
- post_translation
- post_category
- destination_template
- article_match
- publish_attempt
- fetch_run
- optimization_cache
- audit_event
- view_event

Also inspect every persistence-backed enum usage and ensure naming and mapping are coherent.

---

## Required migration behavior

Implement this safely and deterministically:

1. Create migration(s) that normalize any remaining non-compliant table/column names.
2. Refactor Prisma schema names to snake_case.
3. Regenerate the client and update all usages.
4. Ensure seeds, runtime scripts, tests, and admin features still work.
5. Preserve data compatibility during migration.
6. Avoid destructive data loss.

If a breaking migration is unavoidable, implement:
- explicit rename migrations,
- backup-safe sequencing,
- rollback notes,
- post-migration verification.

---

## Required verification

Strengthen or extend the existing DB naming verification so CI fails if any of the following regress:

- non-snake_case table names
- non-snake_case column names
- legacy raw SQL references
- newly introduced camelCase persistence field names in schema or DB-facing query code

Add tests or static checks that prove this.

---

# PART 2 — Background worker hardening for scheduled streams and auto repost/publish

## Objective

Ensure there is a **robust worker system** that reliably handles:

- due scheduled stream fetches,
- in-progress/running stream recovery,
- stale fetch recovery,
- stale publish attempt recovery,
- stranded auto-publish recovery,
- retry scheduling,
- repost/publish execution,
- destination-specific auto publish behavior.

## Required worker guarantees

The worker flow must guarantee all of the following:

1. **If a stream is due, it gets queued exactly once per schedule window.**
2. **If a fetch run is left in `PENDING` or `RUNNING` due to crash/restart/timeout, it is recoverable.**
3. **If a publish attempt is left in `PENDING` or `RUNNING`, it is recoverable and retryable when appropriate.**
4. **If an auto-publish article match is queued/triggered but no publish attempt exists, it is recovered automatically.**
5. **If the app restarts mid-run, work is resumed safely without duplicate publication.**
6. **Destination publication must respect each individual stream’s settings.**
7. **Auto publish mode must publish automatically; review-required mode must not.**
8. **Repost-eligible duplicates must be handled intentionally and idempotently.**
9. **Worker execution must be lease-based and concurrency-safe.**
10. **No stream should be silently lost because of stale `RUNNING` state, expired leases, or missing queue recovery.**

---

## Required hardening scope

Review and improve all scheduling/worker-related logic, including but not limited to:

- internal scheduler bootstrap/startup
- protected scheduled publishing route
- due-stream enqueueing
- fetch run claiming
- fetch run lease refresh
- publish attempt claiming
- publish attempt lease refresh
- stale run reconciliation
- stale publish reconciliation
- orphan/stranded auto-publish recovery
- retry eligibility and retry scheduling
- queue idempotency
- heartbeat updates
- last-run and next-run bookkeeping
- worker observability and diagnostics
- crash/restart behavior
- destination publish execution flow
- duplicate/repost handling

---

## Required implementation details

### A. Idempotency and deduplication
Ensure idempotency is enforced for:
- scheduled fetch queueing
- publish attempt queueing
- destination publish submission
- retry creation
- repost handling

A job must not publish twice just because:
- the server restarted,
- the scheduler ran twice,
- a request timed out,
- a lease expired during a slow downstream publish.

### B. Lease ownership
Strengthen lease logic so workers can:
- claim safely,
- refresh safely,
- recover safely,
- avoid split-brain processing.

### C. Availability and schedule handling
Ensure queued work respects:
- `available_at`
- `scheduled_publish_at`
- stream interval scheduling
- next run recalculation
- manual vs scheduled trigger type
- checkpoint-aware execution windows

### D. Destination-specific behavior
Ensure publication behavior is accurate for:
- website
- Facebook page vs Facebook profile
- Instagram business vs Instagram personal
- any destination that cannot support automatic publishing

Unsupported destinations must fail clearly and safely, not appear publish-capable when they are not.

### E. Recovery semantics
Explicitly define and implement how the system handles:
- stale running fetches
- stale running publish attempts
- orphaned article matches
- failed but retryable attempts
- failed but non-retryable attempts
- suspended or paused streams
- disconnected destinations

### F. Observability
Add or improve:
- reason-coded failures
- structured diagnostics JSON
- audit events
- job logs
- retry visibility
- worker summary metrics
- admin visibility into stuck/recovered/retried work

---

## Required acceptance criteria for worker flow

The refactor is not complete until tests prove all of the following:

- due streams are enqueued once
- stale fetch runs are recovered
- stale publish attempts are recovered
- stranded auto-publish matches are recovered
- retryable failed attempts get requeued correctly
- non-retryable attempts do not loop forever
- paused streams are ignored
- disconnected or invalid destinations fail with clear diagnostics
- auto publish publishes automatically
- review-required streams do not auto publish
- repost-eligible duplicates behave deterministically
- worker restart does not create duplicate publishes

---

# PART 3 — Official-doc review and correction of all news API providers

## Objective

Review every implemented news provider against its official docs and make runtime + UI behavior correct, robust, and explicit.

Providers in scope:

- `mediastack`
- `newsapi`
- `newsdata`

## Required behavior

For each provider:

1. Validate request fields against official supported parameters.
2. Remove unsupported UI inputs and unsupported runtime parameters.
3. Add missing supported validations where needed.
4. Enforce endpoint-specific incompatibilities.
5. Correct pagination behavior.
6. Correct sorting/filter semantics.
7. Correct time-window mapping semantics.
8. Improve diagnostics for provider-specific failures.
9. Make admin UI descriptions accurate and endpoint-aware.
10. Ensure normalized article mapping is resilient to partial or missing upstream fields.

---

## Provider-specific expectations

### A. NewsAPI
Review and enforce endpoint-specific behavior for:
- `top-headlines`
- `everything`

Must include:
- `top-headlines` incompatibility rules
- `everything` date/time field handling
- `searchIn`
- `domains`
- `excludeDomains`
- `language`
- `sortBy`
- source count limits
- page/pageSize handling
- response shape validation
- article normalization quality
- diagnostics and retry behavior

### B. Mediastack
Review and enforce:
- `access_key`
- date range behavior
- categories/languages/countries behavior
- include/exclude token formatting
- pagination via offset/limit
- sorting behavior
- keyword handling
- response/pagination validation
- article normalization quality
- diagnostics and retry behavior

### C. NewsData
Review and enforce:
- `latest` vs `archive`
- `timeframe` vs `from_date` / `to_date`
- `page` / `nextPage`
- language/country/category filters
- exclude filters
- domain/source fields
- optional advanced fields
- response shape validation
- article normalization quality
- diagnostics and retry behavior

---

## Required UI corrections for provider configuration

Review and refactor admin provider/stream configuration UI so that:

- users only see fields valid for the selected provider/endpoint
- incompatible combinations are prevented before save
- invalid combinations are also guarded at runtime server-side
- helper text reflects real provider behavior
- endpoint-specific window controls are accurate
- field labels match provider docs terminology where appropriate
- provider validation issues are surfaced clearly in admin UX

Do not leave correctness solely to UI gating; enforce it server-side too.

---

# PART 4 — Code quality, consistency, and backward safety

## Required cleanup

- Remove dead code created by the migration/refactor.
- Remove obsolete camelCase compatibility shims once no longer needed.
- Normalize naming consistently across:
  - features
  - lib
  - scripts
  - API routes
  - tests
  - admin UI
- Keep public behavior stable unless a change is required for correctness.

## Required compatibility strategy

Where renames are large, do this carefully:
- migrate schema first,
- update generated client,
- update DB query code,
- update services/features,
- update API handlers,
- update UI,
- update tests,
- then remove temporary compatibility layers.

---

# PART 5 — Files and areas that must be reviewed

At minimum, review and refactor these areas thoroughly:

## Database / migrations / scripts
- `prisma/schema.prisma`
- `prisma/seed.js`
- `scripts/verify-db-snake-case.js`
- `scripts/cpanel-db-deploy.js`
- `scripts/cpanel-db-utils.js`
- any migrations under `prisma/migrations`
- any raw SQL in `scripts/**` and `src/**`

## Scheduler / worker / jobs
- `scripts/internal-scheduler.js`
- `scripts/start-standalone.js`
- `src/app/api/jobs/route.js`
- `src/app/api/jobs/scheduled-publishing/route.js`
- `src/app/api/streams/run/route.js`
- `src/lib/news/workflows.js`
- `src/lib/news/publishers.js`
- `src/lib/news/destination-runtime.js`

## Providers
- `src/lib/news/providers.js`
- `src/lib/news/provider-definitions.js`
- `src/lib/news/outbound-fetch.js`
- `src/lib/news/shared-fetch.js`
- `src/lib/news/fetch-window.js`

## Admin/provider/stream UI
- `src/app/admin/providers/page.js`
- `src/app/admin/streams/page.js`
- `src/components/admin/provider-filter-fields.js`
- `src/components/admin/provider-form-card.js`
- `src/components/admin/stream-form-card.js`
- `src/components/admin/stream-management-screen.js`
- related helpers/tests

## Tests
- all existing provider, stream, workflow, scheduler, and naming tests
- add missing regression coverage

---

# PART 6 — Required deliverables

Produce all of the following in the refactor:

## 1. Working code changes
Implement the refactor completely.

## 2. Migration(s)
Add any required DB migrations.

## 3. Verification
Update or add checks so CI can catch regressions.

## 4. Tests
Add or update comprehensive tests covering:
- snake_case persistence alignment
- scheduler recovery
- worker idempotency
- provider parameter validation
- provider pagination behavior
- endpoint incompatibility guards
- destination publish recovery and retries

## 5. Final engineering summary
At the end, provide a concise summary covering:
- what was changed
- what was intentionally left unchanged because it was already compliant
- migration impact
- risk notes
- follow-up recommendations, if any

---

# Definition of done

The task is complete only when all of the following are true:

- physical DB identifiers are lowercase snake_case
- database-facing source identifiers are aligned to snake_case
- no important camelCase persistence-field leakage remains
- migrations are safe and deterministic
- scheduled/running stream work is robustly recoverable
- auto publish/repost behavior is reliable and idempotent
- providers match official docs and endpoint rules
- admin UI reflects real provider capabilities
- tests cover the critical paths
- existing compliant code is preserved
- the repo is cleaner, not noisier, after the refactor

---

# Execution instructions

Proceed in this order:

1. Audit current compliance and enumerate only the actual gaps.
2. Refactor the persistence layer to canonical snake_case.
3. Update all DB-facing source code accordingly.
4. Harden worker/recovery/idempotency flows.
5. Correct provider runtime and UI behavior against official docs.
6. Add migrations, tests, and verification.
7. Remove obsolete compatibility code.
8. Deliver a final summary with exact changes and anything intentionally preserved.

Be strict, production-minded, and minimal: **fix what is wrong, preserve what is already right.**