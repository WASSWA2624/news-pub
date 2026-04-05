# Step 01 Evidence: Architecture Decisions

## Files Created Or Changed

- Created [docs/adr/README.md](../adr/README.md)
- Created [docs/adr/0001-stack-foundation.md](../adr/0001-stack-foundation.md)
- Created [docs/adr/0002-routing-and-locale-segmentation.md](../adr/0002-routing-and-locale-segmentation.md)
- Created [docs/adr/0003-source-grounded-generation-and-manual-publishing.md](../adr/0003-source-grounded-generation-and-manual-publishing.md)
- Created [docs/adr/0004-lifecycle-storage-and-access.md](../adr/0004-lifecycle-storage-and-access.md)
- Created [docs/architecture-summary.md](../architecture-summary.md)
- Created [docs/evidence/01-architecture-decisions.md](./01-architecture-decisions.md)
- Updated [README.md](../../README.md)

## Commands Run

- `rg --files`
- `Get-Content -Raw dev-plan/01_architecture_decisions.md`
- `Get-Content -Raw dev-plan/00_plan_index.md`
- `Get-Content -Raw README.md`
- `Get-Content -Raw app-write-up.md`
- `git status --short`
- `Get-Content -Raw dev-plan/02_repo_scaffold.md`
- `Get-Content -Raw dev-plan/03_environment_schema.md`
- `git diff -- dev-plan/00_plan_index.md`
- `git diff -- dev-plan/01_architecture_decisions.md`

## Automated Checks Run

- `git diff --check -- README.md docs/adr docs/architecture-summary.md docs/evidence/01-architecture-decisions.md`
- `rg -n "^# ADR 000|^## Decision|^## Consequences" docs/adr`
- `rg -n "Root behavior|Locale extensibility rule|Major Modules, Owners, And Boundaries|Route Families" docs/architecture-summary.md`
- `rg -n "\\]\\(/d:" docs`

## Manual Verification Notes

- The ADR set freezes the required stack, routing, content rule, publishing rule, lifecycle rule, storage rule, auth rule, and locale extensibility rule from step 01.
- The architecture summary documents every public and admin route family required for Release 1.
- The architecture summary assigns a planned owner and an explicit boundary to each major module that later scaffold steps will implement.
- The ADRs were written against the requirements in `app-write-up.md` and do not intentionally narrow or replace any mandatory Release 1 behavior.
- A repo-wide diff check initially surfaced an unrelated EOF-only change in `dev-plan/00_plan_index.md`; that pre-existing modification was left untouched, and the step-owned files passed the scoped diff check.

## Unresolved Risks

- None for step 01. Later steps still need code-level verification that the scaffold and implementation stay aligned with these frozen decisions.
