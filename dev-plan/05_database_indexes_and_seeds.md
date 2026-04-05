# 05 Database Indexes and Seeds

Source sections: 13.3, 31, 33, 34.
Atomic aspect: indexes, seeds, and baseline data only.
Prerequisite: step 04.

## Goal

Add the query-performance indexes and seed data that the app needs before feature work starts.

## Implement

1. Add indexes for slug lookups, localized post lookups, status, publish dates, and analytics time-series queries.
2. Seed the first Super Admin account from environment variables.
3. Seed the active locale registry with `en` only and seed provider configuration defaults.
4. Seed provider defaults in a way that works for any supported provider key and model id, not only OpenAI.
5. Seed baseline prompt templates and source configuration records.
6. Seed any required taxonomy defaults that later steps assume.
7. Make the seed flow idempotent.

## Required Outputs

- index migration
- seed script
- repeatable baseline data

## Verify

- repeated seed runs do not duplicate baseline rows
- key read paths use indexes
- seeded provider, prompt, and source records match the write-up contracts

## Exit Criteria

- the database is ready for auth, generation, and admin settings work
