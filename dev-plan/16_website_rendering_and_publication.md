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
2. Apply the bounded optimization layer to website-ready posts so the published website translation, slug, title, and SEO metadata can be refreshed safely before publication.
3. Ensure only `PUBLISHED` website posts render on public routes.
4. Update category landing pages and story indexes to query published NewsPub content only.
5. Keep source attribution, publish timestamps, provider source links, and featured images visible on story pages.
6. Wire website publish actions so publication creates or refreshes the correct public render artifacts and revalidates affected routes.
7. Ensure website streams process every locally eligible fetched article instead of stopping at a social-style `maxPostsPerRun` cap.
8. Keep locale-aware routing intact even if Release 1 only activates `en`.
9. Ensure fallback or non-AI publication paths still populate canonical URL, SEO title, meta description, and synchronized Open Graph or Twitter metadata.

## Required Outputs

- public story queries and render helpers
- website publish services
- route revalidation wiring
- public rendering tests

## Verify

- published stories appear on `/[locale]/news` and `/[locale]/news/[slug]`
- unpublished stories do not render publicly
- category pages only show published website content
- publish actions trigger route revalidation for affected paths and publish the current optimized website payload rather than stale draft content
- broad or shared provider fetches do not cause valid website items to be silently dropped before publication
- skipped or fallback AI paths still leave the published website translation with valid canonical and SEO metadata

## Exit Criteria

- NewsPub can publish canonical stories to its website destination
