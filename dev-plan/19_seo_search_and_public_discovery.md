# 19 SEO Search And Public Discovery

Source sections: 5, 17, 20, 21, 23, 24.
Atomic aspect: SEO, search, discovery pages, and public metadata only.
Prerequisite: step 18.

## Goal

Adapt the existing SEO and discovery layer so NewsPub stories can be found, indexed, and navigated cleanly on the public website.

## Reuse First

- Reuse the current SEO helpers, sitemap and robots routes, public search pattern, and cached public query layer.
- Repurpose old blog-discovery features into NewsPub story discovery instead of rebuilding them from scratch.

## Implement

1. Generate story-level metadata and structured data for website publications.
2. Update sitemap and robots routes to reference the NewsPub route map.
3. Implement public story search against published website content only.
4. Implement category landing pages and related-story discovery.
5. Ensure public navigation, breadcrumbs, and share metadata all align with NewsPub story routes.
6. Remove stale equipment and manufacturer discovery behavior from the public SEO layer.

## Required Outputs

- SEO helpers and tests
- sitemap and robots routes
- public search APIs and pages
- related-story selection logic

## Verify

- metadata is generated for public stories and category pages
- search returns only published website stories
- sitemap and robots reflect the NewsPub route tree
- no equipment or manufacturer discovery logic remains active in public SEO paths

## Exit Criteria

- the public NewsPub website is discoverable through search, metadata, and category navigation
