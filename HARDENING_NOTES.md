# NewsPub Hardening Notes

## What changed

- Public homepage rendering now uses ISR revalidation instead of forced dynamic rendering.
- Public search now counts in the database and ranks only bounded candidate windows in application code.
- Public DB outage handling now returns intentional empty or temporary-unavailable models for home, search, category, story, sitemap, and SEO summaries.
- Admin snapshots now use `_count`, `groupBy`, selective projections, and bounded result sets instead of loading large relation trees for counts.
- Analytics dashboard queries now use grouped/count queries for status, audit, trend, and story view totals.
- Remote media ingestion now checks `Content-Length`, streams with a max-size guard, uses timeout protection, limits Sharp concurrency, and avoids repeated image decodes.
- Provider and Meta publisher requests now use an explicit timeout and bounded retry policy for transient network, 429, and 5xx failures.
- Remote image optimization is restricted to an allowlist from `flagcdn.com`, `NEXT_PUBLIC_APP_URL`, `S3_MEDIA_BASE_URL`, and `NEXT_IMAGE_REMOTE_HOSTS`. Arbitrary remote article images render through plain `img` instead of Next image optimization.
- cPanel packaging removes dev dependencies from the generated runtime manifest, rejects `.env*.local` files, and loads env files deterministically.

## Behavior differences

- Admin directory pages return bounded record sets while summaries use database counts.
- Public country filter counts prefer a database aggregation path and fall back to the older Prisma selection path if the SQL JSON aggregation is unavailable.
- External upstream calls can now fail faster with network/timeout-specific statuses instead of hanging.
- Production media guidance now prefers S3-compatible object storage. Local media remains supported only for persistent, redeploy-safe directories.

## Deployment actions

- Delete any `.env*.local` files from the repository root and cPanel package source.
- Rotate any credentials that were previously shared or stored in local env files.
- Use `.env.development` for local development, `.env.production` only when cPanel environment variables are not available, and `.env` as the final fallback.
- Set `NEXT_IMAGE_REMOTE_HOSTS` to trusted extra media/CDN hostnames.
- For production, prefer `MEDIA_DRIVER=s3` with durable bucket credentials and `S3_MEDIA_BASE_URL`.
- Rebuild and upload `dist/cpanel` after running the verification checklist.
