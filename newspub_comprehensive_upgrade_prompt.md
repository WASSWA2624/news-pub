```markdown
# NewsPub Gap-Only Upgrade Prompt

Review the current codebase **as it exists now** and implement **only the missing work** required by the gaps below. Do **not** rewrite already-correct areas, do **not** restate completed capabilities, and do **not** broaden scope beyond these items. Update all affected files across the codebase where necessary.

## Scope Boundaries

- Treat the public story detail route as the page rendered by:
  - `src/app/[locale]/news/[slug]/page.js`
  - `src/components/public/index.js` (`PublicStoryPage`)
  - related helpers in `src/features/public-site/index.js`, `src/lib/seo/index.js`, and any supporting SEO/public UI modules.
- Keep the work **gap-only**. Preserve the existing architecture, App Router structure, data flow, and working features.
- Do not introduce speculative features unless they are required to close a listed gap.

## Gap 1 — Full Code Documentation Is Not Yet Complete

The repository already contains some inline documentation, but coverage is incomplete and inconsistent across many files. Close that gap.

### Required implementation

- Add **complete, meaningful documentation** to all touched files and all important existing modules that currently lack it, especially in:
  - `src/components/`**
  - `src/features/**`
  - `src/lib/**`
  - `src/app/**`
  - `src/store/**`
  - `scripts/**`
- Use concise, high-value documentation only. Avoid noise comments.
- Add or improve:
  - file-level purpose comments where helpful,
  - JSDoc for exported functions, utilities, data mappers, and complex internal helpers,
  - prop documentation for non-trivial React components,
  - inline comments only for logic that is non-obvious.
- Document assumptions, fallbacks, sanitization behavior, SEO decisions, and rendering constraints where they are not obvious.
- Remove stale, misleading, or low-value comments.

### Documentation quality rules

- Documentation must explain **why** something exists, not just paraphrase the code.
- Keep wording precise and professional.
- Do not add comments to trivial one-line assignments or obvious JSX.
- Ensure documentation stays aligned with the actual implementation.

### Acceptance criteria

- Every exported non-trivial function/component in touched areas is documented.
- Complex data transformation and SEO helpers are documented.
- No obvious undocumented “core flow” modules remain in the story page pipeline.
- No misleading or redundant comments remain.

## Gap 2 — The `/en/news-id` Story Detail Experience Still Needs Editorial and UX Refinement

Improve the public article detail experience so it is more attractive to read, better organized, less repetitive, and stronger on all screen sizes. Apply this to the actual detail page route in this repository.

### Current gap signals to address

The current story page already has a strong structure, but there are still visible gaps:

- article metadata is repeated across multiple blocks,
- some sections feel verbose or generic instead of editorially useful,
- the reading hierarchy can be cleaner,
- several labels/copy strings are hardcoded and not consistently content-driven,
- the page should feel more premium and readable on mobile, tablet, laptop, and wide screens.

### Required implementation

#### A. Eliminate duplicated story information

Reduce repetition across hero, facts, highlight strip, reading header, sidebar, and other article-detail sections.

- Remove redundant repeats of the same source/date/category/reading-time information unless each occurrence has a distinct user purpose.
- Keep one clear primary presentation of core article facts and only one secondary supporting presentation where it improves usability.
- Ensure the article summary is not unnecessarily repeated in multiple blocks.
- Ensure media, source attribution, and related stories do not restate information already presented more clearly elsewhere.

#### B. Improve article reading experience

Refine the story page into a cleaner editorial layout.

- Strengthen visual hierarchy for:
  - source/context,
  - headline,
  - summary/standfirst,
  - byline/meta row,
  - primary media,
  - article body,
  - related content.
- Improve typography rhythm, spacing, line length, paragraph readability, and section separation.
- Make the article body easier to scan with better treatment for headings, lists, quotes, embedded media, and long-form content.
- Ensure the main reading column remains the visual priority.
- Make side content supportive, not competitive.
- Improve CTA wording and placement so the page feels polished rather than mechanically generated.

#### C. Improve responsiveness on all screen sizes

The story page must look intentionally designed across all breakpoints.

- Audit mobile, tablet, desktop, and wide-screen behavior.
- Eliminate awkward stacking, cramped metadata rows, inconsistent spacing, and weak horizontal alignment.
- Ensure image/media areas, tags, side rail content, action rows, and related stories reflow cleanly.
- Ensure no section looks overloaded on small screens or sparse on large screens.
- Preserve strong readability and hierarchy at every breakpoint.

#### D. Make the page more content-driven and less generic

- Replace generic filler copy with useful, article-aware presentation where possible.
- Prefer real article/category/source data over decorative explanatory copy.
- Avoid sections that exist only to describe the layout itself.
- Keep editorial UI text concise and purposeful.

#### E. Improve localization readiness

Even if the immediate concern is `/en/...`, close the gap properly.

- Move remaining hardcoded user-facing story page strings into the existing message/localization system where appropriate.
- Keep the page fully compatible with locale-aware rendering.
- Do not regress current locale routing or metadata behavior.

### Acceptance criteria

- The detail page feels cleaner, more premium, and easier to read.
- Repeated article facts are reduced substantially.
- Mobile and desktop layouts both look intentional and balanced.
- The page remains data-driven and maintainable.
- User-facing text on the story page is no longer inconsistently hardcoded.

## Gap 3 — Story Detail SEO Is Good but Not Yet Maximized

The code already includes metadata and `NewsArticle` structured data, but the story page is not yet fully exploiting the available SEO data model. Close that gap without breaking existing behavior.

### Required implementation

#### A. Use the strongest SEO fields consistently

Audit the story-page SEO pipeline and ensure the best available fields are used consistently.

- Prefer the article’s dedicated SEO fields wherever present.
- Use the best available image for metadata/social previews. If a dedicated SEO image exists, ensure it is actually used.
- Ensure metadata title/description/canonical/open graph/twitter values are driven by the strongest available article SEO values with safe fallbacks.
- Keep canonical behavior stable and correct.

#### B. Improve structured data depth for article pages

Extend structured data where the data already exists or can be safely derived.

- Keep `NewsArticle` valid and enhance it with relevant supported properties when available, such as article section/category context, keywords, image, publisher/source context, and other article metadata already present in the model.
- Ensure breadcrumb structured data remains correct.
- Avoid adding invalid or fabricated schema fields.

#### C. Strengthen on-page SEO semantics

- Ensure the page has one clear H1.
- Ensure heading hierarchy below the H1 is logical and non-skipped.
- Improve semantic markup for article content, source attribution, related stories, media captions, and navigational context where appropriate.
- Ensure internal linking to category/news pages is useful and not excessive.
- Ensure noindex/index behavior is unchanged unless explicitly required by actual publishing state.

#### D. Improve content uniqueness and crawl value

- Reduce boilerplate copy that adds little search value.
- Make above-the-fold content more article-specific.
- Ensure titles, summaries, captions, and related modules reinforce the article topic rather than repeating generic platform language.

### Acceptance criteria

- Story metadata uses the best available SEO-specific fields.
- Social preview metadata is improved without regressions.
- Structured data is richer but still valid.
- The rendered article page has stronger semantic SEO and less boilerplate.

## Required Validation

After implementing the gaps above:

- update or add automated tests for the story-page metadata, structured-data generation, and any changed public-page helpers,
- update tests for any moved localization strings or changed rendering behavior,
- verify the story page still renders safely when optional data is missing,
- verify there are no regressions for canonical URLs, article JSON-LD, related stories, or media fallbacks.

## Output Requirements

- Modify all necessary files across the codebase.
- Keep the implementation production-ready, concise, and maintainable.
- Preserve existing working behavior unless changing it is required to close one of the listed gaps.
- Do not include a broad rewrite plan in the output; implement the code changes directly.

```

