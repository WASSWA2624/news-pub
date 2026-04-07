# NewsPub Comprehensive Upgrade Prompt - Stream-Batched Fetching, Provider Time Windows, And Full Documentation Sync

## Mission

Upgrade the NewsPub codebase comprehensively so the product remains operationally reliable, fetch-efficient, UI-consistent, and resilient when optional AI functionality is unavailable.

The implementation must preserve the bounded NewsPub product shape. Do not reintroduce open-ended generation, prompt-lab, equipment, manufacturer, or unrelated legacy architecture.

## Non-Negotiable Runtime Rule For AI

AI is optional at runtime.

If the AI layer is disabled, misconfigured, missing credentials, unavailable, rate limited, timing out, returning invalid structured output, or otherwise unhealthy, **do not block the workflow**. Instead:

- skip AI intervention cleanly
- continue through deterministic formatting, canonical post content, or manual editorial flow as appropriate
- persist a machine-readable and admin-visible reason
- record `OptimizationStatus.SKIPPED` or `OptimizationStatus.FALLBACK` instead of treating the event as a hard failure
- keep fetch, review, scheduling, retry, and publication flows operational whenever platform and policy requirements are still satisfied

Do not make AI availability a hidden prerequisite for normal NewsPub use.

## Main Objectives

1. Strengthen reliability of provider, review, publishing, and retry flows.
2. Improve provider fetch efficiency by supporting single-call batch fetching for compatible multi-stream runs.
3. Ensure every provider can fetch broadly within an explicit time boundary whenever the provider supports it.
4. Guarantee website publishing includes every article that passes the website stream filters unless blocked by settings, policy checks, or AI-related hold or block outcomes.
5. Improve admin UX for all forms, including modal forms and long editorial screens.
6. Standardize button sizing and interaction behavior.
7. Improve accordion and accordion-like form sections so they support fast, low-friction editing.
8. Reduce UI nesting depth, duplication, and unnecessary client-side render cost.
9. Keep all changed runtime files professionally documented with current JSDoc and targeted inline comments.
10. Keep all repo-truth docs synchronized with the implemented behavior.

## Required Product Behavior

### A. AI, fallback, and observability

- Treat AI as assistive only.
- Preserve facts, attribution, and policy checks.
- Reuse optimization cache when valid.
- When AI is skipped or falls back, show that state clearly in the admin UI, job history, audit logs, fetch-run summaries, article-match review surfaces, and post editor surfaces.
- Never let optional AI failures corrupt queue state or block manual publish decisions.

### B. Multi-stream fetch batching

Implement a provider-aware fetch aggregation contract for situations where multiple streams are sent together for execution.

When a batch of streams is executed together and the streams are compatible for shared fetching:

- perform **one provider API call** for the compatible stream group instead of one call per stream
- build one provider request that represents the **combined fetch envelope** for all sent streams in that compatible group
- use the provider response as the shared candidate pool for all streams in the group
- then apply stream-specific filtering, deduplication, AI handling, review logic, and publishing **inside the app** per stream
- do not require the provider request itself to encode every stream’s full rule set; fetch broadly enough once, then filter locally
- keep per-stream checkpoints, summaries, dedupe decisions, article matches, AI outcomes, publish attempts, and audit events separate even when the upstream fetch was shared
- keep the shared-fetch path idempotent and safe for retries
- preserve existing single-stream execution support

Compatibility rules for a shared fetch group:

- same active provider key
- same provider endpoint shape when the provider supports multiple endpoint modes
- same runtime credential source
- same general fetch window semantics
- no stream-specific provider constraint that would make the shared request underfetch for another stream in the group

When streams are not compatible for shared fetching:

- split them into the minimum number of compatible provider request groups
- still avoid unnecessary duplicate upstream calls

### C. Combined fetch envelope rules

The shared provider request for a compatible stream group must:

