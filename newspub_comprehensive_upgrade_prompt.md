# NewsPub Close-Out Prompt

You are working in an already substantially upgraded **NewsPub** repository built with **Next.js 16.2.2 + React 19.2.4 + Prisma 7.6.0 + MySQL/MariaDB + styled-components + Redux Toolkit + Zod**.

This is **not** a greenfield upgrade. Do **not** rebuild architecture that already exists. Your job is to perform a **comprehensive close-out pass** that finds and fixes the remaining gaps between the current repository and the intended Release 1 scope.

Work directly in the current repo and make all required code, docs, schema, UI, test, and configuration updates so the repository becomes:

- consistent
- production-ready
- visually uniform
- fully verified
- fully wired end to end
- free of obvious legacy drift, placeholder naming, and dead references

Do not deliver a partial patch set. Deliver a coherent finish pass with evidence.

---

## 1. How to approach this repository

Treat the repository as **already partially implemented**.

Before changing code, first inspect the current repo and identify what is already present versus what is still missing. Then:

1. preserve working architecture
2. close the actual gaps
3. remove inconsistency
4. prove completion with tests and a requirement matrix

Do not re-add architecture that already exists unless you are correcting or simplifying it.

---

## 2. Current-state assumptions you must respect

Assume the repo already contains most or all of the following in some form:

- NewsPub docs and dev plan
- Prisma models and migrations for NewsPub
- admin and public routes
- API routes
- AI optimization service code
- publishing workflows
- provider integration logic
- media and SEO helpers
- admin UI screens
- tests

Your task is to verify these are real, consistent, complete, and aligned with the intended product behavior.

---

## 3. Main goal

Close the remaining gaps so the codebase fully satisfies the intended NewsPub Release 1 behavior for:

- website publishing
- Facebook publishing
- Instagram publishing
- ingestion
- review
- optimization
- scheduling
- retries
- auditability
- safety guardrails
- responsive editorial UI

---

## 4. Highest-priority gaps you must close

### 4.1 Visual inconsistency and rounded UI drift
The repository still contains mixed radius values and pill/rounded treatments in many components.

You must:

- remove or normalize large radii across the app
- use a sharp editorial dashboard language
- standardize cards, badges, buttons, modals, chips, table containers, inputs, tabs, and empty states
- ensure `src/styles/theme.js`, `src/app/globals.js`, and all consuming components agree
- remove large-radius fallback tokens from global styles
- eliminate mixed radius usage like `12px`, `14px`, `16px`, `18px`, `20px`, `999px` unless there is a strong functional reason and it is consistently documented

This must apply across:

- `src/components/admin/*`
- `src/components/public/*`
- `src/components/common/*`
- `src/components/auth/*`
- `src/components/forms/*`
- `src/components/layout/*`
- `src/app/admin/*`
- public route surfaces

### 4.2 Docs and repo-truth cleanup
The repository documentation must match the real codebase exactly.

You must:

- update `README.md`
- update `app-write-up.md`
- update `dev-plan/00_plan_index.md`
- update any outdated `dev-plan/*.md` files
- remove references to missing documentation artifacts or create those artifacts if they are intended to exist
- ensure the repo does not reference nonexistent `docs/*` files or folders
- ensure all docs describe the app as bounded AI-assisted optimization, not open-ended AI generation
- ensure docs reflect the current code and route structure

### 4.3 End-to-end action verification
Do not assume an admin action is complete just because the UI exists.

For every relevant admin action, verify the actual full path:

- UI trigger
- form validation
- API/server action
- service/workflow call
- database write
- audit/log entry
- status refresh in UI
- failure state handling

This must be verified for:

- create/edit destination
- create/edit stream
- review post
- optimize post
- approve/reject post
- schedule post
- publish post
- retry failed publish
- manual re-optimize
- show exact failure reason
- show publish history and audit state

If any action is only partially wired, finish it.

### 4.4 Naming cleanup and placeholder drift
The repo still contains naming that suggests scaffolding or placeholders even where behavior is real.

You must:

- remove or rename misleading placeholder/scaffold module names
- remove dead placeholder comments and legacy naming
- ensure implementation standards are reflected in file names and exported symbols
- avoid “placeholder”, “scaffold”, or similar names in production modules unless they are truly placeholder-only and not shipped

### 4.5 Verification and acceptance proof
Completion is not valid unless it is proven.

You must run and fix until all relevant checks pass:

- lint
- tests
- route tests
- workflow/service tests
- validation tests
- AI schema tests
- publish flow tests

If a test is missing for an implemented behavior, add it.

You must also provide a requirement closure matrix at the end:
`requirement -> files changed -> verification evidence`

---

## 5. Functional behavior that must remain correct

Do not regress already-present working behavior.

Preserve and verify:

- canonical source-backed post model
- AI optimization cache reuse by deterministic hash
- bounded structured AI output
- source attribution preservation
- social safety guardrails
- duplicate cooldown logic
- retry idempotency
- destination-aware policy checks
- review-required and auto-publish stream modes
- SEO metadata generation
- media URL validation and graceful fallback handling

