You are a senior Next.js 16, React 19, and web performance engineer.

I need you to refactor this NewsPub codebase to materially improve website performance without changing the product behavior, visual design intent, SEO semantics, editorial workflows, or public URLs.

## Primary goals

1. Reduce public-route client JavaScript.
2. Improve LCP, INP, CLS, and TTFB.
3. Reduce duplicate server work and database over-fetching.
4. Improve route-level code splitting.
5. Add performance budgets and regression tooling.

## Context

This is a Next.js App Router codebase with a public site and admin interface.
The public site currently appears to have a large shared client baseline and repeated server/database work.

## High-priority problems to fix

### A. Make the public app shell server-first
- Audit `src/app/layout.js`, `src/components/common/app-providers.js`, `src/styles/styled-registry.js`, and `src/app/[locale]/layout.js`.
- Remove any unnecessary client wrappers from the public route tree.
- Keep the root layout server-first wherever possible.
- Only use client components for isolated interactive islands.

### B. Reduce shared public JS
- Refactor `src/components/layout/site-header.js` so the default header shell is server-rendered.
- Split mobile menu, search dialog, and other interactive header behaviors into dynamically loaded client islands.
- Eliminate route-wide `useSearchParams()` usage when server props can provide the required state.

### C. Remove unused client locale context
- Audit `src/features/i18n/locale-provider.js`.
- If `useLocaleMessages()` is not used, remove the provider entirely.
- If only a few client components need locale/messages, pass props directly.

### D. Improve route-level code splitting
- Break up `src/components/public/index.js` into route-specific modules.
- Avoid importing search-only or home-only client components into routes that do not need them.
- Ensure home, collection, and story routes each load only the client code they actually need.

### E. Replace heavyweight public form controls with simpler alternatives
- Replace public-facing `SearchableSelect` usage with a native `<select>` or a much lighter alternative.
- Preserve accessibility and current functionality.
- Keep the richer searchable control only where it is truly justified, such as admin surfaces.

### F. Stop over-fetching on listing pages
- Replace broad `publicPostSelect` usage on home/news/category/search listing routes with a lean card-specific select.
- Create separate Prisma selects for:
  - card/listing data
  - story detail data
  - metadata/SEO data
- Do not fetch `contentHtml`, `contentMd`, `structuredContentJson`, or large SEO payloads for listing cards unless absolutely required.

### G. Remove duplicate server work
- Audit all `generateMetadata()` and page-render pairs.
- Where the same data is loaded twice, refactor to share memoized loaders.
- Use `cache()` and/or `unstable_cache()` appropriately.
- Keep correctness and revalidation semantics intact.

### H. Cache expensive aggregate data
- Audit `getPublishedCategoryNavigationData()` and `getPublishedSearchFilterData()`.
- Prevent per-request recomputation of category counts and country counts for every public page.
- Use cache tags or snapshot/precomputed tables where appropriate.
- Revalidate when publishing changes affect those aggregates.

### I. Improve image delivery
- Audit `src/components/common/responsive-image.js` and the media pipeline.
- Avoid bypassing `next/image` for common editorial images.
- Normalize remote images through a known proxy or ingestion pipeline so they can be optimized.
- Ensure correct dimensions, `sizes`, and LCP treatment for likely hero images.

### J. Refactor search for scale
- Audit the search pipeline in `src/features/public-site/index.js`.
- Replace broad `contains` matching plus JavaScript-side ranking with a more scalable search approach.
- Prefer database full-text search or a dedicated search service.
- Keep result quality strong while reducing server cost and latency.

### K. Add caching for public incremental APIs
- Audit:
  - `src/app/api/public/latest-stories/route.js`
  - `src/app/api/public/collection-stories/route.js`
- Add safe cache semantics for public non-personalized responses.
- Keep freshness acceptable for a news product.

### L. Add performance governance
- Add Lighthouse CI.
- Add a bundle analyzer or equivalent build-time reporting.
- Add performance budgets for key public routes.
- Add Core Web Vitals RUM instrumentation.
- Add synthetic monitoring coverage for key templates.

## Constraints

- Do not break existing routes, SEO metadata, structured data, or locale behavior.
- Do not remove public search, story pages, category pages, or admin workflows.
- Keep accessibility intact or improve it.
- Preserve visual appearance as closely as possible.
- Prefer incremental, reviewable refactors over a risky rewrite.
- Keep server/client boundaries explicit and minimal.

## Deliverables

1. A concrete refactor plan ordered by ROI.
2. The code changes.
3. Before/after bundle impact estimates.
4. Before/after route impact estimates for home, category, story, and search pages.
5. A short explanation of tradeoffs.
6. A checklist of follow-up validation steps.

## Output format

Respond with:
1. `Findings`
2. `Refactor plan`
3. `Code changes`
4. `Performance impact estimate`
5. `Validation checklist`
6. `Risks and tradeoffs`

Where possible, include exact files to edit and explain why each change improves LCP, INP, CLS, TTFB, or bundle size.