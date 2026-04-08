# NewsPub Gap-Only Upgrade Prompt — Search, Discovery, and Footer

Review the current codebase **as it exists now** and implement **only the missing work** required by the gaps below. Do **not** rewrite already-correct areas, do **not** restate completed capabilities, and do **not** broaden scope beyond these items. Update all affected files across the codebase where necessary.

## Scope Boundaries

- Treat the public search/discovery experience as the implementation centered on:
  - `src/app/[locale]/search/page.js`
  - `src/components/public/index.js` (`PublicCollectionPage` and related public listing UI)
  - `src/components/public/home-latest-stories.js`
  - `src/components/layout/site-shell.js`
  - `src/components/layout/public-story-search.js`
  - `src/features/public-site/index.js`
  - `src/messages/*.json`
  - any related API routes, SEO helpers, tests, and shared public UI modules touched by these changes.
- Keep the work **gap-only**. Preserve the existing App Router structure, locale-aware architecture, public-shell composition, and working story/category listing behavior.
- Do not replace the current public-site architecture with a new search stack unless a change is strictly required to close a listed gap.

## Gap 1 — Search Works, but Relevance, Discovery, and Search UX Are Still Underpowered

The repository already has a public search page, query handling, optional country filtering, and paginated result rendering. However, the current implementation still behaves like a basic text filter instead of a strong discovery experience.

### Current gap signals to address

The codebase currently shows these practical gaps:

- search matching is broad but not intelligently ranked,
- results appear to be ordered mainly by recency instead of best relevance for the query,
- the search page gives limited help when a query is empty, too broad, or returns nothing,
- discovery is still shallow because the search experience does not strongly guide users into categories, countries, related topics, or alternative queries,
- the UI does not yet expose enough query context, result context, or refinement affordances to make search feel polished,
- some search/discovery copy and labels are still too generic or incomplete for a premium public experience.

### Required implementation

#### A. Improve search relevance instead of relying mainly on recency

Upgrade the search behavior so it returns the **best matches first** while preserving the existing published-only boundary.

- Keep the search limited to published website stories only.
- Improve matching and ranking across the fields that already exist in the data model, with clear prioritization such as:
  - exact or near-exact title matches,
  - title and summary matches,
  - slug matches,
  - category matches,
  - source-name matches,
  - body/content matches as a weaker fallback.
- Do not let long body-content matches outrank clearly better title or summary matches.
- Where the query contains multiple terms, prefer results matching more of the terms over weaker partial hits.
- Preserve sensible recency tie-breaking **after** relevance is applied.
- Keep the implementation maintainable and database-safe. Avoid a fragile or overly expensive search strategy.

#### B. Improve query normalization and refinement behavior

Strengthen search input handling and refinement without overengineering it.

- Normalize queries more carefully so search is resilient to extra spaces, casing, and obvious formatting noise.
- Ensure empty or near-empty queries do not create a poor discovery experience.
- Support more useful behavior for short queries and phrase-like queries when practical within the current architecture.
- Keep country filtering working, but make sure it integrates cleanly with improved relevance and pagination.
- Preserve route-driven search state so filtered/search URLs remain shareable and crawl-safe where appropriate.

#### C. Improve the public search page UX

Refine the search page so it feels like a deliberate discovery surface instead of just a form above a list.

- Show clear query context in the page results area.
- Show useful result-state messaging for:
  - active search queries,
  - filtered searches,
  - no-result searches,
  - empty-query discovery states.
- Add concise, high-value guidance when no results are found, such as suggesting category browsing, country changes, or broader query phrasing.
- Surface result counts, active filters, or equivalent context where it improves clarity.
- Make the search form easier to scan and use on mobile, tablet, laptop, and wide screens.
- Improve spacing, hierarchy, button alignment, and form responsiveness so the search controls feel production-ready.

#### D. Strengthen discovery around search results

Make search do more than return a flat list.

- Improve discovery connections from the search page into:
  - category pages,
  - country coverage views,
  - related browsing paths,
  - latest or high-signal stories when the query is absent or too narrow.
- Prefer reusing existing public data helpers and route patterns.
- Ensure discovery additions are based on real site data and not placeholder sections.
- Do not flood the page with decorative modules; every added discovery block must help the user find relevant content faster.

#### E. Improve result-card usefulness for discovery

Refine the compact result/listing cards where necessary to better support search and browsing.

