# 09 Admin Information Architecture

Source sections: 3, 6, 9, 11, 14, 21, 23, 24.
Atomic aspect: admin routes, navigation, and surface ownership only.
Prerequisite: step 08.

## Goal

Turn the current admin workspace into a NewsPub operations console with stable route ownership before feature logic fills the screens.

## Reuse First

- Reuse the current admin shell, breakpoint-aware navigation, layout styling, and screen composition pattern.
- Repurpose existing admin screens before introducing new route families or duplicate UI frameworks.

## Implement

1. Define the NewsPub admin route map:
   - `/admin`
   - `/admin/providers`
   - `/admin/destinations`
   - `/admin/streams`
   - `/admin/categories`
   - `/admin/posts/review`
   - `/admin/posts/published`
   - `/admin/posts/[id]`
   - `/admin/media`
   - `/admin/templates`
   - `/admin/jobs`
   - `/admin/seo`
   - `/admin/settings`
2. Update the admin navigation keys, labels, and order for mobile, tablet, and desktop.
3. Repurpose current screens to the new responsibilities:
   - provider screen for news providers
   - source screen for streams
   - post inventory for review and published queues
   - post editor for canonical story review
   - analytics dashboard for NewsPub operations
4. Remove prompt, localization, manufacturer, generation, and comment screens from the active admin IA.
5. Ensure each admin route has a single owning screen or feature module.

## Required Outputs

- `src/app/admin/*`
- `src/components/layout/admin-shell.js`
- admin screen route wrappers
- navigation and route ownership docs in code or ADRs

## Verify

- every required admin route exists and is protected
- admin navigation matches the route map across all breakpoints
- no retired AI, manufacturer, localization, or comment screens remain in active navigation
- each page has a clear module owner

## Exit Criteria

- the admin workspace is structurally aligned with NewsPub operations
