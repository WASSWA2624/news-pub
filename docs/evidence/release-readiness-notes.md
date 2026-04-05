# Release Readiness Notes

Generated on 2026-04-05.

## Release State

The repository now presents itself as NewsPub across branding, routes, schema, workflow code, tests, and release documentation.

## Migration State

- Prisma migration history was reset to a NewsPub baseline generated from the current schema:
  - `prisma/migrations/20260405213000_newspub_init/migration.sql`
- Local bootstrap now uses `prisma migrate deploy` before seeding.

## Operational State

- Provider fetch, filtering, canonical story creation, review flow, website publication, social publication, retry scheduling, SEO, analytics, and audit logging are all wired into the active runtime.
- `/admin/jobs` exposes publish history and a manual retry action for failed attempts.

## Destination Notes

- Facebook publication supports page or profile feed publishing, with page-photo publishing when media is available and a feed fallback when photo publishing fails.
- Instagram automatic publishing uses the business-account media container flow.
- Instagram personal destinations remain storable in the schema and admin UI, but automatic publishing is intentionally blocked with an actionable runtime error because the adapter requires a publish-capable business account.

## Lockfile And Dependency State

- `package-lock.json` now matches the current NewsPub package manifest.
- Retired direct AI package entries are no longer present in the lockfile root dependencies.

