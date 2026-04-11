# Task: harden NewsPub for performance, local reliability, and cPanel deployment stability

You are working on the NewsPub codebase (Next.js App Router, Prisma, MySQL/MariaDB, standalone cPanel deployment package).

## Objective

Close the currently identified performance gaps and runtime/deployment failure points without changing core product behavior.

Keep the app functionally equivalent, but make it:
- faster on public and admin routes
- safer and more deterministic locally
- more reliable on cPanel/shared hosting
- more secure in env/config handling

## Critical findings to fix

### A. Secrets and environment hygiene
1. Remove committed/populated `.env.development.local` and `.env.production.local` from the repository/package source.
2. Ensure only `.env.example` is committed.
3. Add a hard repo/package check that fails when any `.env*.local` file is present in tracked source or release bundles.
4. Rotate any exposed secrets and replace weak bootstrap credentials.
5. Make deployment env precedence explicit and deterministic.

### B. Prevent whole-app boot failure from nonessential env coupling
1. Audit `src/lib/env/server.js`, `src/lib/env/runtime.js`, and all eager imports of `env`.
2. Keep required env validation for truly global runtime requirements, but avoid blocking the entire public app for feature-specific settings that are not needed at boot.
3. Reduce top-level env coupling in `src/app/layout.js` and similar root modules.
4. Preserve clear validation errors, but scope them to the feature that needs them where possible.

### C. Remove unnecessary dynamic rendering
1. Review `src/app/[locale]/page.js`.
2. Remove `force-dynamic` unless there is a hard requirement for per-request rendering.
3. Prefer ISR/revalidation for the public homepage and other cacheable public routes.
4. Keep correctness for newly published content by using targeted revalidation, not blanket dynamic rendering.

### D. Fix public search scalability
1. Refactor `searchPublishedStories()` in `src/features/public-site/index.js`.
2. Do not fetch and rank the full matching result set in JavaScript.
3. Replace the current approach with a bounded DB-first strategy such as:
   - prefiltered candidate window
   - SQL/Prisma ordering on strong fields first
   - capped ranking candidate set
   - optional lightweight app-side ranking only on a small bounded subset
4. Keep pagination accurate.
5. Keep current functional behavior as closely as possible.

### E. Replace in-memory counting over large relation trees
1. Refactor:
   - `getPublishedCategoryCounts()`
   - `getPublishedCountryCounts()`
   - SEO/category summary builders
   - admin category/settings/media/stream snapshots
2. Replace large nested includes used only for counts with:
   - Prisma `_count`
   - grouped queries
   - selective projections
   - bounded result sets
3. Avoid loading full related record arrays just to compute `.length`.

### F. Paginate and trim admin snapshots
1. Review:
   - `src/features/streams/index.js`
   - `src/features/settings/index.js`
   - `src/features/media/index.js`
   - `src/features/categories/index.js`
   - `src/features/templates/index.js`
   - `src/features/providers/index.js`
2. Add pagination or bounded summaries where screens currently load whole tables.
3. Use summary endpoints or count-only queries where the UI does not need full nested data.
4. Reduce response payload size and remove unnecessary relation trees.

### G. Fix analytics query shape
1. Review `src/features/analytics/index.js`.
2. Stop loading raw 7-day event rows into memory when only counts/trends are needed.
3. Replace with aggregated/grouped queries where possible.
4. Replace loading `viewEvents` arrays for posts with `_count`.
5. Keep dashboard output shape stable or minimally changed.

### H. Make public route DB fallback consistent
1. Review all public-site loaders and route metadata functions.
2. Apply a consistent database-unavailable strategy across:
   - home
   - story
   - category
   - search
   - sitemap/SEO routes
3. Avoid some public routes returning graceful empty/fallback responses while others crash with 500 for the same DB outage class.
4. Preserve `notFound()` behavior for true missing content, not for DB connectivity failures.

