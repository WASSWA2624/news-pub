# Performance Monitoring and CI

## Real-User Monitoring

NewsPub now persists Core Web Vitals into `webvitalmetric` and exposes an internal dashboard at `/admin/performance`.

Captured fields include:

- metric name and value
- normalized route path and route group
- locale
- form factor
- build id via `NEXT_PUBLIC_RELEASE_ID`
- viewport and connection hints
- limited attribution payload for debugging

The ingestion path is:

1. `src/components/analytics/web-vitals.js`
2. `POST /api/analytics/web-vitals`
3. `recordWebVitalMetric()` in `src/lib/analytics/index.js`
4. `getAdminPerformanceSnapshot()` in `src/features/performance/index.js`

## Thresholds

The admin dashboard treats these p75 thresholds as the default alert policy:

- `LCP`: warning `2500ms`, poor `4000ms`
- `INP`: warning `200ms`, poor `500ms`
- `CLS`: warning `0.10`, poor `0.25`
- `TTFB`: warning `800ms`, poor `1800ms`
- `FCP`: warning `1800ms`, poor `3000ms`

## CI Gates

Three workflows enforce performance drift:

- `perf-lighthouse.yml`: builds against a seeded MariaDB dataset and runs Lighthouse on home, news, search, and a stable story fixture.
- `perf-route-entry-sizes.yml`: builds the app and fails when route-entry JavaScript exceeds the checked-in budget file.
- `perf-bundle-analysis.yml`: produces static `@next/bundle-analyzer` reports and uploads them as artifacts for PR review.

Route-entry budgets live in `scripts/perf/route-entry-budgets.json`. The route-size report is emitted to `.next/perf/route-entry-sizes.json`.

## Local Verification

To reproduce the performance toolchain locally:

1. `npx prisma migrate deploy`
2. `npm run prisma:seed`
3. `npm run perf:fixtures`
4. `npm run build`
5. `npm run perf:routes:check`
6. `npm run perf:lighthouse`

To generate bundle reports:

1. `npm run build:analyze`
2. Open `.next/analyze/client.html` and `.next/analyze/nodejs.html`

## Migration Notes

- Run `npx prisma migrate deploy` so the `webvitalmetric` table, the new listing/search indexes, and the fulltext index on `posttranslation.contentMd` exist before enabling the new search path in production.
- If you want release-segmented dashboards, set `NEXT_PUBLIC_RELEASE_ID` in each deployment environment instead of relying on the package version fallback.
