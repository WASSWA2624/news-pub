You are a senior Next.js 16 performance engineer working on the NewsPub codebase.

Your objective is to implement a production-grade website performance hardening pass focused on:

1. Core Web Vitals (especially LCP, INP, CLS)
2. lower TTFB for public routes
3. smaller client bundles
4. better image delivery
5. durable performance monitoring and CI regression prevention

## Context

This is a Next.js 16 App Router application using React 19, Prisma, styled-components, and a public news site with home, news index, category, search, and story pages.

The codebase already includes:

- Lighthouse CI scripts in `package.json`
- a Lighthouse config in `.lighthouserc.cjs`
- a route entry-size script at `scripts/perf/print-route-entry-sizes.js`
- `@next/bundle-analyzer` wiring in `next.config.mjs`
- route revalidation on public pages
- cacheable public API responses
- a client-side Web Vitals sender in `src/components/analytics/web-vitals.js`

However, the current gaps are:

- arbitrary remote editorial images often fall back to plain `<img>` instead of an optimized first-party image pipeline
- Web Vitals are collected client-side but not persisted/aggregated in production
- Lighthouse and bundle tooling are not enforced by CI in the attached repo
- search is expensive because it loads large candidate sets and ranks in app code using `contentMd`
- listing pages perform repeated count + fetch patterns that may inflate TTFB under load
- “load more” requests use `cache: "no-store"` despite cacheable API responses
- public rendering depends heavily on styled-components runtime
- no route-level loading states / streaming boundaries are evident for public pages

## Files to inspect first

- `next.config.mjs`
- `.lighthouserc.cjs`
- `package.json`
- `src/components/common/responsive-image.js`
- `src/components/analytics/web-vitals.js`
- `src/app/api/analytics/web-vitals/route.js`
- `src/components/public/home-latest-stories.js`
- `src/app/[locale]/search/page.js`
- `src/features/public-site/index.js`
- `scripts/perf/print-route-entry-sizes.js`

## Deliverables

Produce the work in small, reviewable commits or patches and include code, config, and documentation updates.

### Deliverable 1 — Image delivery hardening

Implement an approach that ensures editorial images are performance-safe:

- stop relying on arbitrary third-party hosts for above-the-fold images
- route editorial media through first-party storage/CDN or a controlled image proxy
- ensure story hero images, list-card images, and category/search thumbnails are optimizer-friendly
- preserve width/height to avoid CLS
- add placeholder/blur strategy where appropriate
- ensure responsive `sizes` are correct for actual layouts
- keep lazy loading for below-the-fold media
- keep eager/high-priority loading only for the true LCP candidate

Also add a short ADR or markdown note explaining the chosen image strategy and tradeoffs.

### Deliverable 2 — Real-user performance observability

Turn the current Web Vitals hook into a production-usable monitoring system:

- persist incoming metrics from `src/components/analytics/web-vitals.js`
- store enough metadata to analyze by route, metric, device/form factor, and release/build id
- add aggregation or summary queries for p75 values
- create an internal dashboard route or exportable report/query shape
- define alert thresholds for LCP, INP, and CLS regressions
- document how to operate it

Keep the payload privacy-conscious and lightweight.

### Deliverable 3 — CI performance gates

Add repository automation so performance regressions fail fast:

- create CI workflows for Lighthouse, route entry-size analysis, and bundle analysis
- run against the most important public routes
- publish artifacts for review
- fail on meaningful regressions, not noisy micro-variance
- add clear thresholds for:
  - performance score
  - LCP
  - TBT / interaction-related lab signal
  - CLS
  - route JS size / asset growth

Prefer workflows that are reliable in CI and easy for maintainers to understand.

### Deliverable 4 — Search and listing performance optimization

Refactor public search and listing data flows to reduce TTFB and server cost:

- reduce over-fetching in search candidate selection
- avoid loading `contentMd` in the first pass where possible
- move ranking/filtering closer to the database or a proper search index
- verify or add appropriate Prisma / DB indexes
- reduce duplicate count queries where feasible
- evaluate cursor-based pagination where it improves performance without harming UX
- preserve correctness and result quality

Include before/after reasoning and any migration steps.

### Deliverable 5 — Client fetch and caching cleanup

Improve incremental client-side loading:

- remove unnecessary `cache: "no-store"` from public “load more” calls unless strictly required
- honor HTTP caching semantics where safe
- add request cancellation / de-duping for repeated clicks or route transitions
- keep the UX resilient with loading, error, and retry behavior

### Deliverable 6 — Public rendering and bundle cost review

Review the public route surface for avoidable client/runtime cost:

- identify public components that should remain server components
- confirm that only essential interactive islands are client components
- measure the cost of styled-components on public routes
- reduce client JavaScript where possible
- split or isolate heavy client modules where necessary
- use the latest Next.js 16 bundle analysis options where appropriate

Do not rewrite everything blindly. Prefer targeted wins with measurable impact.

### Deliverable 7 — Perceived performance improvements

Improve user-perceived speed on slower routes:

- add route-level loading states and/or Suspense boundaries where beneficial
- stream non-critical secondary content when it improves perceived responsiveness
- ensure skeletons/loading UI do not cause layout shift

## Constraints

- preserve existing product behavior and editorial functionality
- preserve SEO behavior, canonical metadata, structured data, and crawlability
- do not introduce regressions in locale-aware routing
- keep accessibility intact or improved
- avoid introducing vendor lock-in unless clearly justified
- prefer production-safe, observable changes over superficial score-chasing

## Output format

Return:

1. a concise implementation plan
2. the exact code/config changes
3. any migration steps
4. a verification checklist
5. a before/after performance hypothesis for each major change
6. any follow-up risks or tradeoffs

## Success criteria

The final state should make this codebase materially stronger against:

- Lighthouse / PageSpeed Insights
- WebPageTest / GTmetrix
- Chrome DevTools trace analysis
- CrUX / RUM monitoring
- ongoing bundle-size and route-regression checks

Prioritize the highest-impact fixes first, especially image delivery, observability, CI enforcement, and search/listing TTFB.