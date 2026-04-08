# NewsPub Comprehensive Upgrade Prompt — Shared Fetch Hardening, Explicit Time Windows, SEO-First Website Publishing, Meta Compliance Review, And Stream UX Defaults

## Mission

Review the entire NewsPub repository comprehensively against `newspub_comprehensive_upgrade_prompt.md`, `app-write-up.md`, `README.md`, and all relevant `dev-plan/*` files, then implement and document the remaining work needed so the runtime behavior, admin UX, tests, and repo-truth documentation all match exactly.

This prompt must be treated as an **implementation and synchrojnization prompt**, not as a greenfield redesign prompt.

Important: the current repo already contains partial or substantial implementation for shared-fetch planning, normalized fetch-window handling, AI skip/fallback behavior, and website publication flow. Do **not** duplicate or replace that work blindly. Instead:

- verify what already exists
- preserve working behavior
- close the remaining gaps
- remove contradictions
- harden incomplete areas
- align code, tests, UI defaults, and docs to one exact product contract

Do not leave the repository in a state where runtime behavior, tests, and docs disagree.

## Product Boundaries

Keep the bounded NewsPub product shape.

Do **not** reintroduce open-ended generation tools, prompt-lab patterns, equipment or manufacturer domains, unrelated content pipelines, or speculative new platform scope.

Supported destination scope remains:

- website
- Facebook
- Instagram

Supported provider scope remains the currently supported provider set unless the repo already contains an approved extension path.

## Non-Negotiable Runtime Rules

### 1. AI is optional at runtime

If AI is disabled, missing credentials, misconfigured, unavailable, rate limited, timing out, returning invalid structured output, or otherwise unhealthy, the workflow must continue safely whenever platform and policy requirements still allow it.

Required behavior:

- skip AI intervention cleanly when AI is unavailable
- fall back to deterministic formatting where supported
- do not block fetch, filtering, review, scheduling, retry, or website publication solely because AI failed
- persist visible machine-readable reasons
- surface `SKIPPED` or `FALLBACK` status clearly in admin views, logs, and analytics
- preserve editorial override and manual publication paths

### 2. Local filtering remains the source of truth

Provider requests may be widened for efficiency, but stream-specific filtering, deduplication, policy handling, review logic, and destination decisions must remain in the app layer.

### 3. Website publishing is complete by default

For website destinations, NewsPub must publish **every fetched item that passes local stream filters, duplicate rules, moderation rules, destination settings, and hold/block rules**.

No valid website article may be silently dropped just because the upstream fetch was broader, batched, or optimized for multi-stream reuse.

### 4. Meta safety and pacing are mandatory

For Facebook and Instagram, NewsPub must not only optimize copy but also explicitly review publishable payloads for Meta safety, policy alignment, spam-risk reduction, and posting cadence.

## Main Objectives

1. Preserve and harden provider-aware shared-fetch batching.
2. Make time-boundary behavior fully normalized, explicit, testable, and clearly exposed in admin UX.
3. Make the default stream fetch window **last 24 hours to now**, clearly prefilled in stream settings and manual-run surfaces.
4. Ensure all providers expose the broadest supported time-bounded fetch path within their actual endpoint limitations.
5. Guarantee website streams publish all locally eligible content by default and make that behavior SEO-optimized.
6. Strengthen Facebook and Instagram AI review so filtered posts are streamlined for platform compliance before publication.
7. Enforce and expose a delay between consecutive Facebook and Instagram posts to reduce account-ban risk.
8. Review and optimize stream filter defaults, field help text, and interface behavior so the most correct defaults are preselected and obvious.
9. Keep all changed runtime files documented with professional JSDoc and targeted inline comments.
10. Update all affected docs, plans, and tests so the repository tells the truth.

## Required Runtime Behavior

### A. Shared-fetch batching for sent stream groups

When one execution request contains multiple stream ids:

