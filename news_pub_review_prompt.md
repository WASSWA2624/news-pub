# Refactor Prompt: NewsPub Full Reliability + Database Naming Compliance Overhaul

You are a senior staff/principal engineer performing a **full-codebase refactor** of the attached NewsPub repository. Work like a production-focused architect and implementer, not like a superficial formatter.

Your mission is to refactor the entire codebase so that it is:

1. **100% compliant with lowercase snake_case database naming** for **all database tables and all database columns**.
2. Equipped with a **durable, restart-safe, multi-instance-safe background worker** that reliably resumes and completes all scheduled, triggered, and in-flight stream work, including **auto-publish / auto-repost flows** according to each stream’s configuration.
3. Updated so that **all implemented news provider integrations are re-reviewed and hardened against the current official provider documentation**, including request construction, pagination, validation, retries, rate-limit behavior, and normalization robustness.

Do not stop at a partial patch. Treat this as a **systemic refactor** with schema, runtime, scheduling, provider integration, tests, scripts, and operational tooling all brought into alignment.

---

## Repository-specific findings you must treat as ground truth

### 1) Database naming is not snake_case compliant today
The current Prisma/database layer uses lowercase table names, but many multi-word tables are compressed instead of snake_case, and a large number of columns are camelCase.

Examples of current non-compliant multi-word table names that must be renamed:

- `adminsession` -> `admin_session`
- `newsproviderconfig` -> `news_provider_config`
- `mediaasset` -> `media_asset`
- `mediavariant` -> `media_variant`
- `fetchedarticle` -> `fetched_article`
- `posttranslation` -> `post_translation`
- `providerfetchcheckpoint` -> `provider_fetch_checkpoint`
- `publishingstream` -> `publishing_stream`
- `articlematch` -> `article_match`
- `optimizationcache` -> `optimization_cache`
- `destinationtemplate` -> `destination_template`
- `seorecord` -> `seo_record`
- `viewevent` -> `view_event`
- `webvitalmetric` -> `web_vital_metric`
- `auditevent` -> `audit_event`
- `postcategory` -> `post_category`
- `streamcategory` -> `stream_category`
- `publishattempt` -> `publish_attempt`
- `fetchrun` -> `fetch_run`

Single-word table names that already comply can remain as-is only if they are genuinely single-word entities, for example: `locale`, `user`, `post`, `category`, `destination`.

Examples of current non-compliant column names that must be converted to snake_case at the database level:

- `createdAt` -> `created_at`
- `updatedAt` -> `updated_at`
- `passwordHash` -> `password_hash`
- `userId` -> `user_id`
- `providerKey` -> `provider_key`
- `baseUrl` -> `base_url`
- `requestDefaultsJson` -> `request_defaults_json`
- `accountHandle` -> `account_handle`
- `externalAccountId` -> `external_account_id`
- `connectionStatus` -> `connection_status`
- `encryptedTokenCiphertext` -> `encrypted_token_ciphertext`
- `lastCheckedAt` -> `last_checked_at`
- `fileSizeBytes` -> `file_size_bytes`
- `sourceUrl` -> `source_url`
- `mimeType` -> `mime_type`
- `featuredMediaId` -> `featured_media_id`
- `providerArticleId` -> `provider_article_id`
- `dedupeFingerprint` -> `dedupe_fingerprint`
- `publishedAt` -> `published_at`
- `scheduledPublishAt` -> `scheduled_publish_at`
- `scheduleIntervalMinutes` -> `schedule_interval_minutes`
- `retryBackoffMinutes` -> `retry_backoff_minutes`
- `lastRunStartedAt` -> `last_run_started_at`
- `lastRunCompletedAt` -> `last_run_completed_at`
- `lastFailureAt` -> `last_failure_at`
- `optimizationCacheId` -> `optimization_cache_id`
- `optimizedPayloadJson` -> `optimized_payload_json`
- `readinessChecksJson` -> `readiness_checks_json`
- `duplicateOfMatchId` -> `duplicate_of_match_id`
- `attemptNumber` -> `attempt_number`
- `idempotencyKey` -> `idempotency_key`
- `payloadJson` -> `payload_json`
- `responseJson` -> `response_json`
- `diagnosticsJson` -> `diagnostics_json`
- `providerCursorBeforeJson` -> `provider_cursor_before_json`
- `providerCursorAfterJson` -> `provider_cursor_after_json`
- `executionDetailsJson` -> `execution_details_json`

