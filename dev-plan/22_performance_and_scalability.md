# 22 Performance And Scalability

Source sections: 12, 13, 15, 17, 19, 20, 21, 24.
Atomic aspect: performance hardening and scale-readiness only.
Prerequisite: step 21.

## Goal

Harden NewsPub for realistic batch sizes, public traffic, and repeated scheduled execution.

## Reuse First

- Reuse the existing caching, pagination, query-shaping, and revalidation patterns.
- Improve the chosen architecture instead of adding a new scaling subsystem late in the build.

## Implement

1. Add pagination and bounded page sizes to admin list views and public listings.
2. Cache public query paths where the current architecture already supports it.
3. Keep provider fetching and publish retries bounded and concurrency-safe.
4. Eliminate obvious N+1 query paths in public and admin views.
5. Reuse stored media variants instead of regenerating them per request.
6. Validate that the indexes from step `05` support the hottest operational queries.
7. Add batch-size guards and timeout protections for scheduled runs.
8. Reuse one upstream provider call for compatible stream batches so NewsPub avoids unnecessary duplicate fetches without underfetching.
9. Extract shared admin field, disclosure, and action primitives where they reduce component nesting and rerender churn without adding new client-only layers unnecessarily.

## Required Outputs

- performance-focused query updates
- cache and pagination updates
- load-oriented tests or smoke checks
- notes on concurrency and limits

## Verify

- public story, category, and search pages avoid obvious N+1 patterns
- admin queues remain paginated and responsive
- scheduled runs honor configured bounds and do not process unbounded batches
- compatible multi-stream executions use the minimum safe number of upstream provider calls
- repeated media usage does not trigger avoidable reprocessing
- reused admin UI primitives simplify long-form screens without regressing responsiveness on lower-end devices

## Exit Criteria

- the NewsPub implementation is efficient enough for Release 1 operational use