- widen the request enough to avoid missing valid downstream matches
- represent the union of compatible fetch-time criteria where widening is safe
- never narrow the request in a way that causes a stream to lose articles it should have seen
- prefer local filtering over overfitting the provider request
- keep pagination, cursors, and time windows explicit and auditable

Examples:

- if two website streams use the same provider and same endpoint but different categories, fetch once using the broadest safe provider request, then filter per stream locally
- if one stream needs provider endpoint `everything` and another needs `top-headlines`, they are not part of the same shared-fetch group
- if one provider supports broad date windows, build one request for the full combined time window, then fan out locally

### D. Provider time-boundary support

For all supported providers, there must be a clear way to fetch everything within a given time boundary whenever the provider supports date or datetime scoping.

Implementation requirements:

- define a normalized internal time-window contract for provider requests
- support start and end boundaries consistently in the provider integration layer
- preserve provider-specific parameter names only inside the provider adapter layer
- make the time-boundary behavior explicit in the admin form metadata, request builders, tests, and documentation
- keep automatic checkpoint-based incremental windows
- also support explicit bounded fetch windows for manual runs, batched runs, retries, backfills, and admin-triggered diagnostics where applicable
- if a provider endpoint does not support a time boundary directly, document that clearly and implement the broadest supported safe fallback behavior
- if a provider has multiple endpoints and only some support full bounded history, expose and document that distinction clearly

### E. Website publication contract

For website destinations:

- publish everything that passes the website stream filters and deduplication rules unless blocked by destination settings, policy checks, or explicit AI or moderation holds
- do not silently drop website-eligible articles because the provider returned a broader candidate set
- do not require extra provider-side filtering for the website path beyond what is necessary for efficient broad fetches
- keep website publication behavior deterministic and auditable
- ensure website streams remain first-class, not second-class relative to social publishing

### F. Filtering, review, and downstream processing

After shared or single-stream fetching:

- normalize every provider article into the shared internal article contract exactly once per fetched item
- evaluate every fetched item against each relevant stream locally
- perform category, locale, language, country, region, include-keyword, exclude-keyword, provider-filter, duplicate, policy, and schedule logic in the app layer
- preserve per-stream article-match records even when multiple streams accept the same fetched article
- keep repost-eligible duplicate logic working correctly per destination and per stream
- keep review-required and auto-publish modes working correctly after batched upstream fetching

### G. Form UX and modal UX

Apply these rules consistently to provider, destination, stream, template, settings, category, post-editor, and other admin forms:

- use one shared form design language for labels, help text, error text, spacing, and section rhythm
- keep primary actions obvious and easy to reach
- keep modal header context stable and modal footer actions consistently visible
- avoid scroll traps inside modals
- preserve entered values when non-blocking refreshes happen
- show validation close to the field and section that needs correction
- auto-focus or scroll to the first blocking issue on submit failure
- ensure keyboard-only users can complete all form flows

### H. Accordion and accordion-like improvements

For all disclosure-based sections in forms and editors:

- use a consistent disclosure component or behavior contract
- show section title, short summary, and completion or error state even when collapsed
- auto-expand sections that contain validation errors, required missing data, or blocking warnings
- keep toggles large enough to click comfortably
- ensure `aria-expanded`, focus treatment, and keyboard activation are correct
- avoid hiding important save-affecting information in collapsed regions without indicators
- support progressive disclosure without making the form feel fragmented

### I. Buttons and control sizing

- standardize button height across primary, secondary, danger, and footer actions
- standardize icon-leading button spacing and alignment
- keep action hierarchy consistent across cards, tables, toolbars, and modals
- do not allow the same action class to appear with multiple heights on different screens unless there is a clear accessibility reason

### J. Performance and code quality

- minimize component nesting depth where practical
- remove avoidable duplication
- extract reusable field, section, footer, disclosure, and status primitives where they genuinely reduce complexity
- avoid unnecessary client components and rerenders
- lazy-mount heavy sections when it improves responsiveness without harming usability
- keep list views paginated and bounded
- preserve or improve perceived speed on mobile and low-end devices

