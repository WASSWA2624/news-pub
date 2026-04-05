# 16 Website Rendering And Publication

Source sections: 5, 14, 16, 17, 20, 21, 23, 24.
Atomic aspect: website render artifacts, publish flow, and public-website persistence only.
Prerequisite: step 15.

## Goal

Wire the canonical NewsPub post model into the website destination so published stories render correctly on public routes.

## Reuse First

- Reuse the existing posts feature layer, public-site queries, `PostTranslation` structure, and revalidation helpers.
- Repurpose the current blog-post rendering path into the NewsPub story path instead of introducing a parallel website CMS layer.

## Implement

1. Map canonical `Post` and `PostTranslation` records into the public NewsPub story routes.
2. Ensure only `PUBLISHED` website posts render on public routes.
3. Update category landing pages and story indexes to query published NewsPub content only.
4. Keep source attribution, publish timestamps, provider source links, and featured images visible on story pages.
5. Wire website publish actions so publication creates or refreshes the correct public render artifacts and revalidates affected routes.
6. Keep locale-aware routing intact even if Release 1 only activates `en`.

## Required Outputs

- public story queries and render helpers
- website publish services
- route revalidation wiring
- public rendering tests

## Verify

- published stories appear on `/[locale]/news` and `/[locale]/news/[slug]`
- unpublished stories do not render publicly
- category pages only show published website content
- publish actions trigger route revalidation for affected paths

## Exit Criteria

- NewsPub can publish canonical stories to its website destination