- partition streams into the minimum safe number of compatible shared-fetch groups
- perform exactly one provider API call per compatible group
- build one widened provider request per compatible group
- use that shared upstream response as the candidate pool for all streams in that group
- then apply per-stream filtering, deduplication, AI handling, review, and publishing locally inside the app
- preserve separate per-stream checkpoints, summaries, article matches, audit logs, and publish attempts
- preserve single-stream execution support

Do not regress any existing shared-fetch implementation that is already correct.

### B. Shared-fetch compatibility rules

Streams may share one upstream request only when all of the following remain compatible and safe:

- same active provider key
- same provider endpoint shape or endpoint family where request semantics match
- same runtime credential source
- same general time-boundary semantics
- no stream-specific provider filter that would cause one stream to underfetch if grouped

When streams are not compatible:

- split them into the smallest safe number of groups
- still avoid duplicate upstream calls whenever widening remains safe

### C. Combined fetch envelope rules

The shared provider request must:

- widen enough to avoid missing downstream matches
- represent the union of safe fetch-time criteria
- never narrow in a way that underfetches for any stream in the group
- prefer local filtering over brittle provider-side overfitting
- keep time windows, pagination, cursors, and grouping decisions explicit and auditable

### D. Normalized provider time-window contract

There must be one normalized internal fetch-window contract used consistently by:

- scheduled runs
- manual runs
- manual multi-stream runs
- retries
- backfills
- diagnostics
- shared-fetch batches

Implementation requirements:

- internal code uses normalized start and end boundaries
- provider adapters map normalized boundaries to provider-specific request parameters
- explicit manual windows are supported cleanly
- checkpoint-driven incremental windows still work
- explicit windows do not advance checkpoints unless explicitly requested
- endpoint-specific time-boundary limitations are documented clearly

### E. Default time-bound behavior in stream settings

This is a required addition.

For all provider-backed stream settings and manual execution controls:

- the default visible time window must be **from the last 24 hours to now**
- the interface must make that default explicit
- start and end boundaries must be clearly prefilled where the provider or endpoint supports direct bounded input
- if an endpoint supports only relative timeframe semantics, the UI must still present the normalized 24-hour default in a clear way and explain how it maps to the provider
- if a provider endpoint cannot support a true start/end range directly, the UI must state that clearly and show the nearest supported behavior

Do not hide this logic behind implicit defaults only in backend code. The admin interface must communicate it clearly.

### F. Provider support requirements

For every supported provider, ensure there is a way to fetch everything within a given time boundary whenever the provider supports it.

Requirements:

- provider capabilities must be explicit by endpoint
- provider adapters must expose the broadest supported bounded fetch path
- request builders must honor normalized internal start/end windows
- tests must prove correct mapping for each provider and endpoint mode
- unsupported endpoint limitations must be documented and handled safely

The default behavior remains:

- last 24 hours to now

### G. Website publication contract

For website destinations:

- publish everything that passes local stream filters and duplicate rules unless blocked by explicit settings, moderation, policy, or AI hold/block outcomes
- do not apply social-style `maxPostsPerRun` limits to website streams
- keep website publication deterministic and auditable
- ensure website publishing remains first-class, not secondary to social flows
- ensure broad shared-fetch responses do not cause valid website items to be skipped

### H. SEO requirements for website publishing

This is a required strengthening area.

By default, website streams should post everything returned by the website stream filters unless blocked, and those posts must be SEO optimized.

Required SEO behavior:

- generate or preserve canonical slugging deterministically
- populate SEO title and meta description fields consistently
- keep Open Graph and Twitter metadata synchronized with canonical website content
- ensure canonical URLs are stable
- keep structured data valid for published story pages where that architecture already exists
- ensure sitemap and public discovery surfaces reflect the published website content correctly
- preserve source attribution and factual fidelity
- ensure fallback and non-AI paths still produce valid SEO metadata

Do not make SEO optimization depend on AI success.

### I. Facebook and Instagram AI compliance review

This is a required addition and hardening area.

For Facebook and Instagram, after stream filtering but before publication:

- run the AI layer as a bounded compliance-and-streamlining pass when AI is available
- ensure the payload is aligned with Facebook and Instagram terms, safety expectations, and anti-spam heuristics as far as the product can reasonably enforce
- preserve factual meaning and source attribution
- reduce risky formatting, engagement bait, spam-like phrasing, overlong copy, and platform-unsafe patterns
- keep all policy decisions visible and auditable
- if AI is unavailable, continue using deterministic policy and guardrail logic
- do not publish blocked content just because AI is unavailable

Important: this is not open-ended content generation. It is bounded optimization, compliance review, and formatting.

### J. Facebook and Instagram post-delay enforcement

This is a required addition or hardening area.

For Facebook and Instagram destinations:

- enforce a delay between one post and the next to reduce account-ban risk
- make the delay configurable through the existing destination or policy guardrail architecture if such configuration already exists
- make the current delay visible in admin help text and publish diagnostics
- prevent unsafe back-to-back auto-publication bursts
- ensure scheduled runs and retries respect the delay
- record when a publish was deferred or blocked because the platform pacing interval had not elapsed yet

If the repo already has partial support for minimum post intervals, verify it fully covers both auto-publish and retry paths, is visible in admin UX, and is documented and tested.

### K. Filtering and downstream evaluation

After fetching, whether single-stream or shared-fetch:

- normalize each upstream article once per fetched item
- evaluate each fetched item against each relevant stream locally
- keep include-keyword, exclude-keyword, locale, language, country, region, provider-filter, duplicate, review, schedule, and policy logic in the app layer
- preserve per-stream article-match records
- keep repost-eligible duplicate logic correct per destination and per stream
- preserve review-required and auto-publish behavior

### L. Stream filter defaults and interface optimization

This is a required review area.

Review the stream-management and stream-form interfaces comprehensively and optimize the defaults and settings behavior.

Required outcomes:

- default values should match the safest and most useful NewsPub behavior
- default fetch window clearly reflects last 24 hours to now
- website stream defaults should favor complete local publication of eligible results
- social stream defaults should favor safer review and pacing behavior where appropriate
- provider filter labels, hints, and section summaries should explain which filters affect upstream requests versus local filtering
- endpoint limitations should be explained where relevant
- the most important controls should appear first
- advanced filters should remain available but not overwhelm common workflows
- filter defaults should not accidentally underfetch
- country, language, category, keyword, exclusion, endpoint, and time-window defaults should be reviewed for clarity and correctness
- validation messages should explain how to fix under-scoped or contradictory configurations

### M. Admin forms, modal UX, and disclosure sections

Apply these rules consistently across provider, destination, stream, template, SEO, category, and editor forms:

- one shared form design language
- stable modal headers and footers
- no scroll traps
- visible validation near the affected field
- auto-focus or scroll to first blocking error
- keyboard accessibility throughout
- consistent accordion or disclosure behavior
- collapsed sections must show useful summaries and error/completion state
- sections with blocking issues must auto-expand
- important information must not disappear silently when collapsed

### N. Buttons and control sizing

- standardize button heights across primary, secondary, destructive, toolbar, and modal-footer actions
- standardize icon spacing and alignment
- remove inconsistent action sizing unless required for accessibility

### O. Performance and code quality

- minimize unnecessary nesting
- remove duplication where it truly reduces complexity
- keep client components lean
- avoid unnecessary rerenders
- lazy-mount heavy sections only when it improves responsiveness without hurting usability
- preserve list bounds and pagination
- do not expand scope beyond the NewsPub product boundary

## Gaps To Close

Use the repo review to close these specific gaps or partial-implementation risks.

### 1. Shared-fetch hardening gap

The repo already contains shared-fetch planning logic. Verify it end to end and close any remaining mismatch between planner behavior, workflow execution, admin reporting, and tests.

### 2. Time-window UX gap

The backend may already support normalized fetch windows, but the admin stream settings and manual execution experience must clearly expose the default last-24-hours-to-now behavior with prefilled values and endpoint-specific guidance.

### 3. Provider capability visibility gap

Provider endpoint support for date or datetime windows must be explicit in the form metadata, validation, adapter logic, tests, and docs.

### 4. Website completeness plus SEO gap

