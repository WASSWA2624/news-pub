# 04 Database Schema

Source sections: 8, 11, 12, 13, 14, 15, 18, 21.
Atomic aspect: schema and migrations only.
Prerequisite: step 03.

## Goal

Implement the full Prisma schema for NewsPub Release 1.

## Reuse First

- Keep compatible core models such as `Locale`, `User`, `AdminSession`, `Category`, `Post`, `PostTranslation`, `MediaAsset`, `MediaVariant`, `SEORecord`, `ViewEvent`, and `AuditEvent`.
- Replace incompatible equipment, manufacturer, AI, prompt, generation, and comment models instead of layering new models on top of them.

## Implement

1. Add or repurpose the core NewsPub models: `NewsProviderConfig`, `Destination`, `PublishingStream`, `StreamCategory`, `ProviderFetchCheckpoint`, `FetchedArticle`, `ArticleMatch`, `DestinationTemplate`, and `PublishAttempt`.
2. Define the exact enum families listed in section `8`.
3. Add the required joins and uniqueness rules:
   - one checkpoint per stream
   - one `ArticleMatch` per `FetchedArticle` and stream
   - unique provider config per provider key
   - unique destination identity per platform and external account id
4. Reuse `Post` and `PostTranslation` as the canonical rendered-content store and link them back to the normalized article flow.
5. Keep Markdown, HTML, and structured JSON fields on `PostTranslation`.
6. Remove obsolete schema objects for equipment families, manufacturers, source-research generation, prompt templates, AI provider configs, and public comments.
7. Add the first NewsPub migration from an empty database state.

## Required Outputs

- `prisma/schema.prisma`
- NewsPub migration files

## Verify

- `prisma validate` passes
- migration from an empty database succeeds
- every model, enum, and join described in section `8` exists
- no retired AI, equipment, manufacturer, or comment schema objects remain active

## Exit Criteria

- the database schema is complete enough for seeds, auth, and feature implementation
