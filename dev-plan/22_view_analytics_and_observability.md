# 22 View Analytics and Observability

Source sections: 33, 13.3, 5.2.
Atomic aspect: analytics, dashboard, and job logs only.
Prerequisite: step 21.

## Goal

Implement the Release 1 observability baseline and admin visibility into traffic and generation health.

## Implement

1. Track website, page, and post views using `ViewEvent`.
2. Persist generation logs, warnings, and failures per job.
3. Add structured logging for source fetch errors, media failures, and SEO failures.
4. Build the admin Dashboard page for summary metrics.
5. Build the Job Logs and Generation Logs admin page.
6. Expose admin metrics through protected endpoints only.

## Required Outputs

- analytics event capture
- dashboard admin surface
- jobs and generation logs admin surface

## Verify

- views are recorded and visible in admin
- generation jobs expose success, failure, and warning details
- failures are discoverable without inspecting raw server logs

## Exit Criteria

- admins can monitor traffic and content-generation health