## Areas To Close Based On Current Repo Review

1. **Shared-fetch orchestration gap**
   - Current stream execution fetches once per stream and then filters locally.
   - Add a batch execution path that can group compatible streams and reuse one upstream provider response across them.
   - Keep the existing single-stream execution path intact.

2. **Provider time-boundary standardization gap**
   - The repo already contains provider-specific date window logic, but the product contract needs a stronger normalized internal time-window model and explicit support across manual, scheduled, retry, and batched runs.
   - Make provider endpoint capability differences explicit.

3. **Website publication completeness gap**
   - The implementation must guarantee that all website-eligible results coming from the shared fetched pool proceed through local filtering and publication unless blocked by explicit rules.
   - Strengthen docs, tests, and review visibility so this is treated as a guaranteed behavior.

4. **Fetch-run observability gap for batched execution**
   - Shared upstream fetches need explicit observability showing grouped stream execution, shared request details, compatible grouping decisions, downstream per-stream fan-out counts, and any reasons a batch was split.

5. **Docs synchronization gap**
   - Repo-truth docs must explicitly describe shared-fetch grouping, time-boundary semantics, website-posting completeness, and where filtering occurs.

6. **Admin UX consistency gap**
   - Form surfaces are generally structured, but need stricter cross-screen consistency for sectioning, helper text, validation visibility, primary action placement, accordion summaries, and stable modal editing.

## Implementation Instructions

1. Review the full repo against `app-write-up.md`, `README.md`, and `dev-plan/*` before changing behavior.
2. Add a shared-fetch planner that can:
   - accept multiple stream ids for one execution request
   - partition streams into compatible provider request groups
   - produce one upstream provider request per compatible group
   - fan the fetched candidate pool back out into per-stream downstream evaluation
3. Keep `runStreamFetch` support for single-stream execution, but extract reusable internals so batched and single-stream flows share the same downstream processing rules.
4. Introduce a normalized provider fetch window contract used by:
   - scheduled runs
   - manual runs
   - retry runs
   - backfill or diagnostic runs
   - batched multi-stream runs
5. Update provider adapters so each provider exposes the broadest supported time-bounded fetch behavior, including endpoint-specific capability differences.
6. Ensure provider request builders never underfetch when multiple compatible streams are grouped.
7. Ensure the website destination path posts every locally eligible article from the fetched pool unless blocked by settings, duplicate rules, moderation or policy, or AI-related hold or block outcomes.
8. Preserve deterministic fallback behavior so AI failure or AI misconfiguration never blocks valid non-AI workflows.
9. Update admin UX primitives so forms and modals behave consistently.
10. Refactor accordion-like sections into a reusable, accessible pattern where beneficial.
11. Standardize shared button sizing tokens and migrate inconsistent usages.
12. Improve inline validation and submit-failure recovery across forms.
13. Reduce duplication and simplify component structure without changing product scope.
14. Update JSDoc for every changed exported function, component, route handler, action, formatter, workflow helper, provider adapter, batching helper, and time-window helper.
15. Add targeted inline comments for provider grouping rules, shared-fetch safety constraints, checkpoint handling, fan-out filtering, website publication guarantees, and fallback branches where needed.

## Files That Must Be Updated When Behavior Changes

Update all necessary code, tests, and docs. At minimum, update the relevant files among these when applicable:

### Repo-truth docs

- `README.md`
- `app-write-up.md`
- `dev-plan/00_plan_index.md` if sequencing or scope references change
- `dev-plan/10_provider_registry_and_credentials.md`
- `dev-plan/11_destination_connections_and_streams.md`
- `dev-plan/12_fetch_and_normalization_pipeline.md`
- `dev-plan/13_filtering_publishability_and_deduplication.md`
- `dev-plan/14_review_queue_and_publication_state.md`
- `dev-plan/16_website_rendering_and_publication.md`
- `dev-plan/18_scheduler_incremental_windows_and_retries.md`
- `dev-plan/20_audit_logs_and_observability.md`
- `dev-plan/21_analytics_dashboard_and_reporting.md` if batch-run metrics or dashboard visibility change
- `dev-plan/22_performance_and_scalability.md` if shared-fetch architecture changes performance assumptions
- `dev-plan/24_release_traceability_and_cutover.md` if acceptance evidence changes

