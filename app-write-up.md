# NewsPub - App Write-Up

## 1. Project Overview

`NewsPub` is a news ingestion, filtering, scheduling, and publishing platform.

The app fetches news from a selected third-party news API, stores the fetched items, filters the articles that match configured categories and publishing rules, formats the resulting posts, and automatically publishes them to one or more destinations.

Primary publishing destinations for Release 1:

- website
- Facebook
- Instagram

Release 1 focuses on automated publishing from external news sources. This product is not an AI content-generation app, and the AI SDK must not be part of the implementation or architecture.

## 2. Core Goal

The goal of `NewsPub` is to let an authenticated admin configure one or more publishing pipelines such that:

1. the app calls a selected news API on a defined schedule
2. the app fetches all available news for that run from the chosen provider
3. the app filters the fetched articles into the relevant categories and targets
4. the app stores the fetched and selected articles in the database
5. the app formats the selected articles into destination-ready posts
6. the app automatically publishes qualifying posts to the configured website, Facebook destination, or Instagram destination

The system should minimize unnecessary API calls by fetching broadly in one run, then filtering locally in the app or webhook workflow.

## 3. Supported News Providers

Release 1 must support selecting any of the following news APIs:

- `https://newsdata.io`
- `https://newsapi.org`
- `https://mediastack.com`

Default provider:

- `https://mediastack.com`

Provider rules:

- the admin must be able to choose the active provider in the dashboard
- the system must support provider-specific credentials and settings
- the system must normalize fetched news from all supported providers into one internal article format
- provider switching must not require code changes once the integration exists

## 4. Publishing Destinations

Release 1 must support publishing to:

- the app's website
- a Facebook personal account
- Facebook pages connected to the user
- an Instagram personal account
- Instagram pages or profiles connected to the user

Destination rules:

- a single news item may be published to one platform, multiple platforms, or all configured platforms
- destination configuration must be manageable from the dashboard
- each destination may have its own categories, country filters, language filters, and publishing cadence
- each destination must store its own connection status, identifiers, and publish history

## 5. End-to-End Workflow

### 5.1 Scheduled Fetch and Publish Flow

1. A scheduler or webhook triggers a fetch job.
2. The system uses the selected news API, defaulting to `mediastack` unless another source is configured.
3. The system fetches all news available for the configured request scope for that run.
4. The system converts provider responses into a common internal schema.
5. The system filters the fetched items by configured categories, countries or regions, language, keywords, excluded keywords, and destination rules.
6. The system saves fetched articles and filtered matches to the database.
7. The system deduplicates items already processed or published.
8. The system formats matched items into destination-specific post payloads.
9. The system publishes the content automatically to the configured website, Facebook destination, Instagram destination, or all selected destinations.
10. The system logs success, failure, and retry details for every fetch and publish attempt.

### 5.2 Fetch-Broadly, Filter-Locally Rule

The system must fetch all news available for the selected query scope during each API run, then perform filtering inside the app or webhook flow before publishing.

This rule is mandatory because the design should reduce total API request usage by avoiding repeated narrowly scoped provider calls for each category or platform.

## 6. Internal Article Format

All supported news providers must map into a shared internal article structure before filtering or publishing.

Minimum normalized article fields:

- provider name
- provider article id when available
- article title
- article description or summary
- article body or content when available
- source name
- source URL
- author when available
- published date and time
- image URL when available
- category or categories
- country or region when available
- language
- tags or keywords derived from provider data or app rules
- fetch timestamp
- destination eligibility status

The normalized article record is the source of truth for downstream filtering, deduplication, formatting, and publishing.

## 7. Formatting and Publishing Rules

The app must format saved articles into the required structure for each destination before publishing.

Minimum formatting requirements:

- website posts must support title, summary, body, featured image, source attribution, category, language, publish time, and external source link
- Facebook posts must support title or intro text, body copy, source link, and media when supported
- Instagram posts must support caption text, source reference where appropriate, and media when supported

Formatting rules:

- keep provider facts intact and do not invent missing news content
- preserve source attribution
- support destination-specific length limits and formatting differences
- allow configurable templates per destination
- support category-based templates when needed

## 8. Dashboard Requirements

The admin dashboard must make it possible to manage the automation workflow without code changes.

At minimum, the dashboard must allow the admin to configure:

- the platform or platforms to publish to
- the account, page, or profile for each platform
- the frequency at which the selected API is called
- the categories assigned to each post stream, platform, page, or profile
- the target country or region
- the language, with `English` as the default
- the selected news provider
- provider credentials and provider-specific settings
- publish status per destination
- whether publishing is automatic or held for review
- post templates or formatting rules
- inclusion keywords
- exclusion keywords
- maximum posts per run
- duplicate handling rules
- retry rules for failed publish attempts
- timezone-aware schedule settings

The dashboard should also include:

- destination connection status
- recent fetch logs
- recent publish logs
- article history
- filtering results
- failed post retries

## 9. Scheduling and Frequency

The app must support configurable fetch and publish frequency from the dashboard.

Minimum scheduling capabilities:

- manual run now
- every few minutes
- hourly
- daily
- custom cron-style scheduling if implemented

Scheduling rules:

- frequency may differ by destination or publishing stream
- the scheduler must use the configured timezone
- the system must avoid publishing the same item multiple times unless explicitly allowed

## 10. Category, Region, and Language Controls

Each publishing stream must support at least the following filters:

- news category
- target country
- target region
- language

Defaults and rules:

- default language is `English`
- categories may differ by destination
- region and country filters must be configurable independently where the provider supports them
- if a provider does not return some filter fields directly, the app may infer eligibility only from the data actually available and the configured rules

## 11. Facebook and Instagram Requirements

For Facebook and Instagram, Release 1 is intended for the user's personal account and connected pages or profiles.

The dashboard must support:

- selecting the connected Facebook destination to publish to
- selecting the connected Instagram destination to publish to
- assigning categories and schedules per destination
- viewing publish history per destination
- reconnecting or refreshing destination authorization when needed

If a platform integration imposes technical limits during implementation, those limits must be handled in the integration layer without changing the product goal that the user wants to target personal accounts and pages.

## 12. Data Persistence Requirements

The database must store at least:

- provider configurations
- publishing destinations
- destination credentials or references to secure credentials
- fetched raw provider payloads where needed for audit or debugging
- normalized article records
- filtered article-to-destination matches
- publish jobs
- publish results
- schedule configurations
- category mappings
- country and region mappings
- dashboard settings

Persistence rules:

- fetched articles must be saved even if they are not ultimately published
- the app must track whether an article was fetched, filtered out, queued, published, failed, or skipped as a duplicate
- publish history must be queryable per platform, destination, and article

## 13. Deduplication and Idempotency

The app must prevent duplicate publishing.

Deduplication should consider:

- provider article id when available
- source URL
- normalized title
- destination and publish state

Rules:

- an already published article should not be republished to the same destination unless explicitly allowed
- the system should remain safe to retry after transient failures
- duplicate detection must happen before publish attempts

## 14. Website Publishing Requirements

When the website platform is selected, the app must:

- create or update the website post record
- assign the configured category
- assign language and region metadata
- store source attribution
- support scheduled or immediate publishing according to the stream settings

The website content should be sourced from the normalized news record and destination template, not from an AI-generated rewrite.

## 15. Logging, Monitoring, and Admin Visibility

The admin must be able to view:

- last API fetch time
- selected provider
- total fetched articles per run
- total filtered articles per run
- total published posts per destination
- failed fetches
- failed publish attempts
- skipped duplicates
- retry outcomes

Logs must be available for both fetch and publish workflows.

## 16. Release 1 Scope

Release 1 must include:

- app name `NewsPub`
- support for `newsdata.io`, `newsapi.org`, and `mediastack.com`
- `mediastack` as the default provider
- dashboard controls for platform, frequency, category, country or region, and language
- automatic fetching, filtering, saving, and publishing workflow
- support for website, Facebook, and Instagram publishing
- support for the user's personal account and connected pages or profiles for Facebook and Instagram
- local filtering after broad fetches to reduce API request usage
- destination-aware formatting and publish logging

## 17. Explicit Non-Goals for This Update

This write-up change does not require code changes yet.

This write-up also removes the previous AI-oriented product direction:

- no AI SDK requirement
- no AI-generated medical-equipment content workflow
- no AI-first architecture assumptions in this specification

## 18. Source of Truth

This file, `app-write-up.md`, is the current product specification for `NewsPub`.

If implementation artifacts conflict with this document, this document should be treated as the updated product direction until a later revision replaces it.