Assume there are many more. You must produce and apply the **complete mapping** for every model field persisted to the database.

### 2) Worker/scheduler reliability is not strong enough today
Current scheduling and execution logic is centered around files such as:

- `src/lib/news/workflows.js`
- `scripts/internal-scheduler.js`
- `src/app/api/jobs/scheduled-publishing/route.js`
- `src/features/streams/index.js`

The current implementation has these architectural weaknesses:

- It relies heavily on timestamp-based “in progress” inference (`lastRunStartedAt` compared with completion/failure timestamps) instead of durable job claiming and recovery.
- `runScheduledStreams()` processes due streams, pending scheduled publish attempts, and retryable failed attempts, but it does **not** robustly recover stale/orphaned `RUNNING` work after a crash/restart.
- Publish attempts can be marked `RUNNING`, but there is no full stale-lease reconciliation loop that safely returns abandoned work to a resumable state.
- Stream execution state is too process-local and not durable enough for multi-instance or crash-recovery behavior.
- Internal polling via `scripts/internal-scheduler.js` is a fallback, not a true durable worker/orchestrator.
- Auto-publish currently happens too directly in the fetch flow; it must become durable queue/worker behavior so a process crash cannot strand eligible stories.

### 3) Provider integrations need a full docs-alignment and robustness pass
Current provider code is mainly in:

- `src/lib/news/providers.js`
- `src/lib/news/provider-definitions.js`
- `src/lib/news/outbound-fetch.js`

Treat the following as concrete gaps to address:

#### Mediastack
- The implementation currently builds requests using `countries`, `languages`, `categories`, `keywords`, `date`, `sort`, and `limit`, but it does **not** fully implement durable pagination via `offset`.
- The official docs support source filtering via `sources`; the adapter currently does not expose/implement that request capability.
- Pagination metadata is returned, but the implementation is effectively single-request rather than a robust paginated fetch loop.

#### NewsAPI
- The implementation supports only part of the documented request surface.
- The official docs support `page` pagination for both `everything` and `top-headlines`; current behavior is effectively first-page only.
- The official docs support `sources` (including a documented incompatibility with `country` / `category` on `top-headlines`); the current adapter/definitions do not model this fully.
- Everything/top-headlines validation must align with documented compatibility rules while keeping product guardrails explicit and test-covered.

#### NewsData
- The implementation supports `page` cursor usage only in a limited way and needs a more durable paginated fetch strategy.
- The official docs expose `nextPage` / `page` traversal, endpoint-specific date/time controls, and a broader set of filters than are currently enforced end-to-end.
- Archive/latest behaviors must remain endpoint-correct and test-covered, including incompatibilities such as include-category vs exclude-category combinations.

#### Shared provider client concerns
- Retries exist, but the outbound fetch utility is still too generic for production-grade provider robustness.
- Add provider-aware handling for rate limits, `Retry-After` when available, bounded retry policies, jitter, better error taxonomy, and better pagination/partial-failure diagnostics.
- Do not silently drop extra pages of provider results when the upstream result set is larger than one page and the stream configuration indicates more articles may be relevant.

---

## Non-negotiable outcomes

### A. Database compliance
Refactor the codebase so that **every physical database table name and every physical database column name** is lowercase snake_case.

That includes:

- Prisma model-to-table mappings
- Prisma field-to-column mappings
- Migration SQL
- Foreign keys
- indexes / unique indexes / fulltext indexes / join tables
- raw SQL scripts
- cPanel deployment scripts
- doctor/verification scripts
- seeds
- tests
- any naming assumptions in analytics, admin tools, and operational scripts

