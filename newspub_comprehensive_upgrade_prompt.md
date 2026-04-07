# NewsPub Final Close-Out, Performance Refactor, and Documentation Pass

You are working in an already substantially upgraded **NewsPub** repository built with:

- **Next.js 16.2.2**
- **React 19.2.4**
- **Prisma 7.6.0**
- **MySQL/MariaDB**
- **styled-components**
- **Redux Toolkit**
- **Zod**

This is **not** a greenfield build and it is **not** an architecture rewrite exercise.

Your job is to perform a **final close-out pass plus app-wide refactor pass** that:

1. identifies and closes the remaining gaps against Release 1 behavior
2. improves the visual quality and consistency of the UI
3. improves perceived and actual frontend performance
4. reduces component nesting depth
5. maximizes code reuse
6. minimizes code duplication
7. adds **professional JSDoc documentation comments** across production code
8. verifies all critical flows with tests and evidence

Do not rebuild working architecture just because a different architecture is possible.
Preserve what works. Simplify what is bloated. Finish what is incomplete.

---

## 1. Working method

Before changing code:

1. inspect the current repository in full
2. identify what is already correct
3. identify what is incomplete, duplicated, inconsistent, oversized, or weakly verified
4. refactor only where it produces clear maintainability, performance, or correctness gains
5. prove completion with tests and a requirement matrix

You must prefer:
- smaller focused modules
- shallow component trees
- reusable primitives
- predictable data flow
- server-first rendering where possible
- lightweight client boundaries only where necessary

---

## 2. Main outcome required

Make the repository:

- production-ready
- visually uniform
- fast-loading
- lightweight
- professionally documented
- end-to-end verified
- free of obvious drift, dead code, placeholder naming, and duplicated logic

---

## 3. High-priority close-out goals

### 3.1 Professional JSDoc coverage across production code
Add or improve **professional JSDoc comments** throughout the production codebase.

Requirements:

- every exported production function must have JSDoc
- every exported React component must have JSDoc
- every non-trivial internal helper must have JSDoc if the logic is not instantly obvious
- document:
  - purpose
  - key params
  - return shape
  - side effects where relevant
  - important invariants
- keep comments concise, professional, and accurate
- do not add noisy comments that merely restate obvious code
- do not add JSDoc to tests unless it materially improves clarity
- remove misleading or stale comments

This must be applied across:

- `src/app/*`
- `src/components/*`
- `src/features/*`
- `src/lib/*`
- `src/store/*`

---

### 3.2 App-wide UI refactor for consistency and better look and feel
Improve the visual design so the app feels sharper, lighter, and more professional.

Requirements:

- preserve the sharp editorial language
- keep radii minimal and consistent
- standardize:
  - cards
  - buttons
  - inputs
  - selects
  - chips
  - badges
  - tables
  - modals
  - drawers/panels
  - empty states
  - status banners
  - section headers
- reduce overuse of:
  - heavy gradients
  - glassmorphism
  - large shadow variance
  - inconsistent border treatments
- create a shared visual primitive layer so admin and public surfaces use the same design language where appropriate
- ensure `src/styles/theme.js`, `src/app/globals.js`, and consuming components all align
- remove ad hoc visual tokens embedded inside large components when they should be centralized

Target result:
- cleaner
- lighter
- more uniform
- more editorial
- less ornamental drift

---

### 3.3 Performance optimization and frontend weight reduction
Optimize the UI to load as fast as possible while preserving behavior.

Requirements:

- move as much rendering as possible to server components
- reduce unnecessary `"use client"` boundaries
- split oversized client components into smaller focused pieces
- ensure expensive UI state stays localized
- minimize prop drilling and unnecessary rerenders
- memoize only where it provides measurable value
- remove dead imports, dead branches, and unused helpers
- remove unused dependencies
- replace raw image usage on app surfaces with optimized image handling where appropriate
- use `next/image` for app-rendered content where compatible
- ensure media and story cards do not force avoidable layout shift
- reduce CSS complexity and duplicated styled-component definitions where possible
- avoid building massive all-in-one component files
- prefer composable primitives over giant screens with embedded styling and business logic

