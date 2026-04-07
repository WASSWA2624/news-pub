# 24 Release Traceability And Cutover

Source sections: 1-25.
Atomic aspect: final traceability, release readiness, and cutover only.
Prerequisite: step 23.

## Goal

Prove that the NewsPub implementation matches `app-write-up.md` end to end and document the final transition away from the retired product shape.

## Reuse First

- Reuse the current verification mindset from the repo, but rebuild it around NewsPub requirements and the repo-truth documents that actually exist.
- Prefer direct traceability to the current write-up over historical evidence from the old equipment app.

## Implement

1. Produce a requirement-to-implementation traceability matrix for sections `1-25` of `app-write-up.md`.
2. Capture the final route map, env map, schema map, and workflow map for Release 1.
3. Document cutover notes for:
   - removed legacy modules
   - renamed routes
   - required env changes
   - database migration expectations
4. Run final smoke verification across:
   - provider configuration
   - destination and stream configuration
   - manual fetch run
   - duplicate blocking
   - review-required flow
   - website publication
   - social publication
   - retry behavior
   - public discovery and analytics
5. Audit the implemented codebase for compliance with the JSDoc and inline-comment standard, especially in provider integrations, normalization, filtering, publishing, retries, and security-sensitive modules.
6. Record any remaining risks or known limits explicitly.

## Required Outputs

- final traceability matrix
- release-readiness notes
- cutover checklist
- documentation compliance audit
- final verification log
- explicit references to `README.md`, `app-write-up.md`, `dev-plan/*`, and the automated test suites that provide the evidence

## Verify

- every required route, model, env key, and workflow from `app-write-up.md` is mapped to implementation evidence
- no contradiction remains between `dev-plan` and `app-write-up.md`
- required JSDoc and targeted inline comments exist for implemented runtime modules with non-obvious behavior
- no active AI or retired equipment-product module remains in the Release 1 app
- final smoke verification covers the complete NewsPub workflow

## Exit Criteria

- Release 1 can be signed off as a NewsPub implementation rather than a partial rewrite of the old product, with implementation documentation kept current