Website publication already aims to process every eligible candidate. Harden the guarantee, ensure tests cover it, and make sure SEO metadata remains correct even on fallback paths.

### 5. Meta compliance and pacing gap

The repo may already contain some policy and interval guardrails. Verify and complete the behavior so Facebook and Instagram both have:

- bounded AI review and streamlining
- deterministic fallback policy checks
- visible compliance outcomes
- enforced post spacing
- test coverage
- documentation coverage

### 6. Stream defaults and filter UX gap

Review the stream-management interfaces and optimize filter defaults, help text, summaries, grouping, and validation so operators clearly understand what will happen before they save or run a stream.

### 7. Documentation synchronization gap

All changed code paths must be reflected exactly in repo-truth docs, not approximately.

## Implementation Instructions

1. Review the entire repository against:
  - `newspub_comprehensive_upgrade_prompt.md`
  - `app-write-up.md`
  - `README.md`
  - all relevant `dev-plan/`* files
2. Preserve existing correct behavior and avoid duplicate architecture.
3. Verify the existing shared-fetch planner and execution path before changing it.
4. Extract or refine reusable internals so single-stream and batch-stream paths share one downstream-processing contract.
5. Introduce or harden one normalized fetch-window model across all execution entry points.
6. Make the default 24-hour window explicit and prefilled in stream settings and manual execution interfaces.
7. Update provider adapters and provider metadata so endpoint-specific time-boundary capabilities are explicit and tested.
8. Ensure request builders widen grouped fetch windows safely and never underfetch.
9. Guarantee website streams post every locally eligible article unless explicitly blocked.
10. Ensure website posts remain SEO optimized even when AI is skipped or falls back.
11. Add or harden Facebook and Instagram AI compliance review as a bounded streamlining pass.
12. Add or harden Facebook and Instagram inter-post delay enforcement across auto-publish, scheduled, and retry flows.
13. Review and optimize stream filter defaults and the stream settings UX comprehensively.
14. Standardize form, modal, disclosure, and button behavior where inconsistent.
15. Add professional JSDoc to every changed exported function, route handler, component, helper, provider adapter, workflow utility, and validation module.
16. Add targeted inline comments for non-obvious rules: grouping safety, widened fetch envelopes, checkpoint advancement, default time-window semantics, website publication completeness, Meta pacing, and fallback branches.
17. Update all affected docs and tests so they match the implemented runtime exactly.

## Files That Must Be Updated When Applicable

Update all necessary runtime files, tests, and docs. At minimum, update the relevant files among these when behavior changes.

### Repo-truth docs

- `README.md`
- `app-write-up.md`
- `dev-plan/00_plan_index.md`
- `dev-plan/10_provider_registry_and_credentials.md`
- `dev-plan/11_destination_connections_and_streams.md`
- `dev-plan/12_fetch_and_normalization_pipeline.md`
- `dev-plan/13_filtering_publishability_and_deduplication.md`
- `dev-plan/14_review_queue_and_publication_state.md`
- `dev-plan/16_website_rendering_and_publication.md`
- `dev-plan/17_social_destination_publication.md`
- `dev-plan/18_scheduler_incremental_windows_and_retries.md`
- `dev-plan/19_seo_search_and_public_discovery.md`
- `dev-plan/20_audit_logs_and_observability.md`
- `dev-plan/21_analytics_dashboard_and_reporting.md`
- `dev-plan/22_performance_and_scalability.md`
- `dev-plan/24_release_traceability_and_cutover.md`

### Likely runtime and test touchpoints

- `src/lib/news/shared-fetch.js`
- `src/lib/news/fetch-window.js`
- `src/lib/news/providers.js`
- `src/lib/news/provider-definitions.js`
- `src/lib/news/workflows.js`
- `src/lib/validation/configuration.js`
- `src/lib/content/policy.js`
- `src/lib/ai/index.js`
- `src/features/streams/index.js`
- `src/features/destinations/meta-config.js`
- `src/components/admin/stream-form-card.js`
- `src/components/admin/provider-filter-fields.js`
- `src/components/admin/stream-management-screen.js`
- relevant admin route handlers that trigger stream execution
- relevant analytics, audit, and observability modules
- relevant SEO and website publication modules
- relevant provider, workflow, stream, validation, AI, and route tests