You must specifically audit and refactor oversized files such as:

- `src/components/public/index.js`
- `src/components/layout/site-shell.js`
- `src/components/layout/admin-shell.js`
- `src/components/common/searchable-select.js`
- `src/components/admin/stream-management-screen.js`
- `src/components/admin/destination-form-card.js`
- `src/features/posts/index.js`
- `src/lib/news/workflows.js`

Goal:
- smaller files
- shallower trees
- less duplication
- faster first render
- lower client JS cost

---

### 3.4 Code reuse and duplication reduction
Maximize reuse and minimize duplication.

Requirements:

- extract repeated styled-component patterns into shared primitives
- extract repeated form row patterns, status chips, table wrappers, section shells, and modal structures
- centralize repeated formatting, validation, error, and serialization helpers
- consolidate duplicated platform-specific UI logic where safe
- eliminate copy-paste branch drift across admin pages
- keep abstractions practical and readable
- do not introduce generic abstractions that make the code harder to follow

---

### 3.5 End-to-end action verification
Do not assume a flow is complete because a screen exists.

Verify every important admin action from:

- UI trigger
- validation
- server action or route
- service/workflow call
- database write
- audit/log event
- UI refresh/revalidation
- failure message path

This must be verified for:

- create/edit/delete destination
- create/edit/delete stream
- create/edit provider
- create/edit template
- upload media
- create manual post
- edit post
- optimize post
- approve/reject post
- schedule post
- publish post
- repost post
- retry failed publish
- show exact failure reason
- show publish history
- show audit history
- run stream manually
- scheduled publishing job
- public story fetch by slug
- public latest stories
- public collection/category listing

If any path is partial, finish it.

---

### 3.6 Route and server-action test expansion
Current verification is not enough unless critical surfaces are tested.

You must add or improve tests for:

- all major API routes
- major server actions
- publish/retry/schedule flows
- provider and destination save flows
- stream save/delete/run flows
- manual post creation
- public content routes
- error normalization behavior
- env parsing behavior
- AI cache/fallback/policy behaviors
- public rendering helpers
- revalidation behavior where applicable

At minimum, add route or integration-level coverage for currently weakly covered areas such as:

- `src/app/api/auth/*`
- `src/app/api/categories/route.js`
- `src/app/api/destinations/meta-discovery/route.js`
- `src/app/api/jobs/*`
- `src/app/api/media/route.js`
- `src/app/api/metrics/route.js`
- `src/app/api/posts/slug/[slug]/route.js`
- `src/app/api/providers/*`
- `src/app/api/public/*`
- `src/app/api/revalidate/route.js`
- `src/app/api/seo/route.js`
- `src/app/api/settings/route.js`
- `src/app/api/streams/route.js`
- `src/app/api/templates/route.js`

---

### 3.7 Repo hygiene and security cleanup
You must clean up repository hygiene.

Requirements:

- ensure `.env.local` and other sensitive local artifacts are not treated as deliverables
- update `.gitignore` only if needed
- remove accidental local-only files from expected tracked output
- update `.env.example`
- validate env parsing with Zod
- keep secrets server-side only
- remove unused or suspicious dependencies
- remove dead files and dead references
- remove misleading placeholder/scaffold naming in shipped code

---

## 4. Functional behavior that must remain correct

Do not regress existing working behavior.

Preserve and verify:

- canonical source-backed post model
- bounded AI optimization
- deterministic AI cache reuse
- source attribution preservation
- review-required vs auto-publish stream behavior
- social guardrails
- duplicate cooldown logic
- retry idempotency
- destination-aware policy checks
- SEO metadata generation
- media URL validation and fallback handling
- publish history and auditability

---

## 5. AI layer close-out requirements

The AI layer already exists in some form. Tighten it; do not replace it without cause.

Requirements:

- strict schema validation
- deterministic cache keys
- no rerun when source/settings are unchanged
- safe fallback when AI fails or is disabled
- factual meaning preserved
- source attribution preserved
- per-platform output bounds enforced
- warnings and policy output stored and surfaced
- bounded prompts and bounded source input size
- manual re-optimize only when explicitly requested

Add or fix tests for:

- cache reuse
- fallback behavior
- invalid AI output rejection
- platform-specific output bounds
- policy hold behavior
- policy block behavior

---

## 6. Platform output requirements

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
- valid text-only fallback
- safe formatting
- policy pre-checks
- duplicate/cooldown enforcement
- surfaced diagnostics in admin

### Instagram
Verify and fix:

- concise caption
- hashtag cap
- no spammy duplication
- media readiness validation
- hold-for-review when media is unsuitable
- cooldown and duplication guardrails

---

## 7. Styling and component architecture rules

Apply these refactor rules everywhere:

- prefer composable presentation primitives
- prefer domain components that are small and focused
- avoid giant “index.js” files that contain many unrelated components
- keep business logic out of presentational components where possible
- move repeated page-shell patterns into shared layout primitives
- move repeated table, filter bar, summary card, and banner patterns into reusable modules
- keep styled-components definitions close to the component when local, but centralize them when repeated
- reduce DOM depth where possible
- avoid wrapper div inflation
- do not create abstractions that hurt readability

---

## 8. Performance-specific acceptance requirements

Completion is not valid unless the UI is materially lighter.

You must ensure:

- fewer oversized client components
- fewer monolithic files
- lower client-side rendering pressure
- reduced unnecessary re-renders
- optimized app-rendered images
- no obvious layout-shift risks in key story/media cards
- no obviously unused dependencies
- no dead code left behind after refactors

In the final report, explicitly describe the performance improvements made.

---

## 9. Required areas to inspect and update

### Docs and config
- `README.md`
- `app-write-up.md`
- `dev-plan/*`
- `package.json`
- `next.config.mjs`
- `eslint.config.mjs`

### Env and repo hygiene
- `.env.example`
- `.gitignore`
- env parsers and tests

### Database and persistence
- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.js`
- `src/lib/prisma/*`

### App and routes
- `src/app/layout.js`
- `src/app/[locale]/*`
- `src/app/admin/*`
- `src/app/api/*`

### Features and services
- `src/features/*`
- `src/lib/*`

### UI
- `src/styles/theme.js`
- `src/app/globals.js`
- `src/components/*`

### State and tests
- `src/store/*`
- `src/test/*`

---

## 10. Hard acceptance criteria

The work is complete only when all of the following are true:

1. docs match the real codebase
2. no sensitive local env artifact is treated as a deliverable
3. professional JSDoc coverage exists across production exports
4. visual inconsistency is materially reduced across admin and public UI
5. large monolithic UI files are meaningfully decomposed
6. component nesting depth is reduced where practical
7. code reuse is increased and duplication is reduced
8. major admin actions are truly wired end to end
9. major API routes and server actions are tested
10. AI optimization remains bounded, cached, and verified
11. website/Facebook/Instagram rules are enforced and tested
12. social safety guardrails remain enforced and tested
13. env parsing, services, routes, and UI are aligned
14. lint passes
15. tests pass
16. build passes
17. no obvious dead code, dead routes, dead dependencies, or placeholder production naming remain

---

## 11. Required final report

At the end, provide:

### A. Gap summary
List each gap you found and how it was closed.

### B. Refactor summary
List:
- major files split
- reusable primitives introduced
- duplication removed
- performance-oriented changes made
- client/server boundary improvements made

### C. JSDoc coverage summary
List:
- major modules documented
- any intentionally excluded files and why

### D. Requirement closure matrix
For each important requirement:
- requirement
- files changed
- tests/evidence

### E. Verification report
List:
- commands run
- lint result
- test result
- build result
- migration/seed result if run
- manual verification notes

### F. Remaining risks
List only real unresolved risks or external setup dependencies.