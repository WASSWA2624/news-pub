# 06 Authentication

Source sections: 6, 7, 9, 22.
Atomic aspect: authentication only.
Prerequisite: step 05.

## Goal

Keep the existing admin authentication model, but align it to the NewsPub route map and security rules.

## Reuse First

- Reuse the current email and password login flow, session cookie pattern, auth helpers, and admin login screen composition.
- Rebrand and reroute the current auth system instead of replacing it.

## Implement

1. Keep admin-only email and password authentication with server-side sessions.
2. Update auth copy, metadata, and redirects so login lands users in the NewsPub admin workspace.
3. Update protected admin page and API path lists to match the new route topology.
4. Remove or disable public comment and guest-auth assumptions from the active auth layer.
5. Keep logout, session invalidation, and admin seed-user bootstrap behavior.
6. Ensure protected routes stay inaccessible without a valid session.

## Required Outputs

- `src/lib/auth/*`
- `src/app/admin/login/page.js`
- protected page and API middleware or proxy configuration

## Verify

- protected admin pages redirect to login without a valid session
- protected admin APIs reject unauthorized requests
- login and logout still work after the route map changes
- no public authentication or comment-related auth surfaces remain active

## Exit Criteria

- NewsPub admin authentication is working end to end
