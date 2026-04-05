# 01 Architecture Decisions

Source sections: 1, 3, 4, 5, 6, 8, 22, 23, 25.
Atomic aspect: architecture decisions only.
Prerequisite: none.

## Goal

Freeze the high-level NewsPub architecture before any large-scale repo reshaping starts.

## Reuse First

- Reuse the current Next.js, Prisma, styled-components, auth, env, storage, SEO, analytics, and scheduled-worker foundations.
- Reuse locale-prefixed public routing and non-locale admin routing.
- Reuse `Post` and `PostTranslation` as the canonical render layer instead of inventing a parallel content store.

## Implement

1. Create or update ADRs that freeze the retained stack and explicitly remove the old AI architecture from Release 1.
2. Freeze the public and admin route families defined in sections `5` and `6`.
3. Freeze the core data-layer split: `FetchedArticle` for normalized provider data, `ArticleMatch` for stream evaluation, `Post` for canonical rendered content, and `PublishAttempt` for outbound delivery history.
4. Freeze the stream model as the per-destination automation unit.
5. Freeze the review model: `AUTO_PUBLISH` and `REVIEW_REQUIRED`.
6. Freeze the lifecycle rule that `PostStatus` and `EditorialStage` remain separate.
7. Freeze the security rule that news-provider secrets are env-only and destination tokens are encrypted at rest.
8. Freeze the module reuse and removal map from section `23` so later steps extend the chosen architecture instead of branching away from it.

## Required Outputs

- ADR documents under `docs/adr/`
- an updated `docs/architecture-summary.md`

## Verify

- no ADR or summary document references AI generation, prompt catalogs, equipment research, or public comments as active Release 1 architecture
- every required public and admin route family is documented
- the retained, repurposed, and removed module boundaries match section `23`
- the ADRs do not contradict `app-write-up.md`

## Exit Criteria

- stack, routing, lifecycle, security, and reuse decisions are frozen for later steps
