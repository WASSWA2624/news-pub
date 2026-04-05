# 13 Duplicate Equipment Detection

Source sections: 3.3, 7.1, 23.2, 35.
Atomic aspect: duplicate-handling flow only.
Prerequisite: step 12.

## Goal

Prevent accidental duplicate generation and enforce explicit replacement decisions.

## Implement

1. Detect duplicates using canonical equipment identity plus locale.
2. Check existing non-archived posts only.
3. Block generation when a duplicate exists until the admin chooses replacement or cancel.
4. Implement replacement semantics that preserve the existing post record and canonical slug unless the slug is manually edited later.
5. Record duplicate detection and replacement decisions in audit logs and generation job records.

## Required Outputs

- duplicate detection service
- replace-or-cancel branch
- duplicate decision audit trail

## Verify

- duplicate generation cannot proceed silently
- cancel leaves the existing post unchanged
- replace updates the correct post record

## Exit Criteria

- duplicate handling is fully enforced before generation