### Likely runtime and test touchpoints

- `src/lib/news/providers.js`
- `src/lib/news/provider-definitions.js`
- `src/lib/news/workflows.js`
- `src/lib/validation/configuration.js`
- `src/lib/news/providers.test.js`
- `src/lib/news/workflows.test.js`
- `src/features/streams/index.js`
- `src/features/streams/index.test.js`
- any admin route handlers or UI modules that trigger stream runs or display fetch-run summaries
- any analytics or observability modules that summarize fetch runs, grouped runs, or AI fallback visibility

Do not update docs superficially. The docs must describe the implemented behavior exactly.

## Testing Requirements

Update or add tests covering all of the following:

### Shared-fetch and batching

- multiple compatible streams sent together cause exactly one provider API call for the compatible group
- incompatible streams are partitioned into multiple compatible groups with the minimum safe number of upstream calls
- downstream per-stream filtering still behaves correctly after shared fetching
- one fetched article can create valid matches for multiple streams without corrupting dedupe or queue state
- per-stream checkpoints remain correct when a shared upstream fetch is used
- shared-fetch retries remain idempotent

### Provider time windows

- each provider request builder uses the normalized internal time window correctly
- automatic checkpoint windows still work
- explicit bounded windows override or compose with checkpoint logic correctly where intended
- endpoint-specific time-boundary limitations are tested and documented
- shared-fetch groups widen the time window safely instead of underfetching

### Website publication completeness

- website streams post every fetched article that passes local filters and dedupe checks unless explicitly blocked
- broad shared-fetch responses do not cause valid website items to be silently dropped
- website publication stays deterministic when AI is skipped or falls back

### AI and fallback

- AI disabled
- AI misconfigured
- AI timeout
- invalid AI structured output
- deterministic fallback
- skipped-AI admin visibility
- fallback-AI admin visibility

### UX and controls

- accordion auto-open on validation failure
- shared button-height behavior where testable
- modal validation recovery and stable action visibility where testable

### Observability

- grouped fetch runs record compatible grouping and batch fan-out details
- audit payloads show shared-fetch execution without exposing secrets
- admin-facing summaries reflect shared upstream fetches plus per-stream downstream outcomes

## Acceptance Criteria

The work is complete only if:

- compatible multi-stream execution performs one provider API call per compatible group and then filters locally per stream
- incompatible stream batches are safely partitioned without underfetching or unnecessary extra calls
- all supported providers expose a clear and tested time-boundary fetch path where the provider supports it
- checkpoint-based incremental fetching still works
- website streams publish every locally eligible article unless blocked by explicit settings, duplicate logic, or policy or moderation outcomes
- AI failure or configuration failure causes AI intervention to be skipped rather than blocking the app
- deterministic fallback or manual editorial flow remains usable
- admin logs, jobs, review surfaces, and dashboards clearly show skipped or fallback AI states
- grouped fetch execution is observable and auditable
- all major forms feel consistent, faster, and easier to complete
- accordion sections are clearer, accessible, and error-aware
- button heights are uniform across the admin app
- modal forms support seamless editing
- changed runtime code is documented with professional JSDoc
- tests and docs reflect the real implementation exactly

## Delivery Rules

- Make the smallest architectural change that fully satisfies the behavior contract.
- Prefer extracting reusable workflow helpers over duplicating logic between single-stream and batch-stream execution.
- Keep provider-specific request quirks inside provider adapters.
- Keep filtering and destination-specific decisions inside the app layer.
- Keep auditability first: every broad-fetch and downstream-filtering decision should be explainable after the fact.
- Do not leave the repo in a partially migrated state where docs describe shared fetches but runtime still fetches once per stream.
