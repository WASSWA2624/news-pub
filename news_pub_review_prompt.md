# NewsPub full-codebase refactor prompt

You are refactoring the attached NewsPub codebase.

## Objective

Perform a **full, repository-wide refactor** that achieves the following outcomes with **100% compliance**:

1. **All database tables and database column names are lowercase `snake_case`.**
2. **All database-facing source code is aligned with that naming convention.**
3. There is a **robust background worker** that can safely recover and reschedule **all triggered/running stream work** and continue to **auto repost / auto publish** to the correct destinations according to each stream's settings.
4. **All news API provider integrations** are reviewed against their **official documentation** and corrected for **request correctness, response normalization correctness, UI correctness, and operational robustness**.
5. **Anything already implemented and compliant must be left as is.** Avoid churn.

Do not do a superficial pass. This is a correctness-driven refactor.

---

## High-confidence findings from the current code review

Treat these as starting facts for the refactor plan:

### 1) Database naming is already largely compliant

The current codebase already appears to have a strong snake_case baseline for database tables/columns and DB-facing query identifiers.

- Prisma schema tables are mapped to lowercase snake_case tables.
- Prisma column fields are already snake_case.
- Raw migration SQL is already snake_case.
- The repo already includes a verifier: `scripts/verify-db-snake-case.js`.
- The current verifier passes in this snapshot.

**Implication:** do **not** do unnecessary DB renames. Preserve compliant schema, migration, and query naming. Only fix real violations.

### 2) The worker already has solid durability primitives — extend them, do not rewrite them blindly

The codebase already contains meaningful worker/runtime durability pieces in:

- `src/lib/news/workflows.js`
- `src/lib/news/worker-runtime.js`
- `src/app/api/jobs/scheduled-publishing/route.js`
- `scripts/internal-scheduler.js`

Existing foundations already include:

- stale `fetch_run` recovery
- stale `publish_attempt` recovery
- orphaned auto-publish attempt recovery
- lease ownership / lease expiry / heartbeats
- queue draining for both fetch and publish work
- retry scheduling for failed publish attempts
- cycle coalescing in the worker runtime

**Implication:** preserve these durable primitives and harden gaps around startup recovery, stream-orphan recovery, idempotency, and end-to-end restart safety. Do not replace proven mechanisms unless strictly necessary.

### 3) NewsAPI integration has at least two confirmed contract mismatches and one UX/capability mismatch

These are mandatory fixes:

#### Confirmed mismatch A — wrong response field normalization

In `src/lib/news/providers.js`, NewsAPI article normalization currently reads `article.published_at`.

The official NewsAPI article response field is **`publishedAt`**, not `published_at`.

**Required fix:** normalize from the official field name and update all related fixtures/tests accordingly.

#### Confirmed mismatch B — wrong `sortBy` enum value

In `src/lib/news/provider-definitions.js`, the NewsAPI sort option uses `published_at`.

The official NewsAPI `sortBy` value is **`publishedAt`**, not `published_at`.

**Required fix:** correct the option value, all validation, all request builders, all persisted defaults, and all tests/fixtures.

#### Confirmed mismatch C — source catalog is overstated for NewsAPI Everything

The code treats the NewsAPI sources catalog as reusable for Everything requests.

The official NewsAPI sources endpoint is `/v2/top-headlines/sources` and is documented as returning the subset of publishers available for **Top Headlines**.

**Required fix:** do one of the following explicitly and consistently:

- either scope the source-catalog UX to `top-headlines` only,
- or clearly label it as a **Top Headlines subset** and avoid representing it as the authoritative universe for Everything source IDs,
- or add a separate documented strategy for Everything-compatible source handling.

Do not leave the current ambiguous behavior in place.

### 4) External API boundary naming must follow provider docs, not the DB convention

This is critical:

- **Database identifiers** must be lowercase snake_case.
- **External provider request/response contracts** must use the **provider’s official documented casing and parameter names**.