It is acceptable to keep application-layer JavaScript/TypeScript property names camelCase **only if** the physical database names are explicitly mapped with Prisma `@map` / `@@map` and the result is fully verified. It is also acceptable to rename application-layer fields if you choose a broader consistency refactor. What is **not** acceptable is leaving any physical DB table/column in camelCase or compressed multi-word lowercase.

### B. Background worker durability
Implement a durable background execution architecture so that:

- due streams are detected and claimed atomically
- only one worker instance claims a given executable unit at a time
- in-flight work uses **leases/heartbeats** or equivalent durable ownership semantics
- stale/incomplete work is re-queued or safely resumed after crash/restart
- pending scheduled publications are not stranded
- stale `RUNNING` publish attempts are recovered
- stale `RUNNING` / `PENDING` fetch runs are reconciled
- AUTO_PUBLISH streams always transition eligible content into durable publish work
- duplicate/repost-eligible logic continues to work correctly
- retries are bounded, observable, and idempotent
- the system is safe under multiple app instances / cron invocations / restarts

### C. Provider compliance and robustness
Rework provider integrations to be:

- aligned with the current official docs for implemented endpoints
- explicit about supported vs intentionally unsupported parameters
- strict about parameter compatibility rules
- resilient under pagination, partial results, rate limits, transient failures, and malformed payloads
- fully tested
- instrumented with better diagnostics so operators can see what was requested, what page/cursor was used, why pagination stopped, and what retry behavior occurred

---

## Required implementation workstreams

## 1. Build a full database naming migration plan

Do not do ad-hoc renames. First generate a complete canonical mapping matrix:

- current model name -> target table name
- current persisted field name -> target column name
- current index / constraint / FK names -> target snake_case names where relevant
- current join-table names -> target snake_case names

Then implement a safe migration strategy that:

- preserves all existing data
- preserves referential integrity throughout the migration
- updates Prisma schema mappings correctly
- updates all generated client assumptions
- works from a clean install and from an existing populated DB
- is deterministic and repeatable

Prefer a migration sequence that is production-safe and explicit. Do not leave “temporary” mixed naming in place.

Also update operational tooling that currently hardcodes old table names, especially:

- cPanel table normalization utilities
- DB doctor checks
- migration verification logic
- seeding / deploy scripts

## 2. Refactor fetch/publish execution into a durable job model

You may extend existing tables or introduce dedicated execution tables if needed, but the final design must be durable and easy to reason about.

At minimum, implement durable handling for:

- scheduled stream fetch execution
- queued publish execution
- automated retries
- stale execution recovery
- reconciliation after restart

A strong solution should include concepts like:

- `next_run_at`
- `available_at`
- `lease_owner`
- `lease_expires_at`
- `heartbeat_at`
- `attempt_count`
- `last_error_at`
- `last_error_code`
- `last_error_message`
- `orphaned_at` / reconciliation markers

Use transactions and uniqueness/idempotency safeguards so that repeated scheduler invocations cannot duplicate the same work.

## 3. Separate orchestration concerns cleanly

Refactor the current all-in-one scheduling behavior into clearer phases such as:

1. **Scheduler / reconciler pass**
   - discovers due work
   - reconciles stale work
   - enqueues or re-enqueues executable items

2. **Fetch worker**
   - claims a stream execution unit
   - runs provider fetches
   - persists article matches deterministically
   - enqueues publish work for AUTO_PUBLISH streams instead of relying on fragile inline execution

3. **Publish worker**
   - claims publish attempts
   - performs destination publication
   - heartbeats while running
   - marks success/failure/retry schedule atomically

4. **Recovery loop**
   - finds stale `RUNNING` items and safely returns them to a recoverable state
   - repairs orphaned article matches / queued work if a crash happened mid-flight

The public admin/manual APIs can still trigger work, but they should do so by creating durable execution records, not by relying only on long in-request execution chains.

## 4. Preserve and harden stream-specific behavior

Preserve existing product behavior while making it durable:

