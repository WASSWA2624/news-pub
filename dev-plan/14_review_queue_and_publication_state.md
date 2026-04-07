# 14 Review Queue And Publication State

Source sections: 8, 14, 16, 18, 21, 23, 24.
Atomic aspect: review queues, canonical post editing, and publication lifecycle only.
Prerequisite: step 13.

## Goal

Implement the NewsPub editorial workspace for held stories, canonical post editing, and status transitions.

## Reuse First

- Repurpose the current post inventory and post editor screens instead of creating a new review application.
- Reuse the current split between persisted status and editorial-stage fields.

## Implement

1. Build `/admin/posts/review` as the held and ready-for-approval queue.
2. Build `/admin/posts/published` as the published inventory view.
3. Build `/admin/posts/new` as the manual story creation route that links into the same canonical post workflow.
4. Repurpose `/admin/posts/[id]` as the canonical NewsPub story editor.
5. Use `PostStatus` for lifecycle state, `EditorialStage` for editorial progression, and the article-match workflow and policy fields for optimization and approval readiness.
6. Wire stream-mode behavior:
   - `AUTO_PUBLISH` advances directly into queueing or publishing
   - `REVIEW_REQUIRED` creates or updates a draft post in the review queue
7. Support manual review, optimize, approve, reject, schedule, publish, retry, and archive actions from the post editor.
8. Keep the canonical post linked to the originating normalized article and its destination matches.
9. Show per-match optimization state and reason details in the review queue, post editor, and publish diagnostics so optional AI skip or fallback outcomes stay visible without blocking manual publication.

## Required Outputs

- review queue and published inventory screens
- manual story creation screen
- post editor screen updates
- publication-state APIs and tests

## Verify

- held stories appear in the review queue
- published stories appear only in the published inventory
- manual stories created from `/admin/posts/new` open in the canonical editor and respect the same scheduling and publish rules
- status and editorial stage remain separate persisted values
- manual optimize, approve, reject, publish, and schedule actions update the correct queue states and surface policy or optimization diagnostics clearly
- `SKIPPED` and `FALLBACK` optimization states remain visible to editors and do not remove manual approval or publish controls

## Exit Criteria

- NewsPub has a working review and publication workspace for non-automatic streams
