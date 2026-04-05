# 13 Filtering Publishability And Deduplication

Source sections: 8, 11, 12, 13, 14, 19, 21.
Atomic aspect: filtering, match evaluation, persistence rule enforcement, and dedupe only.
Prerequisite: step 12.

## Goal

Evaluate normalized articles against stream rules, persist only allowed records, and prevent duplicate publication.

## Reuse First

- Reuse existing feature-module patterns for list filtering, persistence helpers, and queue-oriented queries.
- Keep eligibility and duplicate logic centralized instead of spreading it across destination publishers.

## Implement

1. Apply category, locale, language, country, region, include-keyword, and exclude-keyword filters after normalization.
2. Produce explicit `ArticleMatch` decisions with machine-readable reasons.
3. Persist only publishable or published normalized articles and their matches.
4. Reject non-publishable items from article persistence while still recording aggregate run counts and error metadata.
5. Implement time-aware deduplication using provider ids, source URLs, normalized titles, published timestamps, stream ids, and destination history.
6. Mark matches as `ELIGIBLE`, `HELD_FOR_REVIEW`, `DUPLICATE`, or `SKIPPED` before any publish attempt is created.
7. Add manual override hooks only where the workflow explicitly allows them.

## Required Outputs

- filtering and eligibility services
- dedupe helpers and tests
- `ArticleMatch` persistence flow
- fetch-to-match orchestration updates

## Verify

- duplicate items are blocked per destination and stream rules
- filtered-out items are not stored as full `FetchedArticle` rows
- every persisted match includes a reasoned status
- eligibility outcomes drive the next workflow step deterministically

## Exit Criteria

- NewsPub can decide what is publishable, what must be held, and what must be skipped without duplicating content
