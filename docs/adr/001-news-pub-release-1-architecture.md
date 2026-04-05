# ADR 001: NewsPub Release 1 Architecture

- Status: Accepted
- Date: 2026-04-05

## Context

The repository started from a retired equipment and AI-oriented product. Release 1 needs a stable NewsPub architecture without forking into a parallel app.

## Decision

- Reuse the existing Next.js App Router application, Prisma data layer, styled-components theme, auth helpers, env parser, storage adapter, SEO helpers, analytics helpers, and admin shell structure.
- Keep JavaScript as the application language for Release 1.
- Keep `Post` and `PostTranslation` as the canonical rendered-content layer.
- Introduce NewsPub-specific workflow models around that core:
  - `NewsProviderConfig`
  - `PublishingStream`
  - `ProviderFetchCheckpoint`
  - `FetchedArticle`
  - `ArticleMatch`
  - `DestinationTemplate`
  - `PublishAttempt`
- Remove the retired AI, prompt, research, comment, equipment, and manufacturer architecture from the active product.

## Consequences

- The app keeps a single coherent route tree and one shared persistence model.
- Ingest, review, and publication logic remain traceable without duplicating content stores.
- Release 1 work happens by repurposing mature infrastructure instead of rebuilding the repo from zero.

