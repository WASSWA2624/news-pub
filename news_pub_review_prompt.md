# NewsPub codebase remediation prompt

## Context
This repository is already partially working. Do **not** rewrite working business logic, routes, database behavior, SEO behavior, auth behavior, i18n behavior, or publishing workflows unless a change is required to close a verified gap. Preserve all working features and current user-visible flows.

The current review found these likely problem areas:
- The attached package is a **standalone production bundle**, not the original full source tree.
- `scripts/cpanel-db-deploy.js`, `scripts/cpanel-db-seed.js`, and `scripts/cpanel-doctor.js` require `./cpanel-db-utils`, but that file is missing from the uploaded package.
- The app was built on Windows and is being considered for Linux cPanel deployment.
- Public pages and admin pages appear to ship **too much initial JavaScript**, with a large shared client entry and several heavy admin route chunks.
- The UI uses many heavy visual effects and large monolithic components that likely increase render cost and duplicate styling logic.
- Prisma seed/deploy on cPanel is vulnerable to memory pressure and should not always run as one heavy operation.

## Objective
Refactor only what is necessary to:
1. close performance gaps,
2. remove duplicated UI structure/styling logic,
3. prevent local-vs-cPanel deployment failures,
4. keep the UI extremely light, extremely fast, and excellent to use,
5. leave all currently working behavior unchanged unless a fix is required.

## Non-negotiable constraints
- Keep all existing routes, slugs, APIs, form behaviors, and business rules working.
- Keep Prisma schema semantics intact unless a deployment fix absolutely requires a safe generator/runtime adjustment.
- Do not introduce a visual redesign that changes the product identity; simplify and lighten it.
- Prefer surgical refactors over broad rewrites.
- Prefer server components and server rendering wherever interactivity is not required.
- Prefer lazy loading for admin-only and modal-only code.
- Prefer flat, static, low-cost styling over heavy runtime styling.
- Keep accessibility intact or improve it.

## Required work

### 1) Fix cPanel packaging and deployment breakpoints first
- Ensure every runtime script dependency is actually shipped in the deployable package.
- Add the missing `scripts/cpanel-db-utils.js` to the packaged output or remove the dependency by inlining or relocating the shared helper logic safely.
- Add a preflight packaging check that fails the build if any runtime-required local file is missing from the cPanel artifact.
- Make the deployment artifact deterministic:
  - pin the Node version in `package.json` `engines`,
  - keep dependency versions locked,
  - document the expected cPanel Node major version,
  - avoid any deploy-time ambiguity between local and server environments.
- Ensure the app is built for Linux deployment, not just for a local Windows environment.
- Remove any fragile dependency on Windows-originated build assumptions.

### 2) Make Prisma deployment resilient on low-memory cPanel environments
- Treat `cpanel:db:deploy` and `cpanel:db:seed` as separate operational steps.
- Do **not** force seed execution every time migrations run.
- Make seeding explicitly optional and idempotent.
- Add an environment-controlled flag such as `SKIP_DB_SEED_ON_DEPLOY=1` or equivalent.
- Keep the seed safe to rerun.
- Reduce seed memory pressure:
  - avoid one oversized all-in-one transaction for all seed domains if not required,
  - split seed work into smaller phases,
  - only load and compute what is necessary,
  - avoid large in-memory objects when simple sequential upserts are enough.
- Make password hashing settings configurable for constrained environments without weakening production defaults unexpectedly.
- Add clearer error handling around Prisma initialization and seed failures so cPanel logs explain the next action immediately.
- Verify Prisma client generation and runtime resolution before any seed runs.
- Keep the MariaDB adapter flow working.

### 3) Reduce initial JavaScript and route startup cost
Current route entries look too heavy. Reduce first-load cost significantly, especially for:
- public site pages,
- admin dashboard,
- admin streams,
- admin destinations,
- admin providers,
- admin templates,
- post editor pages.

Do the following:
- Move anything non-interactive out of client components.
- Remove unnecessary `use client` boundaries.
- Do not load admin-only client providers, admin shells, heavy forms, or admin UI helpers on public routes.
- Dynamically import admin-only heavy components, especially:
  - destination composer/editor,
  - stream management screens,
  - searchable selects,
  - large disclosure panels,
  - analytics widgets,
  - modal content.
- Keep the initial public shell lean and mostly server-rendered.
- Keep the admin shell small, and lazy-load feature panels beneath it.
- Audit shared providers loaded globally and remove any provider that is not required at the top level.
- Ensure bulky libraries are not pulled into the base layout unless absolutely necessary.

