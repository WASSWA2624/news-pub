# 17 Public Post Rendering Mobile First

Source sections: 5.1, 9, 24, 31.
Atomic aspect: public website rendering only.
Prerequisite: step 16.

## Goal

Render the complete English public website for Release 1 with mobile-first layouts and the required post structure, while reusing locale-aware components.

## Implement

1. Build the English home page under the locale-prefixed route structure.
2. Build the blog index page and post page templates.
3. Build category, manufacturer, and equipment landing pages.
4. Build the English About, Contact, Disclaimer, and Privacy pages from the locale-aware content system.
5. Render the post body in the exact order defined in section 9.
6. Render related posts, disclaimer, references, share actions, and comments placeholders on post pages.
7. Apply mobile-first responsive layouts, then tablet and desktop refinements.

## Required Outputs

- all mandatory public pages from section 5.1
- responsive post template
- reusable public layout components

## Verify

- every required public page renders
- post pages include all mandatory sections from section 24.2
- layouts work across mobile, tablet, and desktop widths

## Exit Criteria

- the public site exists and matches the required page inventory
