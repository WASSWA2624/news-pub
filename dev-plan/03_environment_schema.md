# 03 Environment Schema

Source sections: 7, 10, 11, 15, 18, 19, 22.
Atomic aspect: environment contract and validation only.
Prerequisite: step 02.

## Goal

Define the complete NewsPub runtime environment contract before database work and external integrations begin.

## Reuse First

- Reuse the current `src/lib/env/runtime.js`, `src/lib/env/shared.js`, and their test pattern.
- Keep the same grouped parsing style for app, auth, media, cron, and revalidation settings.

## Implement

1. Remove AI-provider, prompt, and comment-specific env keys from the parser and docs.
2. Add explicit provider credential keys for `mediastack`, `newsdata`, and `newsapi`.
3. Add env support for destination-token encryption, social app configuration, and any secure callback or verification secrets required by destination integrations.
4. Add schedule defaults such as the default timezone and initial backfill window.
5. Keep media-driver, auth, cron, and revalidation settings from the existing parser where they still apply.
6. Update `.env.example`, runtime validation, and tests so missing provider credentials fail clearly and early.
7. Document which env values are public-safe, server-only, env-only, or encrypted-after-ingest.

## Required Outputs

- `.env.example`
- `src/lib/env/runtime.js`
- `src/lib/env/shared.js`
- env parsing tests

## Verify

- every env key required by section `7` is validated in code
- AI and comment env keys are gone from the active runtime contract
- missing credentials for the selected provider produce a clear startup or runtime validation failure
- public-safe env values are the only values exposed to the browser

## Exit Criteria

- the NewsPub environment contract is explicit, validated, and ready for schema and integration work