- `AUTO_PUBLISH` vs `REVIEW_REQUIRED`
- per-stream retry limits
- per-stream retry backoff
- per-stream duplicate window rules
- per-stream max posts per run
- per-stream destination restrictions
- scheduling intervals and any future schedule-expression support
- checkpoint behavior for providers
- manual repost and automated repost-eligible duplicate handling

Important: AUTO_PUBLISH streams must always publish according to their configured destination and stream settings even after app restarts, worker crashes, or overlapping scheduler invocations.

## 5. Perform a provider-by-provider docs audit and refactor

For each implemented provider, do the following:

### Mediastack
- Re-check the live/historical request contract.
- Support documented request fields that the product intends to expose, including `sources` if appropriate.
- Implement true pagination using `limit` + `offset` when needed.
- Stop paginating only when one of the following is true:
  - upstream has no more results
  - downstream stream/run limits are satisfied
  - a documented provider cap is reached intentionally and logged
- Persist enough execution diagnostics to show page/offset progression.

### NewsAPI
- Re-check `everything` and `top-headlines` against official docs.
- Implement documented pagination using `page` + `pageSize` where appropriate.
- Model/support `sources` where the product should support it.
- Enforce documented compatibility rules, especially `sources` vs `country/category` for top-headlines.
- Keep explicit product-level guardrails separate from official API validation so operators can distinguish “provider limitation” from “NewsPub product policy”.

### NewsData
- Re-check `latest` and `archive` against official docs.
- Harden `page` / `nextPage` traversal.
- Ensure endpoint-specific time boundary behavior is correct and explicit.
- Preserve and test incompatibility validation like category vs exclude-category.
- Decide which advanced documented fields NewsPub officially supports, then either:
  - implement them properly end-to-end, or
  - explicitly mark them unsupported and remove misleading definitions.

### Shared provider client
Refactor the shared provider client and fetch utilities to include:

- rate-limit-aware retry behavior
- `Retry-After` support when provided
- exponential backoff with jitter
- max retry ceilings by provider/endpoint
- robust timeout handling
- structured provider error classification
- structured pagination diagnostics
- response-shape validation with actionable operator messages
- defensive normalization when optional fields are missing or malformed

## 6. Tighten destination publish durability

Harden the publish path so that publish attempts are durable before external calls begin.

Requirements:

- claim/lease publish attempts before execution
- heartbeat long-running attempts
- safely recover attempts left in `RUNNING`
- never lose a ready-to-publish item because a process died mid-request
- use idempotency consistently when retrying or re-queuing
- distinguish permanent failures from transient failures cleanly
- keep audit/event history coherent after retries and recovery

Do not let a stale `RUNNING` attempt block a post forever.

## 7. Add reconciliation logic for stranded states

Implement a reconciliation subsystem that can repair these scenarios:

- stream marked effectively “running” only because timestamps were updated before crash
- fetch run created but never finalized
- article matches created but publish attempts not enqueued due to crash
- publish attempt set to `RUNNING` but never completed
- scheduled publish time already passed but the pending attempt was missed
- retryable failed attempt whose retry time has arrived but was skipped during downtime

This reconciler must be safe, idempotent, and test-covered.

## 8. Update observability and operator tooling

Improve job and provider diagnostics so operators can answer:

- what stream/job is currently claimed
- who/what claimed it
- when the lease expires
- what page/cursor was last fetched
- why pagination stopped
- why a retry was or was not scheduled
- whether an item was recovered from a stale/orphaned state
- whether a failure is transient, validation-related, destination-related, provider-related, or policy-related

Update admin/job snapshots as necessary so the UI remains truthful.

## 9. Expand automated test coverage substantially

Add or update tests for all of the following:

### Database naming compliance
- Prisma schema maps all physical tables to snake_case.
- Prisma schema maps all physical columns to snake_case.
- Migration SQL produces only snake_case table/column names.
- A verification test/script fails if any physical table or column name is not lowercase snake_case.

