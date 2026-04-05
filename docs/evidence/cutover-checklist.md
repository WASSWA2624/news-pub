# Cutover Checklist

Generated on 2026-04-05.

## Removed Legacy Product Shape

- [x] Retired AI, generation, research, comment, and equipment/manufacturer modules removed from active runtime paths
- [x] Active branding switched to NewsPub
- [x] Public and admin route families aligned to `app-write-up.md`

## Database And Bootstrap

- [x] Prisma schema aligned to NewsPub Release 1
- [x] NewsPub baseline migration generated from the current schema
- [x] Local bootstrap script switched from `db push` to `migrate deploy`
- [x] Seed script remains idempotent and NewsPub-specific

## Environment

- [x] `.env.example` reflects NewsPub keys
- [x] Provider credentials remain env-only
- [x] Destination token encryption key is required

## Publishing And Discovery

- [x] Website publication revalidates public paths
- [x] Facebook and Instagram publish through shared `PublishAttempt` workflows
- [x] Failed retryable publish attempts can be retried automatically and manually
- [x] Sitemap, robots, metadata, search, and analytics are wired to published stories

## Verification

- [x] `npx prisma validate`
- [x] `npm test`
- [x] `npm run lint`
- [x] `npm run build`

