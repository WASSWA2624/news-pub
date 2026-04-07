# 05 Database Indexes And Seeds

Source sections: 7, 8, 10, 11, 12, 13, 19, 24.
Atomic aspect: indexes, seed data, and bootstrap records only.
Prerequisite: step 04.

## Goal

Add the indexes and deterministic seed data needed for NewsPub to boot into a usable Release 1 state.

## Reuse First

- Reuse the existing Prisma seed entrypoint and idempotent seed style.
- Reuse existing query-driven index patterns for auth, publishing, analytics, and revalidation.

## Implement

1. Seed the default locale set with `en` marked as the default active locale.
2. Seed the admin user from env.
3. Seed a baseline internal news taxonomy that admins can edit later.
4. Seed provider rows for `mediastack`, `newsdata`, and `newsapi`, with `mediastack` enabled as the default provider.
5. Seed the default website destination and at least one deterministic baseline template per supported platform.
6. Add indexes for:
   - stream scheduling and status lookups
   - checkpoint reads and writes
   - provider article dedupe fields
   - article-match status queues
   - publish-attempt retry queries
   - published-post listing, slug lookup, and category discovery
   - view-event aggregation and audit-event timelines
7. Make seeds safe to rerun without creating duplicates.

## Required Outputs

- migration files for indexes
- `prisma/seed.js`
- seed tests where practical

## Verify

- `prisma db seed` is idempotent
- the default provider is `mediastack`
- the website destination exists after seeding
- key list, queue, and analytics queries are covered by explicit indexes

## Exit Criteria

- a fresh database can bootstrap into a valid NewsPub baseline with performant query paths
