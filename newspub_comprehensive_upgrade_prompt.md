# NewsPub gap-only implementation prompt

You are working inside the existing **NewsPub** codebase. Do **not** rewrite already-complete features. Do **not** broaden scope. Implement **only** the gaps listed below and close them fully.

## Hard scope boundary

- Keep the current NewsPub product shape, route topology, Prisma model families, admin/public shells, and bounded AI workflow.
- Do not introduce parallel architectures, unnecessary refactors, or speculative enhancements.
- Reuse existing modules and patterns wherever possible.
- Any file you touch must keep behavior aligned with `app-write-up.md`.
- Update tests and docs only where required by the gap fixes below.

---

## Gap 1 — repository security leak and unsafe local defaults

### Problem
The repository currently includes a committed `.env.local` containing real-looking provider/API credentials, admin seed credentials, session secrets, encryption keys, and Meta tokens. This is a security issue and violates the intended env contract.

### Required fix
1. Remove `.env.local` from the tracked project state and replace it with safe placeholder guidance only.
2. Ensure `.env.example` is the sole committed env contract and contains only non-sensitive placeholder values.
3. Add a short security note in `README.md` stating that:
   - `.env.local` must never be committed,
   - any previously committed secrets must be rotated,
   - seed credentials must be replaced before any non-local deployment.
4. Replace weak/default local auth examples with clearly non-production placeholders.
5. Verify no other tracked file contains live secrets, tokens, private keys, or real credentials.

### Acceptance criteria
- No committed file contains real secrets or usable tokens.
- `.env.local` is no longer part of the tracked codebase snapshot.
- `.env.example` still documents every required env var for Release 1.
- `README.md` includes explicit secret-rotation and local-only credential guidance.

---

## Gap 2 — broken install / verification reproducibility

### Problem
The dependency state is not reproducible because `package.json` and `package-lock.json` are out of sync. `npm ci` fails, which blocks standard verification and release confidence.

### Required fix
1. Reconcile `package.json` and `package-lock.json` so a clean install works.
2. Make sure the repository supports the documented verification flow from a fresh checkout.
3. Re-run and fix any issues exposed by these commands:
   - `npm ci`
   - `npm run prisma:generate`
   - `npm run lint`
   - `npm test`
   - `npm run build`
   - `npm run prisma:validate`
4. If any script assumptions are outdated, correct them in a minimal way and update the docs.

### Acceptance criteria
- `npm ci` succeeds from a clean checkout.
- The documented verification commands succeed without requiring undeclared manual steps.
- `README.md` reflects the exact working verification flow.

---

## Gap 3 — documentation contract is not met across runtime modules

### Problem
The codebase does not satisfy the documentation standard in `app-write-up.md`. A large share of non-test runtime files still lack module-level JSDoc and many exported runtime surfaces are under-documented.

### Required fix
Add professional, concise NewsPub-specific documentation to the active runtime code, prioritizing the most important workflow surfaces first:

1. Add **module-level JSDoc** to all non-trivial runtime files that currently lack it, especially across:
   - `src/app/**`
   - `src/components/**`
   - `src/features/**`
   - `src/lib/**`
   - `src/proxy.js`
2. Add or improve **export-level JSDoc** for:
   - route handlers,
   - server actions,
   - React components with non-obvious responsibilities,
   - workflow utilities,
   - provider adapters,
   - publishing helpers,
   - validation helpers,
   - admin UI composition helpers.
3. Document non-obvious rules close to the logic that enforces them, especially for:
   - provider-specific fetch-window behavior,
   - shared-fetch widening constraints,
   - AI skip/fallback behavior,
   - publish diagnostics flattening,
   - auth/RBAC/security-sensitive branches,
   - deterministic fallback formatting.
4. Keep comments high-value only. Do not add filler comments.

### Acceptance criteria
- Active runtime modules have clear file-level purpose documentation.
- Exported non-trivial functions/components/routes have usable JSDoc where behavior is not obvious.
- Comments explain NewsPub-specific invariants, not generic JavaScript syntax.
- Documentation stays synchronized with the actual implemented behavior.

---

## Gap 4 — release-readiness checks for security and repo hygiene are missing

### Problem
The repo currently allows high-risk regressions such as committed secrets and dependency-state drift to slip through without a clear guardrail.

### Required fix
Add minimal, maintainable guardrails to prevent recurrence:

1. Add a lightweight repository check or documented script that fails when forbidden env files or obvious secrets are tracked.
2. Add a lightweight check or documented expectation that the lockfile must remain synchronized with `package.json`.
3. Document these guardrails in `README.md` so contributors know the required hygiene standard.
4. Keep the solution simple and local to this repo; do not add heavy tooling unless the repo already uses it.

### Acceptance criteria
- The repo has a clear, repeatable way to catch committed secrets and lockfile drift.
- The guardrail approach is documented and easy for contributors to follow.
- The added checks do not introduce unnecessary complexity.

---

## Delivery rules

- Make the smallest safe changes that fully close the gaps.
- Preserve existing behavior unless a gap fix requires change.
- Do not re-scope into feature expansion.
- Update or add tests only where they prove the fixes above.
- At the end, provide a concise change summary mapped to the four gaps above, plus the exact verification results.
