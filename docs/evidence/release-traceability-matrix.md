# Release Traceability Matrix

Generated on 2026-04-05.

| Write-up section | Requirement summary | Implementation evidence |
| --- | --- | --- |
| 1 | NewsPub product identity | `README.md`, `src/app/opengraph-image.js`, `src/app/twitter-image.js`, `src/components/common/news-pub-logo.js` |
| 2 | Release 1 goal set | `docs/architecture-summary.md`, `src/lib/news/workflows.js`, `src/features/public-site/index.js` |
| 3 | Reuse-first constraints | `docs/architecture-summary.md`, `docs/adr/001-news-pub-release-1-architecture.md` |
| 4 | Fixed stack and documentation standard | `package.json`, `docs/architecture-summary.md`, JSDoc in `src/lib/news/*`, `src/features/*` |
| 5 | Public route topology | build output, `src/app/[locale]/*`, `src/features/i18n/routing.js` |
| 6 | Admin route topology | build output, `src/app/admin/*`, `src/components/layout/admin-shell.js` |
| 7 | Environment contract | `.env.example`, `src/lib/env/runtime.js`, `src/test/test-env.js` |
| 8 | Persistence model | `prisma/schema.prisma`, `prisma/migrations/20260405213000_newspub_init/migration.sql` |
| 9 | Authentication and RBAC | `src/lib/auth/*`, `src/proxy.js`, `src/lib/auth/config.test.js`, `src/lib/auth/rbac.test.js` |
| 10 | Supported providers and credentials | `src/lib/news/providers.js`, `src/features/providers/index.js`, `/admin/providers` |
| 11 | Destination connections and streams | `src/features/destinations/index.js`, `src/features/streams/index.js`, `/admin/destinations`, `/admin/streams` |
| 12 | Fetch, incremental window, and normalization | `src/lib/news/providers.js`, `src/lib/news/workflows.js` |
| 13 | Filtering, publishability, and deduplication | `src/lib/news/workflows.js`, `prisma/schema.prisma` indexes and uniqueness constraints |
| 14 | Review workflow and publication state | `src/features/posts/index.js`, `/admin/posts/review`, `/admin/posts/[id]` |
| 15 | Media handling | `src/features/media/index.js`, `src/lib/storage/index.js`, `/admin/media` |
| 16 | Destination formatting and templates | `src/lib/news/workflows.js`, `src/features/templates/index.js`, `/admin/templates` |
| 17 | Website publication | `src/features/public-site/index.js`, `src/lib/revalidation/index.js`, website publish path in `src/lib/news/workflows.js` |
| 18 | Facebook and Instagram publication | `src/lib/news/publishers.js`, retry and attempt flow in `src/lib/news/workflows.js`, `/admin/jobs` |
| 19 | Scheduler, retries, and recovery | `src/lib/news/workflows.js`, `/api/jobs/scheduled-publishing`, `/admin/jobs` |
| 20 | SEO, search, and public discovery | `src/lib/seo/index.js`, `src/features/seo/index.js`, `/[locale]/search`, `/sitemap.xml`, `/robots.txt` |
| 21 | Analytics, logs, and auditability | `src/lib/analytics/index.js`, `src/features/analytics/index.js`, `AuditEvent`, `ViewEvent` |
| 22 | Security and compliance | `src/lib/security/*`, `src/lib/security/secrets.js`, `src/lib/env/runtime.js` |
| 23 | Repo reshape and module reuse map | removed legacy modules in `src/lib/*` and `src/features/*`, retained shells and shared infrastructure |
| 24 | Release 1 acceptance criteria | `docs/evidence/*`, passing `prisma validate`, `npm test`, `npm run lint`, `npm run build` |
| 25 | Source of truth rule | `README.md`, `docs/architecture-summary.md`, `dev-plan/*` alignment |

