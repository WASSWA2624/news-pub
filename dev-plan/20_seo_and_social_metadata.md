# 20 SEO and Social Metadata

Source sections: 10, 10.1, 10.2, 10.3, 10.4, 5.2.
Atomic aspect: SEO metadata, crawl artifacts, and SEO admin only.
Prerequisite: step 19.

## Goal

Implement English SEO for Release 1 and keep the metadata system ready for future locale expansion.

## Implement

1. Generate metadata for the required English post translation in Release 1.
2. Implement canonical URLs and emit locale alternate links only when additional locales are enabled.
3. Implement Open Graph and Twitter/X metadata.
4. Implement sitemap and robots generation.
5. Implement breadcrumb, article, organization, and FAQ JSON-LD where applicable.
6. Build the SEO Management admin page for inspecting generated metadata.

## Required Outputs

- metadata generation utilities
- sitemap and robots handlers
- structured data emitters
- SEO management admin surface

## Verify

- published pages expose complete metadata
- sitemap and robots are valid
- canonical and alternate URLs match the locale routing rules
- the English-only Release 1 site does not emit broken alternate links

## Exit Criteria

- the public site is SEO-complete for Release 1
