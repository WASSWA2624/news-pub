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
   - published counts
   - failed runs
   - retry counts
   - top stories
   - connection health summaries
3. Keep analytics visibility behind RBAC where required.
4. Show recent operational status and public traffic in the same admin dashboard without mixing raw logs into KPI cards.

## Required Outputs

- dashboard queries
- `ViewEvent` reporting updates
- admin dashboard screen updates
- analytics tests

## Verify

- dashboard cards reflect current NewsPub operational metrics
- top-story and traffic widgets use persisted `ViewEvent` data
- analytics-restricted users see the intended limited dashboard state
- the dashboard no longer reports generation-job or equipment-specific metrics

## Exit Criteria

- the NewsPub dashboard surfaces both operational health and website traffic clearly