Do not update documentation superficially. The docs must describe the exact behavior that ships.

## Testing Requirements

Add or update tests to cover all of the following.

### Shared-fetch batching

- compatible stream groups cause exactly one upstream provider API call per compatible group
- incompatible streams are partitioned into the minimum safe number of groups
- grouped fetch windows widen safely without underfetching
- downstream per-stream filtering still behaves correctly after shared fetching
- one fetched article can match multiple streams safely
- per-stream checkpoints remain correct in shared-fetch mode
- retries remain idempotent

### Provider time windows

- normalized internal start/end windows map correctly per provider and endpoint
- automatic checkpoint windows still work
- explicit bounded windows override or compose correctly
- default window resolves to last 24 hours to now
- endpoint limitations are tested and documented
- stream settings and manual-run surfaces expose the expected default window semantics

### Website publication completeness and SEO

- website streams publish every fetched article that passes local filters and dedupe rules unless explicitly blocked
- broad shared-fetch responses do not silently drop valid website items
- website paths do not inherit social `maxPostsPerRun` limits
- non-AI and fallback paths still create valid SEO title and meta description values
- canonical and public metadata stay in sync with published website content

### AI fallback and policy behavior

- AI disabled
- AI misconfigured
- AI timeout
- invalid AI structured output
- deterministic fallback remains usable
- skipped and fallback AI states remain visible in admin data

### Facebook and Instagram compliance and pacing

- Facebook and Instagram payloads pass through bounded compliance review
- deterministic policy checks still run when AI is unavailable
- risky content is held or blocked appropriately
- minimum post interval blocks or defers back-to-back publishes correctly
- scheduled runs and retries respect the post delay
- admin-facing summaries and audit records show why a publish was delayed or blocked

### UX and controls

- accordion or disclosure sections auto-open on validation failure
- stream forms show correct defaults for the most common workflows
- provider filter help text distinguishes upstream fetch filters from local stream filtering
- button-height consistency is preserved where testable
- modal validation recovery keeps actions visible and usable

### Observability

- grouped fetch runs record grouping decisions and fan-out details
- audit payloads show shared-fetch execution without exposing secrets
- admin summaries reflect shared-fetch behavior, time-window choices, website completeness, AI skip/fallback states, and Meta pacing outcomes

## Acceptance Criteria

The work is complete only if all of the following are true.

- compatible multi-stream execution performs one provider API call per compatible group
- incompatible stream batches are partitioned safely with no underfetching and no unnecessary duplicate calls
- every supported provider exposes a clear and tested bounded fetch path where supported
- the default stream time boundary is last 24 hours to now and is clearly prefilled in stream settings or equivalent admin controls
- checkpoint-based incremental fetching still works correctly
- website streams publish every locally eligible article unless blocked by explicit rules
- website output remains SEO optimized even when AI is skipped or falls back
- Facebook and Instagram filtered posts are reviewed and streamlined for platform compliance before publication when AI is available
- deterministic policy and guardrail logic still protects Facebook and Instagram when AI is unavailable
- Facebook and Instagram enforce a delay between one post and the next
- pacing and policy outcomes are visible in admin logs, history, and diagnostics
- stream filter defaults and settings UX are clearer, safer, and easier to use
- all major forms, modals, and disclosure sections behave consistently
- button heights are uniform across the admin app
- changed runtime code has professional JSDoc
- tests reflect the real implementation
- repo-truth docs reflect the real implementation exactly

## Delivery Rules

- make the smallest architectural change that fully satisfies the contract
- preserve existing correct abstractions where possible
- prefer extracting reusable helpers over duplicating logic
- keep provider quirks inside provider adapters and provider metadata
- keep stream-specific filtering and destination decisions in the app layer
- keep observability first so every widened fetch, grouped run, pacing block, and publication decision is explainable afterward
- do not claim a behavior is implemented unless code, tests, and docs all agree
- do not leave the repo partially migrated