---

## 6. AI layer close-out requirements

The AI layer likely already exists. Do not replace it without cause.

Instead, verify and tighten it:

- strict output schema validation
- deterministic cache key usage
- no re-run when content/settings are unchanged
- graceful fallback when AI fails or is disabled
- preservation of factual meaning
- source attribution preserved in downstream payloads
- correct per-platform word limits and formatting
- warnings and policy output stored and surfaced
- bounded prompts and bounded source input size
- manual re-optimize only when explicitly requested

Add or fix tests for:

- cache hit reuse
- fallback behavior
- policy block/hold behavior
- per-platform output bounds
- invalid AI response rejection

---

## 7. Platform output close-out requirements

### Website
Verify and fix:

- headline under 15 words
- body 100–500 words when source material allows
- slug generation
- meta title and meta description
- canonical metadata
- attribution block
- image handling
- structured data

### Facebook
Verify and fix:

- title max 10 words
- body 20–100 words
- valid text-only fallback when media fails
- safe formatting convention
- policy pre-checks
- duplicate/cooldown enforcement
- publish diagnostics surfaced in admin

### Instagram
Verify and fix:

- concise caption
- hashtag cap
- no spammy duplication
- media-readiness validation
- hold-for-review when media is not suitable
- cooldown and duplication guardrails

Add tests proving these behaviors.

---

## 8. Error handling close-out requirements

Do not just have generic `try/catch`. Ensure consistent behavior.

You must verify and normalize handling for:

- missing env variables
- invalid credentials
- provider API failures
- malformed provider payloads
- image fetch failures
- AI failures
- validation failures
- DB write failures
- publish API failures
- scheduler failures
- revalidation failures
- auth/session failures

Requirements:

- centralized error normalization
- retryable vs non-retryable classification
- safe user-facing messages
- structured developer-facing diagnostics
- no silent failure paths
- consistent admin empty/loading/error/success states

---

## 9. Environment and repo hygiene

You must:

- validate env parsing with Zod
- ensure only required env keys exist
- keep secrets server-side only
- update `.env.example`
- update env tests
- remove unsafe repo artifacts from source control expectations
- ensure `.env.local` or similar sensitive local files are not treated as committed project deliverables

---

## 10. Required files/areas to inspect and update

You are expected to inspect and update all affected areas, including where needed:

### Docs and config
- `README.md`
- `app-write-up.md`
- `dev-plan/*`
- `package.json`
- `next.config.mjs`
- `eslint.config.mjs`

### Database and persistence
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.js`
- `src/lib/prisma/*`

### Environment
- `.env.example`
- `src/lib/env/runtime.js`
- `src/lib/env/server.js`
- `src/lib/env/shared.js`
- env tests

### App and routes
- `src/app/layout.js`
- `src/app/[locale]/*`
- `src/app/admin/*`
- `src/app/api/*`

### Libraries and workflows
- `src/lib/ai/*`
- `src/lib/content/*`
- `src/lib/news/*`
- `src/lib/normalization/*`
- `src/lib/validation/*`
- `src/lib/security/*`
- `src/lib/seo/*`
- `src/lib/media/*`
- `src/lib/storage/*`

### Features
- `src/features/posts/*`
- `src/features/public-site/*`
- `src/features/providers/*`
- `src/features/destinations/*`
- `src/features/streams/*`
- `src/features/templates/*`
- `src/features/media/*`
- `src/features/seo/*`
- `src/features/auth/*`

### UI
- `src/styles/theme.js`
- `src/app/globals.js`
- `src/components/admin/*`
- `src/components/public/*`
- `src/components/common/*`
- `src/components/forms/*`
- `src/components/layout/*`
- `src/components/seo/*`
- `src/components/auth/*`

### State and tests
- `src/store/*`
- `src/test/*`
- route tests
- service tests
- validation tests
- AI tests
- publish flow tests

---

## 11. Hard acceptance criteria

The work is complete only when all of the following are true:

1. no docs reference missing repo artifacts
2. docs and runtime behavior are aligned
3. rounded corner drift is eliminated and the UI is visually uniform
4. all major admin actions are truly wired end to end
5. AI optimization is verified, cached, bounded, and tested
6. website/Facebook/Instagram output rules are enforced and tested
7. social safety guardrails are enforced and tested
8. error handling is normalized across routes, services, workflows, and UI
9. env parsing, schema, services, routes, and UI are aligned
10. no misleading placeholder/scaffold naming remains in production modules
11. lint passes
12. tests pass
13. no obvious dead references, dead routes, or broken flows remain

---

## 12. Required final report

At the end, provide:

### A. Gap summary
List each gap you found and how it was closed.

### B. Requirement closure matrix
For each important requirement, provide:
- requirement
- files changed
- tests/evidence

### C. Verification report
List:
- commands run
- lint result
- test result
- migration result
- any manual verification notes

### D. Risks/manual setup
List only real remaining risks or manual setup steps.