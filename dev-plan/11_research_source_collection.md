# 11 Research Source Collection

Source sections: 19, 20, 21, 22.2, 5.2.
Atomic aspect: research ingestion, source configuration, and manufacturer data management only.
Prerequisite: step 10.

## Goal

Build the source-grounded research layer that feeds the writing pipeline.

## Implement

1. Implement source adapters in the exact priority order defined in section 19.
2. Normalize manufacturers, manufacturer aliases, models, faults, manuals, and source references.
3. Apply the deterministic ranking rules for manufacturers and models from section 20.
4. Apply the deterministic fault rules from section 21.
5. Store source metadata, reliability markers, and last-checked timestamps.
6. Build the admin Source Configuration page to manage enabled source tiers and allowed domains.
7. Build the admin Manufacturers Management page to review canonical manufacturers and aliases.

## Required Outputs

- verified research payload builder
- source configuration admin surface
- manufacturer management admin surface

## Verify

- each critical fact cluster in the payload has source attribution
- ranking and tie-break logic is deterministic
- aliases collapse into canonical manufacturer records correctly

## Exit Criteria

- the app can build a reliable structured research package for AI composition
