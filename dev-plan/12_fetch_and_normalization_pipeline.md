# 12 Fetch And Normalization Pipeline

Source sections: 10, 12, 19, 21, 22.
Atomic aspect: provider fetch execution and normalization only.
Prerequisite: step 11.

## Goal

Implement the end-to-end fetch pipeline that pulls provider data, applies the incremental window, and normalizes provider payloads into the shared internal contract.

## Reuse First

- Reuse the current jobs pattern, validation modules, API route shape, and audit-event style.
- Keep provider-specific logic inside integration adapters instead of leaking it into admin screens or public features.

## Implement

1. Define a shared provider-client contract for broad fetch execution.
2. Build provider adapters for `mediastack`, `newsdata`, and `newsapi`.
3. Load the stream checkpoint before each run and apply the incremental window rules from section `12`.
4. Normalize every fetched provider item into the shared `FetchedArticle` contract.
5. Validate normalized payloads before downstream filtering.
6. Record fetch-run summaries, warnings, and failures in audit logs and job views.
7. Expose a manual run-now trigger for stream execution without bypassing validation.

## Required Outputs

- provider client modules
- stream fetch APIs or jobs
- normalization utilities
- fetch validation tests

## Verify

- provider adapters all emit the same normalized contract
- stream checkpoints are read before fetch execution
- malformed provider payloads fail validation instead of silently entering later stages
- fetch summaries and failures are visible in the admin job timeline

## Exit Criteria

- NewsPub can fetch and normalize provider content consistently across all supported providers
