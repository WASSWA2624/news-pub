# ADR 0001: Stack Foundation

- Status: Accepted
- Date: 2026-04-02
- Source sections: 4, 14, 15, 16, 44, 46

## Context

Release 1 needs one full-stack framework, one validation layer, one persistence stack, one AI integration layer, and one styling/state approach that later steps can reuse without rework.

## Decision

The application will use the following fixed Release 1 stack:

- Next.js with the App Router for the full-stack application surface
- JavaScript only for application code
- Vercel AI SDK for draft-generation workflows
- styled-components for theming and styling
- Redux Toolkit for admin-side client state only
- Zod for runtime validation, including environment, form, API, and AI-output validation
- Prisma for ORM and relational data access
- MySQL as the database

Implementation rules frozen by this ADR:

- Later steps may use current stable package versions, but they must commit a lockfile.
- Later steps must not substitute these libraries with alternatives.
- Server components remain the default rendering model; Redux Toolkit is reserved for admin-side client state that genuinely needs client coordination.

## Consequences

- Step 02 must scaffold the project around App Router route handlers and layouts.
- Step 03 and later must centralize validation through Zod rather than ad hoc checks.
- Step 04 and later must model persistence in Prisma against MySQL, not a different database.
- Release 1 intentionally avoids a TypeScript migration so the codebase stays aligned with the source of truth.
