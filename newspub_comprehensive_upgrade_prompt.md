# NewsPub Gap-Only Upgrade Prompt — UI Uniformity, Responsiveness, Documentation, Cleanup, And Efficiency

## Mission

Review the current NewsPub repository against the existing implementation, `README.md`, `app-write-up.md`, and relevant `dev-plan/*` files, then implement **only the remaining gaps**.

This is **not** a broad reimplementation prompt. Do **not** restate or redo work that is already present and aligned. Preserve working shared-fetch, normalized time-window behavior, SEO-first website publishing, AI skip/fallback handling, Meta pacing/compliance safeguards, and existing admin UX improvements unless a real gap, inconsistency, or regression is found.

Focus only on the gaps below.

## Gaps Confirmed From The Current Repo Review

### 1. UI reuse and design-language gap

The repo already has a shared admin UI layer, but some screens still bypass it with bespoke cards, buttons, action bars, and layout primitives.

Main risk areas include:

- `src/components/admin/stream-management-screen.js`
- `src/components/admin/category-management-screen.js`
- `src/components/admin/media-library-screen.js`
- route-level sticky card variants in admin pages
- route or feature code that recreates buttons, cards, summary blocks, and action rows instead of reusing the shared admin primitives

Required outcome:

- one shared admin design language
- one shared button system
- one shared card/surface system
- one shared action-row and sticky-side-panel pattern
- one shared table/list responsiveness strategy
- eliminate visually similar but separately implemented primitives unless a real functional difference exists

### 2. App-wide responsiveness gap

Much of the admin UI is responsive already, but responsiveness must be verified and hardened app-wide, especially where custom screen-specific layout primitives were introduced.

Required outcome:

- every admin workspace remains fully usable on narrow mobile widths, tablet widths, laptop widths, and large desktop widths
- no hidden horizontal overflow except where deliberate and justified
- no clipped modal actions, hidden validation text, collapsed controls, or off-screen sticky panels
- tables, action bars, summary strips, and disclosure headers must wrap cleanly
- long labels, provider names, endpoint labels, policy summaries, and AI status text must not break layout

### 3. Horizontal alignment and layout consistency gap

Some screens still use one-off `space-between`, custom grid ratios, and ad hoc button wrappers that can produce inconsistent visual rhythm and imperfect horizontal alignment.

Required outcome:

- normalize horizontal alignment for cards, headers, badges, tables, form rows, toolbar actions, modal footers, and sticky sidebars
- align icon, label, helper text, and action baselines consistently
- remove layout drift caused by bespoke wrappers when shared primitives can solve it
- standardize internal spacing, section rhythm, and alignment tokens across admin pages

### 4. Documentation gap

The original prompt requires professional JSDoc, but many important runtime/admin files still do not have adequate module-level or export-level documentation.

High-priority files to address include, at minimum:

- `src/components/admin/news-admin-ui.js`
- `src/components/admin/destination-form-card.helpers.js`
- `src/components/admin/stream-management-screen.helpers.js`
- `src/lib/news/providers.js`
- `src/lib/news/publishers.js`
- `src/lib/news/shared-fetch.js`
- `src/lib/news/shared.js`
- `src/lib/news/social-post.js`
- `src/lib/news/workflows.js`
- `src/features/streams/index.js`
- `src/features/destinations/index.js`
- `src/features/destinations/meta-config.js`
- relevant admin route files under `src/app/admin/`**

Required outcome:

- add module-level JSDoc where missing on non-trivial files
- add or refine export-level JSDoc for helpers, route handlers, React components, workflow functions, provider adapters, and UI utilities where intent or invariants are not obvious
- add targeted inline comments only for non-obvious logic
- do not add noisy comments that merely restate the code

### 5. Cleanup and dead-code gap

The repo appears to contain legacy or unreferenced modules that should either be removed, consolidated, or explicitly wired into the current architecture.

Examples to verify and clean up when confirmed safe:

- `src/components/admin/category-management-screen.js`
- `src/components/admin/media-library-screen.js`
- `src/components/public/share-actions.js`
- `src/features/auth/index.js`
- `src/features/i18n/activation.js`
- `src/features/media/media-library.js`

Required outcome:

- identify unused, duplicated, or obsolete modules
- remove dead files only when confirmed safe
- if a file is intentionally retained for a near-term path, document why and ensure it is not duplicating active logic unnecessarily
- remove redundant helpers, duplicate style blocks, and stale screen-specific primitives that no longer serve the current app

