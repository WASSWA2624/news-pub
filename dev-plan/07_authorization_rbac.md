# 07 Authorization RBAC

Source sections: 6, 6.1, 6.2, 12.1, 32.
Atomic aspect: authorization only.
Prerequisite: step 06.

## Goal

Enforce the Release 1 permission model for `SUPER_ADMIN` and `EDITOR`.

## Implement

1. Define the server-side permission matrix for content, moderation, settings, and provider/source management actions.
2. Guard publish, schedule, archive, moderation, prompt configuration, source configuration, and provider configuration actions.
3. Ensure UI elements only show actions that the current role can perform.
4. Return consistent authorization failures from APIs and server actions.

## Required Outputs

- permission matrix
- reusable RBAC guard utilities
- role-aware admin UI behavior

## Verify

- blocked actions fail even if the UI is bypassed
- Super Admin can access all required admin settings
- Editor restrictions match the source-of-truth policy

## Exit Criteria

- all later admin features can rely on consistent role checks
