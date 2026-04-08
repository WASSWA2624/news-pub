# 21 Analytics Dashboard And Reporting

Source sections: 6, 17, 21, 23, 24.
Atomic aspect: dashboard analytics, KPI reporting, and public view reporting only.
Prerequisite: step 20.

## Goal

Turn the admin dashboard into a NewsPub reporting surface for both operations and website traffic.

## Reuse First

- Reuse the current analytics dashboard screen, `ViewEvent` model, and analytics helper modules.
- Extend the existing dashboard instead of introducing a second reporting app.

## Implement

1. Track public view events for:
   - website home
   - category pages
   - story pages
2. Aggregate dashboard metrics for:
   - fetch counts
   - publishable counts
   - optimized counts
   - optimization cache reuses
   - blocked-before-publish counts
   - published counts
   - failed runs
   - retry counts
   - shared-fetch run counts
   - shared upstream call counts
   - top stories
   - connection health summaries
3. Preserve optimization diagnostics on recent publish-attempt reporting so admin reporting surfaces can distinguish completed AI output from `SKIPPED` or `FALLBACK` handling.
4. Preserve flattened publish-diagnostic reason codes and messages on recent publish-attempt reporting so pacing or guardrail blocks are visible without opening raw payload JSON.
5. Keep analytics visibility behind RBAC where required.
6. Show recent operational status, fetch-run execution mode, and public traffic in the same admin dashboard without mixing raw logs into KPI cards.

## Required Outputs

- dashboard queries
- `ViewEvent` reporting updates
- admin dashboard screen updates
- analytics tests

## Verify

- dashboard cards reflect current NewsPub operational and optimization metrics
- top-story and traffic widgets use persisted `ViewEvent` data
- analytics-restricted users see the intended limited dashboard state
- the dashboard no longer reports generation-job or equipment-specific metrics
- recent fetch reporting preserves shared-batch execution details and normalized fetch-window context for operator review
- recent publish reporting preserves optimization status and AI resolution diagnostics for operator review
- recent publish reporting also preserves flattened pacing or guardrail reason codes and messages for operator review

## Exit Criteria

- the NewsPub dashboard surfaces both operational health and website traffic clearly
