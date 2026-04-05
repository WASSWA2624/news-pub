# Documentation Compliance Audit

Generated on 2026-04-05.

## Checked Modules

- `src/lib/news/shared.js`
- `src/lib/news/providers.js`
- `src/lib/news/publishers.js`
- `src/lib/news/workflows.js`
- `src/lib/analytics/index.js`
- `src/lib/seo/index.js`
- `src/lib/revalidation/index.js`
- `src/features/public-site/index.js`
- `src/features/posts/index.js`
- `src/features/analytics/index.js`
- `src/features/seo/index.js`
- `src/features/media/index.js`
- `src/components/layout/admin-shell.js`
- `src/components/layout/site-shell.js`
- `src/components/layout/public-equipment-search.js`
- `src/components/public/share-actions.js`

## Result

- Module-level JSDoc is present in the non-trivial runtime files listed above.
- Exported workflow, publishing, SEO, analytics, revalidation, and editor helpers carry focused JSDoc where behavior is not self-evident.
- Inline comments remain intentionally sparse and are reserved for behavior that benefits from local clarification.

## Residual Watchpoints

- Future route handlers and provider adapters should keep the same documentation standard when behavior changes.
- If additional social destination kinds or provider-specific quirks are added, their invariants should be documented in the adapter layer rather than spread through the UI.

