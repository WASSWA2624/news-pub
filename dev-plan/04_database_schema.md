# 04 Database Schema

Source sections: 13, 13.1, 13.2, 28, 35.
Atomic aspect: schema and migrations only.
Prerequisite: step 03.

## Goal

Implement the complete Prisma schema that matches the Release 1 source-of-truth model contract.

## Implement

1. Create the Prisma schema for every required model in section 13.2.
2. Include the required enums, uniqueness constraints, and join tables.
3. Model both `status` and `editorialStage` exactly as defined in section 35.
4. Ensure locale-aware content is stored through `PostTranslation` with one active record per post and locale, while Release 1 only uses `en`.
5. Ensure media, source attribution, audit events, prompts, providers, and source configuration all have persistence models.
6. Ensure `ModelProviderConfig` stores selected provider ids, selected model ids, purpose, encrypted API key material, and env fallback metadata, while trusted provider model catalogs remain source-driven rather than hard-coded schema tables.
7. Include the content storage fields required by section 28: Markdown, HTML, and structured JSON.
8. Create an initial migration from an empty database.

## Required Outputs

- `prisma/schema.prisma`
- initial migration files

## Verify

- `prisma validate` passes
- migration from an empty database succeeds
- every required model, enum, and uniqueness rule from section 13.2 exists

## Exit Criteria

- the database schema is complete enough for the rest of the build