### Worker reliability
- due streams are enqueued once
- concurrent scheduler runs do not double-claim work
- stale leases are recovered
- stale `RUNNING` publish attempts are recovered
- AUTO_PUBLISH streams still publish after simulated crash/restart
- retry backoff and retry-limit behavior remain correct
- scheduled publish attempts fire after downtime recovery

### Provider tests
- request builders match documented parameter names per endpoint
- incompatible parameter combinations are rejected correctly
- paginated fetch loops continue correctly and stop correctly
- rate-limit and transient-failure behavior is correct
- malformed provider payloads fail safely with actionable errors
- normalization remains deterministic

### End-to-end / integration-level tests
- stream fetch -> article match -> queue -> publish succeeds for AUTO_PUBLISH
- crash during fetch/publish can be recovered by reconciliation pass
- duplicate/repost-eligible paths still behave correctly
- cPanel deploy/doctor scripts reflect the new snake_case schema names

## 10. Add a hard compliance verification step

Create a CI-safe verification step that fails the build if:

- any physical table name is not lowercase snake_case
- any physical column name is not lowercase snake_case
- any migration introduces a non-compliant DB name
- any required worker recovery invariant is broken by tests

This check must be automated, not manual.

---

## Files that are definitely in scope

At minimum, inspect and update all relevant code in these areas:

- `prisma/schema.prisma`
- `prisma/migrations/**`
- `prisma/seed.js`
- `scripts/cpanel-db-utils.js`
- `scripts/cpanel-doctor.js`
- `scripts/cpanel-db-deploy.js`
- `scripts/internal-scheduler.js`
- `src/lib/news/workflows.js`
- `src/lib/news/providers.js`
- `src/lib/news/provider-definitions.js`
- `src/lib/news/outbound-fetch.js`
- `src/features/streams/**`
- `src/features/posts/**`
- `src/features/analytics/**`
- `src/app/api/jobs/**`
- any tests affected by schema name or job lifecycle changes

Search for all raw string references to current table names and current camelCase DB column names.

---

## Implementation standards

- Prefer explicitness over magic.
- Prefer durable database-backed coordination over in-memory flags.
- Use transactions where state transitions must be atomic.
- Make every retry / requeue / recovery path idempotent.
- Keep backward migration/upgrade safety in mind.
- Avoid hidden behavior changes in editorial logic.
- Do not leave TODOs for core correctness items.
- Do not claim completion until all tests pass and all DB naming checks pass.

---

## Deliverables required from this refactor

1. Updated codebase
2. Updated Prisma schema and migrations
3. Updated worker/scheduler/reconciliation flow
4. Updated provider adapters and validations
5. Updated operational scripts
6. New/updated automated tests
7. A concise implementation report that includes:
   - what schema names changed
   - what worker model changed
   - what provider behaviors changed
   - what compatibility risks were handled
   - what verification steps prove 100% snake_case DB compliance

---

## Final acceptance checklist

The refactor is complete only if all of the following are true:

- [ ] Every physical database table name is lowercase snake_case.
- [ ] Every physical database column name is lowercase snake_case.
- [ ] Existing data can be migrated safely.
- [ ] AUTO_PUBLISH streams are durable across restart/crash.
- [ ] Stale `RUNNING` stream work is recoverable.
- [ ] Stale `RUNNING` publish attempts are recoverable.
- [ ] Scheduled publish attempts are never silently stranded.
- [ ] Retry behavior is durable and observable.
- [ ] Mediastack integration is aligned with current official docs and paginated robustly.
- [ ] NewsAPI integration is aligned with current official docs and paginated robustly.
- [ ] NewsData integration is aligned with current official docs and paginated robustly.
- [ ] Provider validation rules are explicit and test-covered.
- [ ] cPanel/doctor/deploy scripts reflect the new schema names.
- [ ] CI contains an automated snake_case DB compliance guard.
- [ ] All impacted tests pass.

---

## Execution instruction

Proceed with a **deep, end-to-end refactor**, not a localized patch. Wherever the current architecture makes the requirements impossible to satisfy reliably, redesign that part of the system.

Be decisive, production-minded, and exhaustive.