Do **not** force provider payloads into snake_case at the API boundary. Instead, normalize them cleanly inside adapters.

---

## Non-negotiable implementation rules

1. **Leave compliant code untouched** unless a change is required to support a broader invariant.
2. **Do not rename already-correct tables or columns.**
3. **Do not create schema churn** just to make naming “more consistent” if it is already compliant.
4. **Keep DB naming and provider contract naming separate.**
5. **Use targeted migrations only when a real DB naming violation exists.**
6. **Preserve behavior where it is already correct and documented.**
7. **Prefer additive hardening over destructive rewrites** for worker/runtime internals.
8. **Every bug fix must be accompanied by tests.**
9. **Every changed provider capability must be validated against official docs.**
10. **Do not leave hidden compatibility shims that keep writing legacy DB identifiers.** If legacy support is needed, isolate it and document it.

---

## Required workstreams

## Workstream 1 — full database naming audit and compliance enforcement

Perform a full repository audit of every database-facing surface:

- `prisma/schema.prisma`
- all Prisma migrations under `prisma/migrations/**`
- seeds
- scripts
- raw SQL
- Prisma selects/includes/orderBy/groupBy/upsert/where usage
- DB-facing API handlers
- admin actions
- worker code
- tests and fixtures that assert DB field names

### Enforce these invariants

- All table names are lowercase snake_case.
- All column names are lowercase snake_case.
- All raw SQL identifiers are lowercase snake_case.
- All DB-facing request/response payloads internal to the application use snake_case when they are direct representations of persisted columns.
- No runtime query path references legacy camelCase table or column identifiers.

### Important nuance

Do **not** waste time renaming purely presentational React local state or UI-only variables that are not DB-facing.

However, any symbol that is a **direct persisted-field representation**, a **raw SQL identifier**, a **migration identifier**, a **Prisma field representing a DB column**, or a **database-facing internal payload** must follow snake_case.

### Deliverables for this workstream

- Fix only real violations.
- Keep existing compliant schema/migration/query naming intact.
- Strengthen `scripts/verify-db-snake-case.js` if it misses any real violation class.
- Add or extend tests so future regressions fail loudly.

---

## Workstream 2 — align all DB-facing source code with the canonical naming model

Refactor source code so the persistence layer has a single canonical naming strategy.

### Required outcomes

- No mixed DB identifier conventions inside persistence logic.
- No camelCase shadow aliases for DB columns unless there is an explicit adapter boundary with a strong reason.
- No mismatched serializer/deserializer field names for persisted entities.
- No tests that accidentally hide contract bugs by using the wrong shape.

### Specific actions

- Audit repository-wide for DB-shaped objects that drift from persisted field names.
- Collapse duplicate naming representations where safe.
- If a transformation layer is required, make it explicit and one-way:
  - provider/API payload -> adapter normalization -> internal canonical shape
  - internal canonical shape -> DB persistence
- Update fixtures so they reflect **real upstream payloads** and **real internal canonical shapes** rather than a hybrid that masks defects.

### Preserve

- Existing Prisma model/table mappings that are already correct.
- Existing snake_case persisted fields.

---

## Workstream 3 — harden the background worker so restart/recovery is truly safe

Treat this as a production-grade reliability refactor, not just a cron cleanup.

### Goal

Ensure that **all triggered/running work is recoverable** and that streams in `AUTO_PUBLISH` mode can continue to completion after interruption, including **reposts** when allowed by stream rules.

### Preserve and extend existing primitives

Build on the current queue/lease/recovery system already present around:

- `fetch_run`
- `publish_attempt`
- stream scheduling
- publish retries
- orphan recovery
- worker cycle coalescing

### Required invariants

