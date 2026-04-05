# Step 03 Evidence: Environment Schema

## Files Created Or Changed

- Created [.env.example](../../.env.example)
- Created [src/lib/env/runtime.js](../../src/lib/env/runtime.js)
- Created [src/lib/env/shared.js](../../src/lib/env/shared.js)
- Created [src/lib/env/server.js](../../src/lib/env/server.js)
- Created [src/lib/env/runtime.test.js](../../src/lib/env/runtime.test.js)
- Created [src/lib/env/server.test.js](../../src/lib/env/server.test.js)
- Created [vitest.config.mjs](../../vitest.config.mjs)
- Updated [next.config.mjs](../../next.config.mjs)
- Updated [src/app/layout.js](../../src/app/layout.js)
- Updated [src/app/sitemap.js](../../src/app/sitemap.js)
- Updated [src/app/robots.js](../../src/app/robots.js)
- Updated [src/features/i18n/config.js](../../src/features/i18n/config.js)
- Updated [src/features/i18n/config.test.js](../../src/features/i18n/config.test.js)
- Created [docs/evidence/03-environment-schema.md](./03-environment-schema.md)

## Commands Run

- `Get-Content -Raw dev-plan/03_environment_schema.md`
- `Get-Content -Raw prisma/schema.prisma`
- `Get-Content -Raw src/features/i18n/config.js`
- `Get-Content -Raw src/features/i18n/config.test.js`
- `rg -n "process\\.env|env\\(" -S .`
- `Get-Content -Raw app-write-up.md`
- `git status --short`
- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check -- .env.example next.config.mjs vitest.config.mjs src/app/layout.js src/app/sitemap.js src/app/robots.js src/features/i18n/config.js src/features/i18n/config.test.js src/lib/env`

## Automated Checks Run

- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check -- .env.example next.config.mjs vitest.config.mjs src/app/layout.js src/app/sitemap.js src/app/robots.js src/features/i18n/config.js src/features/i18n/config.test.js src/lib/env`

## Manual Verification Notes

- A single Zod-backed runtime contract now parses environment variables into typed config sections for app URL, locales, auth, AI, media, comments, cron, and revalidation.
- The shared locale/app URL values are exposed through one env access layer, while server-only code validates the full contract at import time and throws readable startup errors.
- Locale config now validates that every enabled locale has a registered definition, which preserves the config-driven locale model without allowing incomplete enablement.
- Root metadata, sitemap generation, and robots generation no longer read `process.env` directly.
- `.env.example` mirrors the Release 1 contract from section 34, including conditional storage and captcha settings.
- Unit tests cover valid parsing, missing required variables, conditional S3 and captcha requirements, locale mismatch handling, and fail-fast module import behavior.

## Unresolved Risks

- No additional unresolved risks were identified in this step.
