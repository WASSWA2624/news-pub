# 15 Editorial State Machine

Source sections: 3.3, 5.2, 35, 39.
Atomic aspect: editorial workflow, post lists, post editor, and category management only.
Prerequisite: step 14.

## Goal

Implement the persisted post lifecycle and editorial checkpoint workflow.

## Implement

1. Implement the `status` transitions: `DRAFT`, `SCHEDULED`, `PUBLISHED`, `ARCHIVED`.
2. Implement the `editorialStage` transitions: `GENERATED`, `REVIEWED`, `EDITED`, `APPROVED`.
3. Enforce invalid transition failures.
4. Build the admin Drafts list and Published posts list.
5. Build the post editor page for manual review and editing.
6. Build Categories Management for taxonomy CRUD needed by posts.
7. Write audit events for publish, archive, schedule, and status changes.

## Required Outputs

- editorial lifecycle service
- drafts list page
- published posts list page
- post editor page
- categories management page

## Verify

- status and editorial checkpoints remain separate
- invalid transitions fail predictably
- valid transitions persist and generate audit records

## Exit Criteria

- posts can move safely through review, scheduling, and publishing