### 4) Remove UI duplication and monoliths without changing behavior
Refactor duplicated admin UI primitives into a single shared, low-cost design system layer.

Consolidate repeated patterns such as:
- cards,
- banners,
- pills/badges,
- field wrappers,
- field labels/hints/errors,
- table wrappers,
- sticky side panels,
- action rows,
- section headers,
- empty states.

Then split overly large components into focused subcomponents/hooks, especially anything equivalent to:
- admin shell,
- news admin UI primitives,
- destination form card,
- stream management screen,
- admin page dashboards,
- public site shell.

Requirements:
- No duplicate style primitives scattered across route-specific chunks.
- No giant all-in-one form component responsible for layout, validation, async data, modal state, and submission at once.
- Shared UI primitives must be reusable and tree-shakable.

### 5) Make the UI visually lighter and faster
Keep the app attractive, but remove expensive paint/layout effects where they are not critical.

Refactor the UI to:
- reduce layered gradients,
- reduce large shadows,
- remove or minimize backdrop blur,
- reduce decorative radial overlays,
- simplify sticky containers where possible,
- reduce nested wrappers and extra borders,
- simplify oversized toolbar/header structures,
- use a flatter and cleaner surface system,
- preserve good spacing and readability,
- keep controls responsive and accessible.

Design direction:
- clean,
- crisp,
- minimal,
- fast,
- editorial,
- professional,
- no visual clutter.

Do **not** make the interface dull or broken. Make it feel lighter, quicker, and clearer.

### 6) Improve data loading and admin page efficiency
Audit admin pages and APIs for oversized first-load queries.

Fix the following patterns where present:
- large `findMany` calls on initial page render when only summaries are needed,
- wide `include` graphs when smaller `select` queries would do,
- loading full management datasets when only the first page is needed,
- loading data for hidden sections before the user opens them,
- repeated query work across dashboard sections,
- large tables rendered without pagination or incremental loading.

Required outcomes:
- paginate long admin lists,
- fetch summary metrics separately from detailed records,
- defer expensive secondary panels,
- cap record counts aggressively on first paint,
- avoid N+1 behavior,
- keep public data responses cache-friendly.

### 7) Keep public pages fast by default
For the public site:
- keep as much as possible server-rendered,
- only hydrate interactive search and navigation pieces that truly need it,
- avoid shipping admin-related code or state to public routes,
- simplify the public header/footer/search shell if they are visually or computationally heavy,
- preserve SEO, metadata, sitemap, robots, article routes, and canonical behavior.

### 8) Harden startup and diagnostics
- Make `cpanel:doctor` complete and accurate.
- Verify:
  - required env vars,
  - generated Prisma client presence,
  - database connectivity,
  - migration status,
  - seed readiness,
  - local media requirements,
  - native dependency readiness where relevant.
- Add actionable failures, not vague failures.
- Add a runtime startup guard that fails clearly when critical package pieces are missing.

## Specific implementation guidance
- Prefer extracting stable reusable primitives instead of rewriting UI technology wholesale.
- If `styled-components` is retained, centralize and deduplicate primitives aggressively.
- If a styling migration is necessary, keep it incremental and low-risk.
- Avoid introducing unnecessary new dependencies.
- Do not move server-only code into client bundles.
- Do not import Node-only or heavy server libraries into code that can end up client-side.
- Keep route-level code splitting intentional and measurable.
- Keep all form validation and API contract behavior backward-compatible.

## Acceptance criteria
- The package can be deployed to Linux cPanel without missing local script dependencies.
- `cpanel:db:deploy`, `cpanel:db:seed`, and `cpanel:doctor` run with clear behavior and do not couple migration + seed unnecessarily.
- The seed path is idempotent and substantially less memory-aggressive.
- Public route entry cost is materially reduced from the current state.
- Admin route entry cost is materially reduced from the current state.
- Heavy admin features are lazy-loaded.
- Duplicated UI primitives are centralized.
- Large monolithic components are split into maintainable units.
- The visual experience is cleaner, flatter, lighter, and faster.
- No currently working feature regresses.

## Deliverables
Return:
1. the code changes,
2. a concise file-by-file summary of what changed,
3. the exact root causes fixed,
4. before/after bundle-impact notes,
5. any environment or deployment notes needed for cPanel.

## Final instruction
Make the smallest set of high-confidence code changes that closes the real gaps above. Preserve everything that already works. Optimize for reliability, low memory usage, low bundle weight, and excellent perceived performance.
