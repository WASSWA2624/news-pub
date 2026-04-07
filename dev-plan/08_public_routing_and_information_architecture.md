# 08 Public Routing And Information Architecture

Source sections: 3, 5, 17, 20, 23, 24.
Atomic aspect: public routing and information architecture only.
Prerequisite: step 07.

## Goal

Rebuild the public website around NewsPub routes and discovery surfaces while preserving the existing locale-aware shell architecture.

## Reuse First

- Reuse the `/[locale]` route family, locale helpers, root redirect behavior, public shell, and public search component pattern.
- Repurpose the current public-shell layout and navigation instead of creating a new shell system.

## Implement

1. Replace the old public route map with:
   - `/[locale]`
   - `/[locale]/news`
   - `/[locale]/news/[slug]`
   - `/[locale]/category/[slug]`
   - `/[locale]/search`
   - `/[locale]/about`
   - `/[locale]/privacy`
   - `/[locale]/disclaimer`
2. Remove active equipment and manufacturer landing pages from the public app tree.
3. Rebuild the public navigation so it links only to NewsPub routes.
4. Repurpose the existing global search component to search published stories instead of equipment entities.
5. Keep page-level route data read-only and limited to published website content.
6. Ensure all public layouts still work cleanly on mobile, tablet, and desktop.

## Required Outputs

- `src/app/[locale]/*`
- `src/features/i18n/routing.js`
- `src/components/layout/site-shell.js`
- public route metadata and page loaders

## Verify

- `/` redirects to the default locale
- all required public routes resolve under `/[locale]`
- no retired equipment or manufacturer public routes remain active
- the search entry points target NewsPub story search, not equipment search
- the public shell remains visually consistent across breakpoints

## Exit Criteria

- the public route family matches the NewsPub information architecture and is ready for content wiring
