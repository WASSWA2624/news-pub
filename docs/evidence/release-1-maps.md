# Release 1 Maps

Generated on 2026-04-05.

## Route Map

Public:

- `/` redirects to the default locale root.
- `/[locale]` renders the homepage with latest stories and category summaries.
- `/[locale]/news` renders the paginated published-story index.
- `/[locale]/news/[slug]` renders the published story page.
- `/[locale]/category/[slug]` renders a published category landing page.
- `/[locale]/search` renders public story search.
- `/[locale]/about`, `/privacy`, and `/disclaimer` render legal and informational pages.

Admin:

- `/admin` dashboard and operational summary
- `/admin/providers` provider catalog and request-default management
- `/admin/destinations` encrypted destination-token and connection management
- `/admin/streams` stream cadence, filters, and retry settings
- `/admin/categories` taxonomy management
- `/admin/posts/review` and `/admin/posts/published` inventory queues
- `/admin/posts/[id]` canonical story editor and publish control
- `/admin/media` media inventory
- `/admin/templates` destination template management
- `/admin/jobs` fetch, publish, retry, and audit visibility
- `/admin/seo` SEO coverage reporting
- `/admin/settings` runtime and release settings snapshot

## Environment Map

Public-safe:

- `NEXT_PUBLIC_APP_URL`
- `DEFAULT_LOCALE`
- `SUPPORTED_LOCALES`

Server-only:

- `DATABASE_URL`
- `SESSION_SECRET`
- `SESSION_MAX_AGE_SECONDS`
- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`
- `DESTINATION_TOKEN_ENCRYPTION_KEY`
- `REVALIDATE_SECRET`
- `CRON_SECRET`
- `DEFAULT_SCHEDULE_TIMEZONE`
- `INITIAL_BACKFILL_HOURS`

Provider env-only secrets:

- `MEDIASTACK_API_KEY`
- `NEWSDATA_API_KEY`
- `NEWSAPI_API_KEY`

Media configuration:

- `MEDIA_DRIVER`
- `LOCAL_MEDIA_BASE_PATH`
- `LOCAL_MEDIA_BASE_URL`
- `S3_MEDIA_BUCKET`
- `S3_MEDIA_REGION`
- `S3_MEDIA_BASE_URL`
- `S3_ACCESS_KEY_ID`
- `S3_SECRET_ACCESS_KEY`
- `UPLOAD_ALLOWED_MIME_TYPES`
- `MEDIA_MAX_REMOTE_FILE_BYTES`

## Schema Map

Identity and auth:

- `Locale`
- `User`
- `AdminSession`

Ingest and automation:

- `NewsProviderConfig`
- `PublishingStream`
- `ProviderFetchCheckpoint`
- `FetchedArticle`
- `ArticleMatch`
- `FetchRun`

Rendering and publication:

- `Post`
- `PostTranslation`
- `Destination`
- `DestinationTemplate`
- `PublishAttempt`
- `PostCategory`
- `StreamCategory`

Media and discovery:

- `MediaAsset`
- `MediaVariant`
- `SEORecord`

Observability:

- `ViewEvent`
- `AuditEvent`

## Workflow Map

1. Resolve provider config and checkpoint.
2. Fetch provider articles and normalize them into NewsPub shape.
3. Apply stream filters and duplicate detection.
4. Create or update canonical post artifacts and translations.
5. Create `ArticleMatch` and `PublishAttempt` records.
6. Publish to website, Facebook, or Instagram using destination-aware payloads.
7. Revalidate public discovery paths on website publication.
8. Retry failed retryable publish attempts by scheduler or manual admin action.
9. Surface analytics, audit logs, and publish history in the admin workspace.

