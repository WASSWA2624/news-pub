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
3. Introduce a normalized fetch-window contract that supports checkpoint-driven runs plus explicit manual, batched, retry, and diagnostic windows.
4. Partition multi-stream execution requests into the minimum safe number of compatible shared-fetch groups.
5. Load the stream checkpoint before each run and apply the incremental window rules from section `12`.
6. Normalize every fetched provider item into the shared `FetchedArticle` contract.
7. Validate normalized payloads before downstream filtering.
8. Record fetch-run summaries, warnings, failures, shared-group details, and endpoint-specific time-boundary semantics in audit logs and job views.
9. Expose manual run-now triggers for single-stream and batched stream execution without bypassing validation.
10. Document the shared provider contract, adapters, checkpoint flow, shared-group rules, and normalization utilities with JSDoc, and add inline comments where provider quirks, dedupe inputs, or incremental-window rules are not obvious from the code alone.

## Required Outputs

- provider client modules
- stream fetch APIs or jobs
- normalization utilities
- fetch validation tests

## Verify

- provider adapters all emit the same normalized contract
- stream checkpoints are read before fetch execution
- compatible multi-stream execution requests make one upstream provider call per safe shared group instead of one call per stream
- explicit bounded windows can be applied without accidentally advancing checkpoints
- malformed provider payloads fail validation instead of silently entering later stages
- normalization and checkpoint code explains provider-specific edge cases and workflow invariants without relying on tribal knowledge
- fetch summaries and failures are visible in the admin job timeline

## Exit Criteria

- NewsPub can fetch and normalize provider content consistently across all supported providers
