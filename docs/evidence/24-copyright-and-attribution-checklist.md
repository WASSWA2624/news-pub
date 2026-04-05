# 24 Copyright And Attribution Checklist

Date: 2026-04-03

## Scope

This review covers source references, manual links, media assets, attribution metadata, and generated summaries for Release 1.

## Checklist

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Source references are persisted with canonical URLs and source metadata | Pass | [src/lib/ai/index.js](../../src/lib/ai/index.js), [src/lib/research/index.js](../../src/lib/research/index.js), [src/features/public-site/index.js](../../src/features/public-site/index.js) | Draft persistence writes `SourceReference` rows with title, URL, source type, domain, language, and reliability metadata, and public pages surface those references in the rendered article. |
| Manuals and technical documents are stored as links, not copied documents | Pass | [src/lib/ai/index.js](../../src/lib/ai/index.js), [src/lib/research/index.js](../../src/lib/research/index.js), [src/components/public/index.js](../../src/components/public/index.js) | Release 1 keeps manuals as linked references only; the rendering layer now strips unsafe URLs instead of turning them into clickable links. |
| Media assets carry attribution, license, usage notes, and AI-generated markers | Pass | [src/features/media/media-library.js](../../src/features/media/media-library.js), [src/components/admin/media-library-screen.js](../../src/components/admin/media-library-screen.js), [src/features/media/media-library.test.js](../../src/features/media/media-library.test.js) | Media uploads persist `attributionText`, `licenseType`, `usageNotes`, `sourceUrl`, `sourceDomain`, and `isAiGenerated`, which supports release-time attribution review. |
| Source domain restrictions are honored during research normalization | Pass | [src/lib/research/index.js](../../src/lib/research/index.js), [src/components/admin/source-configuration-screen.js](../../src/components/admin/source-configuration-screen.js), [src/lib/research/index.test.js](../../src/lib/research/index.test.js) | Allowed domains can be configured per source tier, disallowed domains are skipped with reliability warnings, and unsafe URL schemes are excluded entirely. |
| Generated summaries keep references and disclaimer visible | Pass | [src/lib/ai/index.js](../../src/lib/ai/index.js), [src/lib/ai/index.test.js](../../src/lib/ai/index.test.js), [src/features/public-site/index.js](../../src/features/public-site/index.js) | Composition requires `references` and `disclaimer` sections, and public post rendering injects fallback sections if structured content omitted them. |
| Reader-facing text avoids hidden AI-authorship or unverifiable workflow claims | Pass | [src/lib/ai/index.js](../../src/lib/ai/index.js), [src/lib/ai/index.test.js](../../src/lib/ai/index.test.js) | Composition validation rejects AI-authorship wording, internal workflow phrasing, and unsupported disclosure language in the generated article body. |
| Image rendering respects storage/public URL boundaries | Pass | [src/lib/media/index.js](../../src/lib/media/index.js), [src/lib/storage/index.js](../../src/lib/storage/index.js), [src/lib/media/index.test.js](../../src/lib/media/index.test.js) | Rendered image URLs are normalized to safe media URLs, local storage stays under `public/uploads`, and reserved fixture hosts are replaced with placeholder previews. |
| Public references and manuals no longer emit unsafe clickable links | Pass | [src/lib/security/index.js](../../src/lib/security/index.js), [src/lib/markdown/index.js](../../src/lib/markdown/index.js), [src/components/public/index.js](../../src/components/public/index.js), [src/lib/markdown/index.test.js](../../src/lib/markdown/index.test.js) | Step 24 added link sanitization to persisted HTML, Markdown export, and public React rendering so malicious schemes are neutralized before display. |

## Release Conclusion

Release 1 now has traceable source attribution, link-only handling for manuals, stored media attribution fields, and safe rendering rules for reference URLs. No mandatory copyright or attribution requirement in the write-up remains without implementation evidence.