### 6. Code-efficiency gap

The repo should be tightened for maintainability and runtime efficiency without changing working product behavior.

Required outcome:

- reduce duplicated UI primitives and repeated styling logic
- keep client components lean
- minimize avoidable rerenders and unnecessary derived state
- extract reusable helpers only where it meaningfully reduces repetition or complexity
- avoid over-abstraction
- preserve the current product boundary and runtime behavior

### 7. Uniform component contract gap

Reusable UI components exist, but the contract must be enforced consistently.

Required outcome:

- shared components must own button sizing, icon spacing, disclosure headers, field spacing, validation placement, summary chips, and card padding
- route-specific code should compose the shared primitives instead of re-implementing them
- new variants should be added to shared primitives rather than copied locally

## Implementation Rules

1. Do **not** re-open already completed architecture unless the current code clearly violates the shipped contract.
2. Prefer consolidating existing components over introducing new parallel primitives.
3. Preserve behavior first; refactor only when it improves consistency, reuse, or clarity without regressions.
4. Treat admin UX consistency as a product contract, not a cosmetic cleanup.
5. Keep changes small, traceable, and easy to review.
6. When deleting code, confirm it is unreferenced or superseded.
7. When consolidating styles, centralize them in the existing shared admin UI layer rather than scattering new wrappers.

## Required File Focus

Prioritize the files below when applicable:

### Shared admin UI layer

- `src/components/admin/news-admin-ui.js`
- `src/components/admin/admin-form-modal.js`
- `src/components/admin/admin-form-primitives.js`
- `src/components/admin/checkbox-search-field.js`
- `src/components/common/searchable-select.js`

### Screens and route surfaces most likely to need consolidation

- `src/components/admin/stream-management-screen.js`
- `src/components/admin/stream-form-card.js`
- `src/components/admin/provider-filter-fields.js`
- `src/app/admin/page.js`
- `src/app/admin/jobs/page.js`
- `src/app/admin/settings/page.js`
- `src/app/admin/providers/page.js`
- `src/app/admin/destinations/page.js`
- `src/app/admin/streams/page.js`
- `src/app/admin/posts/[id]/page.js`
- `src/app/admin/posts/review/page.js`
- `src/app/admin/posts/published/page.js`
- `src/app/admin/media/page.js`
- `src/app/admin/categories/page.js`
- `src/app/admin/templates/page.js`
- `src/app/admin/seo/page.js`

### Cleanup candidates to verify

- `src/components/admin/category-management-screen.js`
- `src/components/admin/media-library-screen.js`
- `src/components/public/share-actions.js`
- `src/features/auth/index.js`
- `src/features/i18n/activation.js`
- `src/features/media/media-library.js`

### Documentation targets

- all changed files above
- `README.md`
- `app-write-up.md`
- `dev-plan/22_performance_and_scalability.md`
- any other repo-truth docs affected by cleanup, consolidation, or UI contract changes

## Testing And Verification Requirements

Add or update tests only where behavior or reusable UI contracts change.

Cover at least:

- shared admin button sizing and icon alignment where testable
- responsive table/card behavior on narrow viewports where existing test strategy allows it
- disclosure auto-open and validation visibility behavior after refactors
- stream-management and admin action layouts after shared primitive consolidation
- cleanup-sensitive areas so deleted or merged modules do not silently remove active functionality
- any helper extraction that changes branching or render behavior

Also verify:

- lint passes
- tests pass
- no admin route loses functionality after cleanup
- no regression in shared-fetch, fetch-window, website publishing, AI fallback, or Meta pacing flows while performing UI/documentation refactors

## Acceptance Criteria

The work is complete only if all of the following are true:

- the updated prompt addresses only real remaining gaps rather than re-describing already completed work
- admin UI primitives are reused consistently across screens
- the admin app is fully responsive across common viewport sizes
- horizontal alignment is visibly consistent across major screens and modals
- unnecessary or dead files are removed or explicitly justified
- duplicated styling and one-off UI primitives are reduced materially
- changed files are properly documented with professional JSDoc
- repo-truth docs reflect the final shared UI and cleanup decisions accurately
- no working NewsPub runtime behavior is regressed while closing these gaps

## Delivery Rules

- make the smallest change set that fully closes the confirmed gaps
- do not pad the implementation with speculative redesign work
- do not duplicate existing architecture in parallel files
- prefer deletion and consolidation over adding new layers when safe
- keep the final repo cleaner, more uniform, more responsive, and easier to maintain than before

