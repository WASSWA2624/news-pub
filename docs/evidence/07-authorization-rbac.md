# 07 Authorization RBAC

Plan source: [dev-plan/07_authorization_rbac.md](../../dev-plan/07_authorization_rbac.md)

## Implemented

- Created [src/lib/auth/rbac.js](../../src/lib/auth/rbac.js) as the Release 1 server-side permission matrix and routing policy source of truth.
- Updated [src/lib/auth/index.js](../../src/lib/auth/index.js) to treat admin eligibility through the shared RBAC role list.
- Updated [src/lib/auth/api.js](../../src/lib/auth/api.js) with reusable permission guards and consistent `403 forbidden` responses for blocked admin actions.
- Updated [src/app/admin/layout.js](../../src/app/admin/layout.js) to block restricted admin pages even when links are bypassed directly.
- Created [src/components/admin/admin-access-denied.js](../../src/components/admin/admin-access-denied.js) for role-aware denial UI on protected admin routes.
- Updated [src/components/layout/admin-shell.js](../../src/components/layout/admin-shell.js) and [src/messages/en.json](../../src/messages/en.json) so admin navigation only exposes actions the signed-in role can perform.
- Updated the protected admin API scaffolds so content, moderation, analytics, media, and revalidation actions now check role permissions before returning scaffold responses.
- Added [src/lib/auth/rbac.test.js](../../src/lib/auth/rbac.test.js) to cover the permission matrix, navigation filtering, page access mapping, and action-specific permission resolution.

## Release 1 Policy

- `SUPER_ADMIN` retains full access across dashboard, content, moderation, settings, prompts, sources, localization, SEO, manufacturers, categories, analytics, and revalidation.
- `EDITOR` can generate drafts, edit drafts, schedule posts, upload media, view content lists, and view job logs.
- `EDITOR` cannot publish posts, moderate comments, archive posts, or access protected admin settings by default.
- Provider-configuration permission is defined in the matrix for later steps even though this repo does not yet expose a dedicated provider settings route.

## Verification

- `git diff --check`
- `npm test`
- `npm run lint`

## Results

- Blocked actions now fail server-side with a consistent `403 forbidden` payload that includes the denied permission key.
- Admin navigation now expands for `SUPER_ADMIN` and contracts for `EDITOR`, so the UI only advertises permitted destinations.
- Direct visits to restricted admin pages render an access-denied state instead of the underlying page scaffold.
- Post update guards now distinguish between editing, scheduling, publishing, and archiving so later editorial features can reuse the same checks.

## Notes

- The seed flow still provisions only the configured super-admin account. Editor-specific behavior is covered by automated tests until a dedicated editor seed is introduced.
