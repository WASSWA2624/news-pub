# Step 06 Evidence: Authentication

## Files Created Or Changed

- Updated [prisma/schema.prisma](../../prisma/schema.prisma)
- Updated [prisma/seed.js](../../prisma/seed.js)
- Created [prisma/migrations/20260402233000_add_admin_sessions/migration.sql](../../prisma/migrations/20260402233000_add_admin_sessions/migration.sql)
- Updated [src/lib/prisma/index.js](../../src/lib/prisma/index.js)
- Created [src/lib/auth/config.js](../../src/lib/auth/config.js)
- Created [src/lib/auth/api.js](../../src/lib/auth/api.js)
- Updated [src/lib/auth/index.js](../../src/lib/auth/index.js)
- Created [src/lib/auth/config.test.js](../../src/lib/auth/config.test.js)
- Created [src/lib/auth/index.test.js](../../src/lib/auth/index.test.js)
- Updated [src/features/auth/index.js](../../src/features/auth/index.js)
- Updated [src/lib/validation/api-placeholders.js](../../src/lib/validation/api-placeholders.js)
- Updated [src/proxy.js](../../src/proxy.js)
- Updated [src/app/admin/layout.js](../../src/app/admin/layout.js)
- Updated [src/app/admin/login/page.js](../../src/app/admin/login/page.js)
- Created [src/components/auth/admin-login-screen.js](../../src/components/auth/admin-login-screen.js)
- Created [src/components/auth/admin-logout-button.js](../../src/components/auth/admin-logout-button.js)
- Updated [src/components/layout/admin-shell.js](../../src/components/layout/admin-shell.js)
- Updated [src/app/api/auth/login/route.js](../../src/app/api/auth/login/route.js)
- Updated [src/app/api/auth/logout/route.js](../../src/app/api/auth/logout/route.js)
- Updated [src/app/api/generate-post/route.js](../../src/app/api/generate-post/route.js)
- Updated [src/app/api/save-draft/route.js](../../src/app/api/save-draft/route.js)
- Updated [src/app/api/publish-post/route.js](../../src/app/api/publish-post/route.js)
- Updated [src/app/api/posts/route.js](../../src/app/api/posts/route.js)
- Updated [src/app/api/posts/[id]/route.js](../../src/app/api/posts/[id]/route.js)
- Updated [src/app/api/comments/[id]/route.js](../../src/app/api/comments/[id]/route.js)
- Updated [src/app/api/manufacturers/route.js](../../src/app/api/manufacturers/route.js)
- Updated [src/app/api/models/route.js](../../src/app/api/models/route.js)
- Updated [src/app/api/media/route.js](../../src/app/api/media/route.js)
- Updated [src/app/api/revalidate/route.js](../../src/app/api/revalidate/route.js)
- Updated [src/app/api/metrics/route.js](../../src/app/api/metrics/route.js)
- Updated [src/app/api/jobs/route.js](../../src/app/api/jobs/route.js)
- Created [docs/evidence/06-authentication.md](./06-authentication.md)

## Commands Run

- `Get-Content -Raw dev-plan/06_authentication.md`
- `rg -n "auth|next-auth|clerk|session|login|signin|signup|bcrypt|jwt|password" -S .`
- `npm run prisma:generate`
- `npx prisma validate`
- `npx prisma migrate deploy`
- `npm run prisma:seed`
- `npm test`
- `npm run lint`
- `npm run build`
- `curl.exe -I http://127.0.0.1:3000/admin`
- `curl.exe -i http://127.0.0.1:3000/api/posts`
- `curl.exe -i -H "Cookie: equip_admin_session=<valid-token>" http://127.0.0.1:3000/api/posts`
- `curl.exe -i -H "Cookie: equip_admin_session=tampered-session-token" http://127.0.0.1:3000/api/posts`
- `node - < inline script to expire a live session row >`
- `git diff --check -- prisma/schema.prisma prisma/seed.js prisma/migrations/20260402233000_add_admin_sessions/migration.sql src/lib/prisma/index.js src/lib/auth src/proxy.js src/app/admin/layout.js src/app/admin/login/page.js src/components/auth src/components/layout/admin-shell.js src/app/api docs/evidence`

## Automated Checks Run

- `npm run prisma:generate`
- `npx prisma validate`
- `npx prisma migrate deploy`
- `npm run prisma:seed`
- `npm test`
- `npm run lint`
- `npm run build`
- `git diff --check -- prisma/schema.prisma prisma/seed.js prisma/migrations/20260402233000_add_admin_sessions/migration.sql src/lib/prisma/index.js src/lib/auth src/proxy.js src/app/admin/layout.js src/app/admin/login/page.js src/components/auth src/components/layout/admin-shell.js src/app/api docs/evidence`

## Manual Verification Notes

- Added DB-backed admin sessions through the new `AdminSession` model, an opaque session cookie, expiry checks, logout invalidation, and auth audit events for login success, login failure, logout, and rejected expired sessions.
- The login page at `/admin/login` now renders a real email/password form and redirects authenticated admins away from the login screen back to the requested admin route.
- Admin page access is blocked in the proxy and enforced again in the server-side admin layout so cookie presence alone is not enough for access.
- Admin API scaffolds now require an authenticated admin session before returning their placeholder responses.
- Password hashing now uses explicit scrypt parameters in both runtime auth and Prisma seed code, and reseeding refreshes the admin user's hash so the seeded credentials remain valid after auth changes.
- Live smoke test against the built app confirmed:
- `GET /admin` as anonymous returns `307` to `/admin/login?next=%2Fadmin`.
- `GET /api/posts` as anonymous returns `401 auth_required`.
- Logging in with the seeded admin credentials sets `equip_admin_session`, and the same cookie allows `GET /api/posts` to reach the protected scaffold response (`501 scaffold_only`), proving auth passed.
- A tampered `equip_admin_session` cookie returns `401 invalid_or_expired_session` and clears the cookie.
- Forcing a live session row to expire in the database causes the next `GET /api/posts` with that cookie to return `401 invalid_or_expired_session` and clear the cookie.

## Unresolved Risks

- This step authenticates active admin users and protects the admin surface, but route-by-route role restrictions remain intentionally deferred to [dev-plan/07_authorization_rbac.md](../../dev-plan/07_authorization_rbac.md).
