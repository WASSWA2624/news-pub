# Atomic Dev Plan Index

Single source of truth: `app-write-up.md`.

## Execution Rules

- Execute steps in exact numeric order.
- Do not skip verification in any step.
- Do not merge steps or reorder them.
- If a step fails verification, stop and fix it before moving on.
- Do not substitute the required stack, route names, enum names, API field names, or status values defined in `app-write-up.md`.
- When a step creates configuration, schema, or UI contracts, later steps must reuse those contracts rather than redefining them.

## Evidence Rules

For every step, capture:

- files created or changed
- commands run
- automated checks run
- manual verification notes
- unresolved risks, if any

Step 24 is not complete unless every mandatory requirement in `app-write-up.md` is either:

- implemented and verified, or
- explicitly marked future-phase or informational by section `46.2`

## Ordered Steps

1. `01_architecture_decisions.md`
2. `02_repo_scaffold.md`
3. `03_environment_schema.md`
4. `04_database_schema.md`
5. `05_database_indexes_and_seeds.md`
6. `06_authentication.md`
7. `07_authorization_rbac.md`
8. `08_locale_routing.md`
9. `09_translation_reuse_and_persistence.md`
10. `10_generation_input_validation.md`
11. `11_research_source_collection.md`
12. `12_ai_composition_pipeline.md`
13. `13_duplicate_equipment_detection.md`
14. `14_admin_generate_form.md`
15. `15_editorial_state_machine.md`
16. `16_scheduled_publishing_worker.md`
17. `17_public_post_rendering_mobile_first.md`
18. `18_media_storage_adapter.md`
19. `19_comments_and_moderation.md`
20. `20_seo_and_social_metadata.md`
21. `21_search_and_related_posts.md`
22. `22_view_analytics_and_observability.md`
23. `23_performance_and_scalability.md`
24. `24_security_copyright_and_release_traceability.md`

## Coverage Rule

The plan must collectively cover all mandatory Release 1 requirements in sections `1-39` and `42-46` of `app-write-up.md`.

- Sections `40-41` are future-phase only.
- Section `45` is informational only.

## Final Completeness Rule

Implementation is complete only if step 24 proves:

- full traceability to all mandatory requirements
- no contradiction between `dev-plan` and `app-write-up.md`
- no unmapped mandatory page, API, schema object, or workflow