1. A process restart must not permanently strand stream work.
2. A process restart must not cause duplicate publication.
3. A stream that was triggered but not fully completed must become recoverable through canonical queue state.
4. `AUTO_PUBLISH` streams must resume publication work after recovery.
5. Repost-eligible duplicate flows must remain recoverable and idempotent.
6. Scheduled publication must honor destination/platform-specific behavior and each stream’s settings.
7. Lease expiry and heartbeat recovery must converge back to exactly-once-effective behavior as much as possible.
8. Manual admin re-triggering must not race unsafely with cron-triggered worker cycles.

### Required refactor tasks

- Audit all code paths where a stream can be considered “triggered”, “running”, “queued”, “scheduled”, “retryable”, or “recoverable”.
- Ensure the **source of truth** for in-flight work is queue-backed and recoverable.
- Add explicit recovery for any orphaned stream-execution state where the stream looks in-progress but no valid queued/running `fetch_run` remains.
- Ensure `last_run_started_at`, `last_run_completed_at`, `last_failure_at`, `next_run_at`, queue rows, and retry rows cannot drift into a permanently blocking state.
- Ensure stranded scheduled publications and stranded repost flows are recreated deterministically.
- Audit idempotency keys and retry flows so restart recovery cannot silently double-publish.
- Ensure worker startup recovery and periodic recovery are both correct.
- Keep the scheduler/worker separation clear: scheduler enqueues, worker claims, executes, heartbeats, finalizes, and recovers.

### Required tests

Add integration-style tests that simulate at least:

- crash during fetch run after `last_run_started_at` is set
- crash during publish attempt after queue claim
- crash after article match queued but before publish attempt creation finalizes
- worker restart with stale leases
- repeated worker cycles with no duplicate publishes
- `AUTO_PUBLISH` restart recovery to website destination
- `AUTO_PUBLISH` restart recovery to social destination
- repost-eligible duplicate recovery after interruption
- scheduled publish due in the future, then due now, then recovered after restart

### Definition of success for this workstream

After simulated interruption, the system resumes through canonical queue state and completes safely without manual database repair.

---

## Workstream 4 — provider-by-provider official-doc review and corrections

Review every provider integration against official docs and correct both the data plane and the admin UX.

Current supported providers include at least:

- Mediastack
- NewsData
- NewsAPI

### General provider requirements

For each provider, verify and correct all of the following:

- base endpoint URLs
- endpoint-specific capability modeling
- request parameter names and casing
- allowed enum values
- incompatible parameter combinations
- max page/pageSize/request-size rules
- date/time parameter formats
- pagination/cursor handling
- response field names and nesting
- source catalog support and limitations
- normalization of article fields into the internal canonical article shape
- error handling
- empty-state handling
- rate-limit/temporary failure handling
- UI hints, validation, and capability messaging

### Provider-specific requirements

#### Mediastack

Keep the current implementation where it is already compliant.

Validate and preserve/fix only as needed:

- `/v1/news`
- `/v1/sources`
- `access_key`
- `sources`, `categories`, `countries`, `languages`, `keywords`, `sort`, `date`
- inclusion/exclusion semantics using `-` prefixes where documented
- source-catalog search behavior
- source-catalog UI requirement for query-driven search

#### NewsData

Keep the current implementation where it is already compliant.

Validate and preserve/fix only as needed:

- `latest` vs `archive`
- `timeframe`
- `from_date` / `to_date`
- `nextPage`
- `pubDate`
- request parameter names and casing
- `removeduplicate`
- `prioritydomain`
- `full_content`
- `image`
- `video`
- supported filter fields shown in the UI
- endpoint-specific capability messaging in the UI

#### NewsAPI

This provider requires mandatory corrections.

##### Mandatory fixes

1. Replace all incorrect use of `published_at` at the upstream response boundary with the official `publishedAt` field.
2. Replace all incorrect `sortBy=published_at` usage with the official `sortBy=publishedAt` value.
3. Update provider definitions, request builders, validation logic, defaults, forms, tests, fixtures, and any persisted provider defaults that rely on the wrong value.
4. Correct source-catalog UX so it does not overclaim authority for Everything requests.
5. Ensure test fixtures use official NewsAPI response shapes.

