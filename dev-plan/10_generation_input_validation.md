# 10 Generation Input Validation

Source sections: 17, 23.1, 27.1.
Atomic aspect: generation input and request validation only.
Prerequisite: step 09.

## Goal

Lock the exact request contract used by the Generate Post page and generation APIs.

## Implement

1. Build a shared Zod schema for generation inputs.
2. Include every required field from sections 17 and 27: locale, toggles, depth, audiences, schedule, replace, and provider selection, with locale constrained by the config-driven supported locale set and equal to `en` in Release 1.
3. Apply the schema in both the admin UI layer and the API route.
4. Add cross-field validation for future schedules and duplicate-replacement rules.
5. Add validation for comment payloads in the same validation module family.

## Required Outputs

- shared generation request schema
- shared comment schema
- unit tests for valid and invalid payloads

## Verify

- invalid payloads fail with stable errors
- default values match the write-up
- the UI and API accept the same payload shape
- the only accepted active locale in Release 1 is `en`

## Exit Criteria

- generation contracts are fixed for all later steps