### I. Harden remote media ingestion
1. Review `src/features/media/index.js`.
2. Enforce max size before full download whenever possible:
   - use `Content-Length` pre-check when present
   - stream/abort downloads that exceed the limit
   - do not call `arrayBuffer()` on arbitrarily large responses
3. Keep MIME validation strict.
4. Fail safely and clearly on oversized or invalid remote media.

### J. Reduce media upload CPU and request latency
1. Move Sharp variant generation off the critical request path where practical, or at minimum:
   - bound concurrency
   - reuse metadata
   - avoid repeated full decodes when possible
2. Keep original upload correctness and stored variants behavior.
3. Make this safe for low-memory cPanel environments.

### K. Add network timeouts and bounded retry strategy
1. Review all outbound fetches in:
   - `src/lib/news/providers.js`
   - `src/lib/news/publishers.js`
   - any other external integration modules
2. Add:
   - `AbortSignal.timeout(...)` or equivalent
   - bounded retry policy for transient failures only
   - clearer error classification
3. Ensure no upstream call can hang a request indefinitely.

### L. Tighten remote image policy
1. Review `next.config.mjs`.
2. Replace open wildcard remote image host patterns with an allowlist or a controlled policy.
3. Preserve required image rendering behavior, but do not allow unrestricted arbitrary remote optimization.

### M. Make production storage cPanel-safe
1. Review local media storage assumptions in `src/lib/storage/index.js` and production env guidance.
2. Ensure production guidance does not rely on fragile app-root local storage unless explicitly intended.
3. Prefer durable object storage for production paths, or clearly isolate and protect local media directories from redeploy overwrite behavior.
4. Document the exact production-safe storage strategy.

### N. Slim and harden the cPanel package
1. Review `scripts/build-cpanel-package.js` and the generated `dist/cpanel/package.json`.
2. Remove unnecessary dev dependencies from the deployment package.
3. Minimize package size and install work on cPanel.
4. Keep Prisma runtime and Sharp/native dependencies working for the target host.
5. Make the packaging process deterministic and document platform assumptions clearly.
6. Verify the package is produced in a way that matches the target Linux runtime.

### O. Build reliability
1. Review build-time dependencies such as `next/font/google`.
2. Make local/cPanel package builds more resilient in restricted-network environments where possible.
3. Document any unavoidable network dependency clearly.

## Guardrails

- Do not change product behavior unless required by one of the fixes above.
- Do not remove existing validation, auth, or publishing safeguards.
- Keep current route structure and API contracts stable where possible.
- Prefer small, targeted refactors over a rewrite.
- Use `_count`, `select`, `take`, `skip`, and grouped query strategies aggressively.
- Favor deterministic behavior on cPanel/shared hosting over idealized cloud assumptions.

## Deliverables

1. Code changes implementing the fixes above.
2. A short `HARDENING_NOTES.md` that lists:
   - what was changed
   - why it was changed
   - any behavior differences
   - any deployment actions required
3. Updated deployment notes for cPanel.
4. Updated env guidance and release hygiene checks.

## Acceptance criteria

- No populated `.env*.local` files are present in the source or release bundle.
- Public homepage is cacheable/revalidated instead of forced dynamic unless strictly required.
- Search no longer ranks the full dataset in memory.
- Admin snapshots and analytics paths do not load whole tables or full relation trees unnecessarily.
- Public DB outage behavior is consistent and intentional across routes.
- Remote media ingestion does not fully buffer oversized files before rejecting them.
- External provider/publisher requests have explicit timeout protection.
- Remote image host policy is no longer an unrestricted wildcard.
- cPanel deployment package is smaller and contains only what runtime needs.
- Local dev, local build, and cPanel deployment paths are documented and deterministic.

## Verification checklist

Run and report results for:
- `npm run repo:check`
- `npm run prisma:generate`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run build:cpanel`

Also provide a brief manual verification summary for:
- public homepage
- public search
- category page
- story page
- admin dashboard
- stream management
- media upload
- cPanel startup
- cPanel DB deploy/seed