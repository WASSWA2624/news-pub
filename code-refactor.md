Use this prompt:

````markdown
# Implement the following changes in this NewsPub codebase

You are updating an existing Next.js + Prisma + styled-components NewsPub app. Make the changes directly in the current codebase structure and keep the implementation aligned with the existing architecture and coding style.

## Important codebase context

Focus on these files first:

- `src/lib/news/publishers.js`
- `src/lib/news/workflows.js`
- `src/lib/news/providers.js`
- `src/lib/news/provider-definitions.js`
- `src/components/admin/stream-form-card.js`
- `src/components/admin/provider-filter-fields.js`
- `src/components/admin/checkbox-search-field.js`
- `src/components/admin/admin-form-modal.js`
- `src/features/streams/index.js`
- `src/features/posts/index.js`
- `src/app/admin/actions.js`
- `src/app/api/streams/route.js`
- `src/app/admin/posts/[id]/page.js`
- `src/app/admin/jobs/page.js`
- `prisma/schema.prisma`
- `prisma/seed.js`

Also update or add tests where needed, especially around:

- `src/lib/news/workflows.test.js`
- `src/lib/news/providers.test.js`
- `src/lib/news/publishers.test.js`
- `src/features/streams/index.test.js`
- `src/features/posts/index.test.js`

---

## 1) Improve Facebook post formatting

### Problem
The current Facebook publishing flow is too plain. In `src/lib/news/publishers.js`, `buildFacebookMessage()` currently ignores the rendered `body` and mainly joins title/summary/url/source.

### Required behavior
Make Facebook posts feel polished and intentionally formatted:

- visually prominent title at the top
- clean, readable body
- good spacing between sections
- optional extra link placement support
- source attribution kept
- avoid ugly duplicate lines or empty sections
- do not rely on Markdown or HTML rendering in the final Facebook message text

### Implementation requirements
- Update the Facebook message builder so it uses the rendered template/body content, not only `title + summary`.
- Use a structure like:
  - title
  - body or summary
  - optional CTA / canonical link
  - optional extra stream-configured link
  - source attribution
- Create a small formatting utility for Facebook title emphasis. The title should look bold/prominent. Use a safe, readable approach that degrades gracefully.
- Keep the final message plain-text safe for Graph API posting.
- Keep current fallback behavior for photo vs feed posts intact.

### Also update
- default Facebook template in seeds if needed
- any helper used to compose social text so the output is clean and deterministic

---

## 2) Add optional stream-level custom post link + placement

### Problem
The stream add/edit modal does not support an optional custom link/url to insert into the post.

### Required behavior
In the stream config modal (create and edit), add:

- `Post Link URL` — optional
- `Post Link Placement` — options:
  - `RANDOM` (default)
  - `BELOW_TITLE`
  - `END`

### Rules
- The link is optional.
- This is a separate optional text link placed inside the social post body.
- Do **not** replace the existing canonical story URL behavior unless clearly required by the current publisher logic.
- `RANDOM` should randomly choose between `BELOW_TITLE` and `END` at publish time.
- Validate URL format.
- Only apply this link to social destinations where relevant.

### Persistence
Prefer storing this in `PublishingStream.settingsJson` under a typed structure, for example:

```json
{
  "providerFilters": {},
  "socialPost": {
    "linkUrl": "...",
    "linkPlacement": "RANDOM"
  }
}
````

Do not add separate DB columns unless truly necessary.

### Files to update

* `src/components/admin/stream-form-card.js`
* `src/features/streams/index.js`
* `src/app/admin/actions.js`
* `src/app/api/streams/route.js`
* any stream snapshot serializers used by the UI

---

## 3) Simplify scheduling: interval only, remove schedule expression from the product flow

### Required behavior

Scheduling should work like this:

* `Schedule interval minutes` = how long until the stream auto-runs again
* if interval is `0`, the stream should **not** auto-rerun
* `Schedule expression` is no longer needed in the product flow

### Implementation requirements

* Remove `Schedule expression` from the stream create/edit UI.
* Remove it from action handlers and API validation.
* Update scheduling logic so only interval matters.
* Allow `scheduleIntervalMinutes = 0`.
* In `runScheduledStreams()`, skip streams whose interval is `0`.
* Existing DB field can remain temporarily for backward compatibility, but it must become unused and effectively deprecated in runtime logic.

### Files to update

* `src/components/admin/stream-form-card.js`
* `src/features/streams/index.js`
* `src/app/admin/actions.js`
* `src/app/api/streams/route.js`
* `src/lib/news/workflows.js`
* optional Prisma migration only if you want to fully remove the field, otherwise keep it unused

---

## 4) Fix `Max posts per run` behavior

### Current issue

The current provider request builders use `maxPostsPerRun` as the upstream API fetch size, and the run loop processes everything returned. That does **not** match the required behavior.

### Required behavior

`Max posts per run` means:

* after filtering and selection, only this many posts should be persisted and published in a run
* all other fetched candidates must be discarded
* if some candidates are skipped/held/duplicates, keep evaluating more candidates until the run either:

  * reaches `maxPostsPerRun`, or
  * exhausts the fetched batch

### Critical implementation detail

Decouple:

* **provider fetch batch size**
  from
* **final publish/save cap**

### New behavior

* Introduce an internal fetch batch size larger than `maxPostsPerRun`
* Example: fetch `max(maxPostsPerRun * 3, 25)` or the closest supported/provider-safe equivalent
* Then locally evaluate/select candidates
* Persist and publish **only** the final selected candidates
* Discard all overflow candidates completely

### Apply this in

* `src/lib/news/providers.js`
* `src/lib/news/workflows.js`

---

## 5) Duplicate handling must prioritize unique posts

### Required behavior

`Duplicate window hours` means:

* a recently duplicated story must not be reposted until the window has passed
* unique posts are always preferred
* duplicate/repost-eligible items are only used when the number of unique selected posts is less than `Max posts per run`

### Selection algorithm

Implement this run selection order:

1. fetch candidates
2. normalize/evaluate/filter them
3. build a list of **unique eligible** candidates
4. build a separate list of **repost-eligible duplicate** candidates
5. select from unique first
6. only if selected unique count is still below `maxPostsPerRun`, fill remaining slots from repost-eligible duplicates
7. persist/publish only the selected items
8. discard all other fetched items

### Notes

* Keep historical duplicate blocking tied to `duplicateWindowHours`
* Do not let duplicates crowd out unique posts
* Make the behavior explicit and testable

### Files

* `src/lib/news/workflows.js`
* related tests

---

## 6) Auto-set provider date window

### Required behavior

Auto-set:

* `Date From` = previous date/window start
* `Date To` = current date/time

### Preferred interpretation

Use the actual run window:

* if a checkpoint exists, use the previous successful fetch time as the start
* otherwise use `now - 24 hours`
* always use `now` as the end

### Provider precision rule

* if the provider supports datetime precision, send full date-time values
* if the provider only supports date precision, send date-only values
* this should happen automatically at runtime
* editors should not need to manually keep changing these fields for recurring runs

### Implementation requirements

* Inject dynamic date window values during request building
* Do not rely on hardcoded static stream form dates for recurring fetches
* Preserve manual overrides only if they are still explicitly needed and do not break the automatic windowing behavior

### Files

* `src/lib/news/providers.js`
* `src/lib/news/provider-definitions.js`
* `src/lib/news/workflows.js`
* relevant tests

---

## 7) Do not download and save provider article photos; store URLs only

### Required behavior

For provider-ingested stories:

* do not download article images into media storage
* do not create `MediaAsset` / `MediaVariant` records for provider article photos
* store only the remote URL in `FetchedArticle.imageUrl`
* continue using remote URL publishing/rendering where supported

### Notes

* manual uploads to the media library should continue to work
* this rule applies to provider/story ingestion, not admin media upload workflows

### Audit this behavior

Check and preserve/fix this across:

* `src/lib/news/workflows.js`
* `src/features/media/index.js`
* any code path that might ingest remote story images into storage

---

## 8) Replace country/language checkbox groups with nested modal pickers app-wide

### Problem

Country and language checkbox groups take too much space and make the UI heavy.

### Required behavior

Replace them with a reusable nested modal picker pattern across the app:

* compact trigger field in the parent form
* clicking it opens a nested modal
* nested modal supports:

  * search
  * select all shown
  * deselect all shown
  * count summary
  * flag/icon display
  * selected chips/summary
* works well on mobile, tablet, and desktop

### Implementation requirements

Create a reusable component instead of one-off code.

Suggested approach:

* keep `CheckboxSearchField` as the engine or replace it with a more generic modal-based multi-select field
* use `AdminFormModal`
* wire it through `ProviderFilterFields`
* apply this anywhere country/language checkbox groups appear, not just one stream form

### Files

* `src/components/admin/checkbox-search-field.js`
* `src/components/admin/provider-filter-fields.js`
* `src/components/admin/admin-form-modal.js`
* any other places reusing checkbox-based country/language filters

---

## 9) Add app-wide processing indicators

### Required behavior

Implement clear processing/loading states across the app, especially for async admin actions:

* form submit pending states
* stream run progress
* destination discovery loading
* media upload/search loading
* manual publish/repost actions
* nested modal picker loading/search states where relevant

### UX requirements

* disable controls during active mutations where appropriate
* show accessible loading text and/or spinner
* use `aria-busy` where relevant
* keep the UI responsive on mobile/tablet/desktop
* avoid layout jumps

### Implementation guidance

Create reusable primitives if needed, for example:

* `InlineSpinner`
* `PendingButton`
* `BusyOverlay`
* `FormPendingState`

Then apply them consistently instead of hand-rolling per screen.

---

## 10) Add manual repost support regardless of post status

### Problem

There is retry support for failed publish attempts, but there is no clear manual repost action for admins regardless of post status.

### Required behavior

Add a manual repost action that lets an admin repost a post/story even if the post is:

* draft
* published
* archived
* failed
* scheduled
* otherwise already posted before

### Rules

* admin-triggered manual repost must be available from the UI
* it should create a fresh publish attempt
* it must be audited
* it should work even when the post already has a successful publish attempt
* it should be possible irrespective of post status
* destination/runtime readiness checks must still apply
* duplicate/cooldown guardrails should be bypassable for this **manual admin repost** flow only, not for normal automatic publishing

### Suggested implementation

* add a dedicated server action and workflow path for admin repost
* allow passing an override flag into social guardrail handling so manual repost can intentionally bypass duplicate/cooldown blocking
* keep source attribution and runtime connection checks intact
* surface this action on:

  * `src/app/admin/posts/[id]/page.js`
  * optionally published/review tables
  * optionally jobs/history screens where useful

### Files

* `src/features/posts/index.js`
* `src/lib/news/workflows.js`
* `src/app/admin/actions.js`
* `src/app/admin/posts/[id]/page.js`
* optionally `src/app/admin/jobs/page.js`

---

## 11) Responsive support

Everything above must work cleanly on:

* mobile
* tablet
* desktop

Do not ship a desktop-only admin experience.

Use the existing styled-components patterns and modal system already present in the repo.

---

## 12) Testing requirements

Add or update tests for at least these cases:

### Facebook formatting

* title/body/link/source composition is correct
* optional stream link placement works for:

  * below title
  * end
  * random
* message output has no duplicate blank sections

### Scheduling

* interval `0` means no auto-rerun
* interval `> 0` reruns correctly
* schedule expression is ignored/removed from runtime behavior

### Max posts per run

* fetched candidates can exceed max
* only `maxPostsPerRun` are persisted/published
* overflow candidates are discarded
* filtered/skipped candidates do not consume publish slots

### Duplicate prioritization

* unique posts are selected first
* duplicates only fill leftover capacity
* duplicates inside cooldown are blocked
* repost-eligible duplicates can fill remaining slots after unique posts

### Dynamic date windows

* start/end dates are derived from checkpoint and now
* date-only vs datetime formatting behaves correctly per provider

### Manual repost

* repost works even after a prior successful attempt
* repost can bypass duplicate/cooldown guardrails only in the manual override path
* audit event is created
* connection/runtime checks still apply

### UI

* stream form saves new social link settings
* nested modal pickers submit selected values correctly
* loading states render while actions are pending

---

## 13) Deliverables

Make the implementation end-to-end and production-ready.

Return:

1. a summary of what changed
2. the list of files changed
3. any Prisma migration details
4. any follow-up notes about backward compatibility or assumptions

```
