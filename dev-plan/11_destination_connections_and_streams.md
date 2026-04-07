# 11 Destination Connections And Streams

Source sections: 8, 11, 14, 16, 18, 19, 21, 22.
Atomic aspect: destination and stream configuration only.
Prerequisite: step 10.

## Goal

Implement the admin-managed configuration layer for destinations, streams, categories, and template assignment.

## Reuse First

- Repurpose the existing source-configuration patterns, searchable selects, admin forms, and settings-style state handling.
- Keep destinations and streams explicit instead of collapsing them into one oversized configuration object.

## Implement

1. Build CRUD flows for destinations:
   - website
   - Facebook personal account
   - Facebook page
   - Instagram personal account
   - Instagram business or creator profile
2. Build CRUD flows for publishing streams with fields for:
   - provider
   - destination
   - locale
   - categories
   - country and region filters
   - include and exclude keywords
   - stream mode
   - max posts per run
   - provider request filters whose shared-batch compatibility remains visible in the admin UI
   - duplicate window
   - retry policy
   - schedule and timezone
   - template selection
3. Keep category management as a separate admin surface reused by streams and posts.
4. Persist destination connection status and recent publish history summaries.
5. Bootstrap the required website destination and allow later social destinations to be connected without code changes.

## Required Outputs

- destination and stream routes, APIs, and screens
- category admin screen updates
- template-assignment controls
- tests for stream persistence and validation

## Verify

- one destination can own multiple streams
- stream settings persist exactly and reload correctly
- categories can be assigned to streams without direct schema hacks
- provider credentials are not entered or edited in the stream UI
- stream forms explain that provider filters narrow provider requests while website streams still publish every locally eligible fetched item

## Exit Criteria

- NewsPub can persist and manage the operational configuration it needs before fetching content
