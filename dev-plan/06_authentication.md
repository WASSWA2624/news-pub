# 06 Authentication

Source sections: 12, 12.1, 39.
Atomic aspect: authentication only.
Prerequisite: step 05.

## Goal

Implement Release 1 admin authentication with email/password and protected sessions.

## Implement

1. Build the admin login page and login API route.
2. Implement password hashing and credential verification.
3. Implement session creation, session expiry, logout, and session invalidation.
4. Protect admin routes and admin APIs with middleware or server-side guards.
5. Record authentication-related audit events.

## Required Outputs

- login UI
- login and logout endpoints
- session utilities
- route protection layer

## Verify

- anonymous users cannot access admin pages or admin APIs
- valid admins can log in and log out
- expired or tampered sessions are rejected

## Exit Criteria

- the admin area is protected and ready for RBAC