- Make it easier to understand **why** a result is relevant by improving the displayed metadata where appropriate.
- Ensure titles, excerpts, source labels, dates, category context, and image treatment support scanning without clutter.
- Avoid overloading result rows with repeated or low-value metadata.
- Ensure result cards remain clean and highly readable across breakpoints.

#### F. Improve search/discovery localization readiness

Close the search gap in a locale-safe way.

- Move remaining user-facing search/discovery strings into the message system where appropriate.
- Avoid introducing new hardcoded English-only labels in shared public search and discovery UI.
- Preserve compatibility with the locale-aware route and metadata system.

### Acceptance criteria

- Search results are visibly more relevant for real-world queries.
- Better title/category/source matches appear before weaker body-only matches.
- Search still returns only published website stories.
- The search page communicates query state, empty state, and no-results state clearly.
- Search and filter controls feel polished and responsive.
- Discovery from the search surface is meaningfully stronger without bloating the page.
- User-facing search copy is localization-ready.

## Gap 2 — The Footer Exists, but It Is Still Too Shallow to Support Strong Discovery and a Premium Public UX

The public footer is already present and functional, but it remains relatively thin, partly hardcoded, and underutilized as a discovery and trust surface.

### Current gap signals to address

The current footer shows these gaps:

- it exposes only a very small subset of useful discovery links,
- it currently links only to the first available category and first available country instead of providing a stronger browsing experience,
- section labels and legal/footer copy are partly hardcoded,
- the footer does not do enough to help readers continue exploring the site,
- the footer information architecture is still too minimal for a polished news/discovery product,
- responsiveness and hierarchy can be improved so the footer feels intentional on all screen sizes.

### Required implementation

#### A. Turn the footer into a real discovery surface

Improve the footer so it actively helps readers browse the site.

- Expand footer discovery beyond a single category link and a single country link.
- Reuse real public navigation data already available to the shell where possible.
- Surface meaningful, bounded sets of links such as:
  - core browse routes,
  - top categories,
  - top countries/regions,
  - important informational/legal routes.
- Keep the number of links curated and useful. Do not create an oversized link farm.

#### B. Improve footer information architecture

Refine the footer structure so it reads like a mature public product.

- Separate content into clearer groups such as browse, discover, company, and legal where appropriate.
- Ensure section ordering and grouping make sense for both readers and crawl value.
- Keep primary site actions prominent without duplicating the header mechanically.
- Make the footer feel editorially aligned with the public site rather than generic app chrome.

#### C. Improve footer design quality and responsiveness

Polish the footer layout across all breakpoints.

- Improve visual hierarchy, spacing, alignment, and column behavior.
- Ensure columns reflow cleanly on narrow screens and do not feel sparse on wide screens.
- Improve tap targets, readability, and scannability for mobile users.
- Keep the footer visually strong but not visually heavier than the page content above it.

#### D. Improve footer content quality and trust signals

Make footer copy more purposeful and less generic.

- Use concise, high-value site copy.
- Ensure footer branding, supporting text, and legal/navigation areas feel intentional and trustworthy.
- Add useful contextual cues only where they help discovery or credibility.
- Avoid filler copy and avoid repeating header language without added value.

#### E. Close localization and hardcoded-string gaps in the footer

- Move footer section titles, bottom-line copy, and any remaining hardcoded user-facing labels into the existing message/localization system where appropriate.
- Ensure the footer remains fully locale-compatible.
- Do not regress the existing shell behavior or locale route handling.

### Acceptance criteria

- The footer supports meaningful continued discovery.
- It no longer depends on only one category link and one country link for discovery.
- Footer copy and section labels are localization-ready.
- The footer layout is stronger and more polished on mobile and desktop.
- The footer feels like part of a premium public news product rather than a minimal utility footer.

## Required Validation

After implementing the gaps above:

- update or add automated tests for improved search ranking/query behavior,
- add tests for empty-query, filtered-query, and no-results search states where behavior changed,
- update tests for any changed public-shell/footer rendering behavior,
- update tests for moved localization strings,
- verify the public search page remains stable when optional category, source, image, country, or excerpt data is missing,
- verify pagination still behaves correctly after the relevance improvements,
- verify footer link rendering remains bounded, deterministic, and locale-safe.

## Output Requirements

- Modify all necessary files across the codebase.
- Keep the implementation production-ready, concise, and maintainable.
- Preserve existing working behavior unless changing it is required to close one of the listed gaps.
- Do not include a broad rewrite plan in the output; implement the code changes directly.
