# 07 Authorization RBAC

Source sections: 6, 9, 14, 18, 21, 22.
Atomic aspect: authorization and permission mapping only.
Prerequisite: step 06.

## Goal

Define the NewsPub permission model and wire it into navigation, pages, and APIs.

## Reuse First

- Reuse the current central RBAC module, permission-matrix pattern, admin navigation filtering, and page-access helpers.
- Keep roles simple and explicit instead of adding unnecessary role types.

## Implement

1. Define the NewsPub permission set for:
   - dashboard access
   - provider management
   - destination management
   - stream management
   - category management
   - review queue access
   - published inventory access
   - post editing and publishing
   - template management
   - media management
   - jobs and observability
   - SEO settings
   - analytics visibility
   - admin settings
2. Map `SUPER_ADMIN` to full access.
3. Map `EDITOR` to review, edit, schedule, publish, and queue visibility without unrestricted secret or settings management.
4. Update admin navigation so it reflects the new route families.
5. Update page guards and API permission checks to use the new permission names.

## Required Outputs

- `src/lib/auth/rbac.js`
- navigation and access-rule definitions
- any affected API permission helpers

## Verify

- page visibility, navigation visibility, and API access all agree on the same permission map
- `EDITOR` cannot access provider secrets or protected settings screens
- `SUPER_ADMIN` can access every required NewsPub surface
- no permission entries remain for retired AI, prompt, manufacturer, or comment features

## Exit Criteria

- NewsPub authorization is explicit, centralized, and consistent across the app
