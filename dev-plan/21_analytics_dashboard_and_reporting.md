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
   - top stories
   - connection health summaries
3. Preserve optimization diagnostics on recent publish-attempt reporting so admin reporting surfaces can distinguish completed AI output from `SKIPPED` or `FALLBACK` handling.
4. Keep analytics visibility behind RBAC where required.
5. Show recent operational status and public traffic in the same admin dashboard without mixing raw logs into KPI cards.

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
- recent publish reporting preserves optimization status and AI resolution diagnostics for operator review

## Exit Criteria

- the NewsPub dashboard surfaces both operational health and website traffic clearly