##### Also verify

- `top-headlines` parameter compatibility (`sources` cannot be mixed with `country`/`category`)
- `everything` max 20 `sources`
- `searchIn`
- `domains` / `excludeDomains`
- ISO 8601 handling for `from` / `to`
- source endpoint limitations and UI language around them

---

## Workstream 5 — UI and admin configuration robustness

The provider/admin UI must be technically correct, not just visually present.

### Required outcomes

- Provider forms only expose documented options for the selected provider and endpoint.
- Invalid combinations are blocked before save.
- Empty states, credential-missing states, unsupported-source-catalog states, and API error states are handled clearly.
- The UI must not imply a provider capability that the provider docs do not guarantee.
- Provider source suggestions must reflect documented scope limitations.
- Persisted provider defaults must remain valid after the refactor.

### Specific requirements

- Fix any provider labels, capability summaries, or helper text that are inaccurate relative to official docs.
- Ensure the source-catalog UX clearly communicates when it is query-driven, prefetch-driven, unsupported, partial, or endpoint-scoped.
- Ensure request-default reset flows remain deterministic.
- Ensure stream-level overrides merge cleanly with provider-level defaults after any corrections.

---

## Workstream 6 — tests, fixtures, and regression gates

Strengthen regression coverage so these issues do not recur.

### Mandatory additions

- Update provider fixtures to match official upstream payload casing exactly.
- Add regression tests for NewsAPI `publishedAt` normalization.
- Add regression tests for NewsAPI `sortBy=publishedAt`.
- Add regression tests for source-catalog capability messaging for NewsAPI Everything vs Top Headlines.
- Keep and strengthen DB naming verification.
- Add worker recovery/restart tests covering fetch, publish, retry, schedule, and repost flows.

### CI expectations

At minimum, the final state should make these checks meaningful and passing:

- DB naming verification
- provider unit tests
- worker recovery tests
- route/API tests impacted by provider changes

---

## Deliverables

Produce the refactor as a complete engineering change set with:

1. Updated source code
2. Any necessary migration(s) only if a real schema violation exists
3. Updated provider definitions and request builders
4. Updated tests/fixtures
5. Strengthened verification scripts where needed
6. A concise changelog/report that includes:
   - what was already compliant and intentionally left unchanged
   - what was corrected
   - what provider contract mismatches were fixed
   - what worker recovery guarantees were added or strengthened
   - what tests were added

---

## Acceptance criteria

The refactor is not done until all of the following are true:

### Database correctness

- Every table name is lowercase snake_case.
- Every column name is lowercase snake_case.
- No raw SQL uses legacy non-snake-case DB identifiers.
- DB-facing internal canonical shapes use snake_case consistently.

### Worker correctness

- Triggered/running work is recoverable after restart.
- AUTO_PUBLISH streams resume safely after interruption.
- Repost flows remain recoverable and idempotent.
- No duplicate publish occurs under repeated recovery cycles.

### Provider correctness

- All provider requests match official docs.
- All provider response normalizers match official response shapes.
- NewsAPI `publishedAt` and `sortBy=publishedAt` are fixed everywhere.
- Source-catalog UI accurately communicates capability scope.

### Preservation of compliant code

- Already compliant DB naming remains untouched unless a dependent change requires adjustment.
- Existing durable worker primitives are preserved where already correct.
- Existing provider behavior that is already doc-compliant remains unchanged.

---

## Execution style

Work in this order:

1. audit and classify compliant vs non-compliant areas
2. fix mandatory provider contract bugs first
3. harden worker recovery invariants
4. fix any remaining DB-facing naming drift
5. align UI capability messaging and validation
6. update tests and verification gates
7. produce a final summary of preserved vs changed behavior

Do not over-refactor. Do not rename compliant things just for aesthetics. Make the codebase more correct, more durable, and more explicitly aligned with both the database contract and the official provider contracts.
