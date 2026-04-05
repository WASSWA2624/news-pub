# 23 Performance and Scalability

Date: 2026-04-03

## Implemented Changes

- Added route-level `revalidate = 300` on published locale pages so the public release can use timed caching instead of `force-dynamic`.
- Kept `unstable_cache` on published public data loaders and tightened invalidation coverage for home, blog, post, category, equipment, and manufacturer routes.
- Extended public post revalidation to include manufacturer landing pages, not only blog/category/equipment paths.
- Added best-effort public cache revalidation after editorial updates and localized content saves, alongside the existing scheduled publishing worker revalidation flow.
- Paginated long admin lists server-side:
  - post inventory: 24 items per page
  - comment moderation: 20 items per page
- Reduced public list query payload size by removing full translation bodies from card/list queries that only need title, excerpt, and structured hero metadata.
- Improved public image delivery with intrinsic dimensions, responsive `srcSet`, `sizes`, eager/high-priority article hero loading, and deferred below-the-fold card/section rendering hints.

## Query and Cache Strategy Notes

### Public cache strategy

- Published locale routes now export `revalidate = 300`, matching the feature-level public data cache TTL.
- Public reads continue to flow through `unstable_cache` in `src/features/public-site/index.js`.
- Targeted revalidation now runs from three paths:
  - immediate editorial state changes in `src/features/posts/editorial-workflow.js`
  - published locale content saves in `src/features/posts/localized-content.js`
  - scheduled publishing worker runs in `src/lib/jobs/scheduled-publishing.js`
- Revalidation path coverage includes:
  - `/`
  - `/sitemap.xml`
  - locale home
  - locale blog index
  - locale blog post
  - locale category pages touched by the post
  - locale equipment page touched by the post
  - locale manufacturer pages touched by the post

### Query strategy

- Public list-card queries no longer select `contentMd`, `contentHtml`, or FAQ payloads when only summary cards are rendered.
- Search keeps the richer translation select because ranking still uses body-text signals.
- Post inventory pagination now counts matching rows separately and fetches only the active page using server-side `skip` and `take`.
- Comment moderation pagination now counts filtered rows separately and fetches only the active page, while still loading the selected comment detail pane independently.

### Analytics isolation validation

- Public page reads remain isolated from analytics writes:
  - public rendering is served from `src/features/public-site/index.js`
  - view writes go through `/api/analytics/views` into `ViewEvent`
- No public post lookup joins against `viewEvent`, so append-only traffic writes do not sit on the post read path.
- The worker and admin analytics flows continue to aggregate from audit/view tables separately from published content reads.

## Baseline Evidence

### Verification

- `npm run lint`: passed
- `npm test`: passed, 31 files and 110 tests
- `npm run build`: passed

### Production-mode request timings

Measured against `next start` on local production output, using the seeded admin account for authenticated admin routes.

| Route | Pass | Status | Time |
| --- | --- | --- | --- |
| `/en` | cold | 200 | 10.1 ms |
| `/en/blog` | cold | 200 | 290.8 ms |
| `/en/search?q=microscope` | cold | 200 | 37.9 ms |
| `/en/about` | cold | 200 | 16.9 ms |
| `/en` | warm | 200 | 8.7 ms |
| `/en/blog` | warm | 200 | 38.4 ms |
| `/en/search?q=microscope` | warm | 200 | 21.1 ms |
| `/en/about` | warm | 200 | 7.2 ms |
| `/admin` | authenticated | 200 | 187.2 ms |
| `/admin/posts/drafts` | authenticated | 200 | 42.4 ms |
| `/admin/comments` | authenticated | 200 | 40.8 ms |
| `/admin/jobs` | authenticated | 200 | 49.1 ms |

### Build notes

- Next.js now reports the locale home route as SSG with a 5 minute revalidation window.
- The build no longer reports the earlier Turbopack NFT tracing warning rooted in the media storage route import chain.
