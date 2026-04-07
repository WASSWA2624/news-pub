# Atomic Dev Plan Index

Single source of truth: `app-write-up.md`.

## Execution Rules

- Execute steps in exact numeric order.
- Do not skip verification in any step.
- Do not merge steps or reorder them.
- If a step fails verification, stop and fix it before moving on.
- Reuse the existing repo foundation before introducing new architecture.
- When a step creates route names, schema names, env keys, enum values, or UI contracts, later steps must reuse those exact contracts.
- When a step changes runtime code, update the touched files with current JSDoc and any necessary inline comments before that step is considered complete.
- Later steps may delete or rename legacy files when the write-up or plan explicitly requires it.

## Documentation Rules

- Apply module-level JSDoc to non-trivial files so the file purpose, major exports, and workflow role stay clear as the repo is repurposed.
- Apply JSDoc to exported functions, React components, route handlers, server actions, jobs, provider adapters, formatters, validators, and data mappers whenever their behavior, inputs, outputs, side effects, or invariants are not obvious at a glance.
- Add inline comments only for non-obvious business rules, provider quirks, security-sensitive branches, retry behavior, dedupe logic, or fallback paths. Do not add noise comments that merely restate the code.

## Evidence Rules

For every step, capture:

- files created, deleted, renamed, or changed
- commands run
- automated checks run
- manual verification notes
- documentation added or updated, if code changed
- unresolved risks, if any

Step 24 is not complete unless every required route, model, workflow, and integration in `app-write-up.md` is either implemented and verified or explicitly called out as deferred by an approved revision to the write-up.

## Ordered Steps

1. `01_architecture_decisions.md`
2. `02_repo_scaffold.md`
3. `03_environment_schema.md`
4. `04_database_schema.md`
5. `05_database_indexes_and_seeds.md`
6. `06_authentication.md`
7. `07_authorization_rbac.md`
8. `08_public_routing_and_information_architecture.md`
9. `09_admin_information_architecture.md`
10. `10_provider_registry_and_credentials.md`
11. `11_destination_connections_and_streams.md`
12. `12_fetch_and_normalization_pipeline.md`
13. `13_filtering_publishability_and_deduplication.md`
14. `14_review_queue_and_publication_state.md`
15. `15_media_ingestion_and_storage.md`
16. `16_website_rendering_and_publication.md`
17. `17_social_destination_publication.md`
18. `18_scheduler_incremental_windows_and_retries.md`
19. `19_seo_search_and_public_discovery.md`
20. `20_audit_logs_and_observability.md`
21. `21_analytics_dashboard_and_reporting.md`
22. `22_performance_and_scalability.md`
23. `23_security_compliance_and_secret_handling.md`
24. `24_release_traceability_and_cutover.md`

## Coverage Rule

The plan must collectively cover sections `1-25` of `app-write-up.md`.

Step 24 is incomplete if any of the following remain unmapped:

- a required public or admin route
- a required env key or secret-handling rule
- a required database model or enum
- a required provider, destination, stream, fetch, filter, dedupe, AI optimization, review, publish, retry, SEO, analytics, or audit workflow
- a legacy equipment-specific module that the write-up says must be removed or a required bounded AI optimization module that the write-up says must exist

## Final Completeness Rule

Implementation is complete only if step 24 proves:

- full traceability to the current `app-write-up.md`
- no contradiction between `dev-plan` and `app-write-up.md`
- the JSDoc and inline-comment standard from `app-write-up.md` was applied to implemented runtime code
- no remaining active architecture from the retired equipment product and a clearly bounded AI optimization layer that matches the write-up
