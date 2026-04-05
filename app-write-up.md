# NewsPub - App Write-Up

## 1. Project Overview

`NewsPub` is a news ingestion, filtering, scheduling, and publishing platform.

The app fetches news from a selected third-party news API, filters the articles that match configured categories and publishing rules, saves only the publishable or published articles required for Release 1, formats the resulting posts, and automatically publishes them to one or more destinations.

Primary publishing destinations for Release 1:

- website
- Facebook
- Instagram

Release 1 focuses on automated publishing from external news sources. This product is not an AI content-generation app, and the AI SDK must not be part of the implementation or architecture.

## 2. Core Goal

The goal of `NewsPub` is to let an authenticated admin configure one or more publishing pipelines such that:

1. the app calls a selected news API on a defined schedule
2. the app fetches all available news for that run from the chosen provider within the active incremental time window
3. the app filters the fetched articles into the relevant categories and targets
4. the app stores only the selected articles that are publishable or published in the database
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
- the system must support provider-specific settings
- the system must normalize fetched news from all supported providers into one internal article format
- provider switching must not require code changes once the integration exists
- all provider credentials must be supplied through environment variables
- the app must resolve and use the correct provider credential from environment variables based on the active provider settings

### 3.1 Provider Credential Resolution

Release 1 must not require entering third-party news API credentials in the dashboard.

Credential rules:

- all supported provider credentials must be set through environment variables
- the app must select the correct environment variable at runtime based on the configured provider
- missing or invalid credentials for the selected provider must block fetch execution and be logged clearly
- provider secrets must never be exposed to the browser or stored as plain text in the database

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
3. The system fetches only news newer than the timestamp of the previous successful fetch call for the same stream, except on the first run when no prior fetch exists.
4. The system converts provider responses into a common internal schema.
5. The system filters the fetched items by configured categories, countries or regions, language, keywords, excluded keywords, provider metadata, and destination rules.
6. The system keeps only items that are publishable according to the configured rules and target platform constraints.
7. The system saves only publishable or published articles and their destination matches to the database for Release 1.
8. The system performs time-aware deduplication before publish attempts.
9. The system formats matched items into destination-specific post payloads.
10. The system publishes the content automatically to the configured website, Facebook destination, Instagram destination, or all selected destinations.
11. The system logs success, failure, and retry details for every fetch and publish attempt.

### 5.2 Fetch-Broadly, Filter-Locally Rule

The system must fetch all news available for the selected query scope during each API run, but only within the incremental window that is newer than the previous successful call for the same stream, then perform filtering inside the app or webhook flow before publishing.

This rule is mandatory because the design should reduce total API request usage by avoiding repeated narrowly scoped provider calls for each category or platform.

### 5.3 Incremental Fetch Window Rule

Each stream must track the timestamp of its previous successful fetch call.

Incremental fetch rules:

- each new fetch must request or locally retain only articles newer than the previous successful fetch time for that same stream
- if a provider cannot enforce the time window precisely, the app must apply the time cutoff locally before considering an article for persistence or publication
- if no previous successful fetch exists, the first run may use the provider's default query window or a separately configured initial backfill rule

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

Every generated post must be optimized for the destination on which it will be published, including SEO for the website and platform-specific discoverability optimization for Facebook and Instagram.

Minimum formatting requirements:

- website posts must support title, summary, body, featured image, source attribution, category, language, publish time, external source link, SEO title, meta description, keywords or tags, and SEO-friendly slug
- Facebook posts must support title or intro text, body copy, source link, media when supported, and Facebook-optimized caption or preview text based on the configured template
- Instagram posts must support caption text, source reference where appropriate, media when supported, and Instagram-optimized caption structure, hashtags, or discovery text when configured

Formatting rules:

- keep provider facts intact and do not invent missing news content
- preserve source attribution
- support destination-specific length limits and formatting differences
- optimize text structure, keywords, hashtags, metadata, and post templates for the respective platform
- allow configurable templates per destination
- support category-based templates when needed
- block publishing when a post, media asset, automation rule, or publish setting would violate the target platform's terms, policies, rate limits, or content restrictions

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
- provider-specific settings
- publish status per destination
- whether publishing is automatic or held for review
- post templates or formatting rules
- SEO or platform-optimization templates per destination
- website SEO defaults such as slug pattern, meta title pattern, meta description pattern, and keyword rules
- Facebook and Instagram caption, hashtag, and discoverability settings
- inclusion keywords
- exclusion keywords
- maximum posts per run
- duplicate handling rules
- retry rules for failed publish attempts
- timezone-aware schedule settings

The dashboard should also include:

- destination connection status
- provider credential status from environment-based configuration
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
- if no fetch frequency is set, the default fetch frequency must be hourly
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
- filtering must be as comprehensive and accurate as reasonably possible using all available signals from the provider response and app configuration
- filtering should combine provider categories, title, description, body content when available, keywords, source metadata, country, region, language, and destination-specific rules
- when the filter cannot classify an article with sufficient confidence for automatic publishing, the safer default is to exclude it from Release 1 publication

## 11. Facebook and Instagram Requirements

For Facebook and Instagram, Release 1 is intended for the user's personal account and connected pages or profiles.

The dashboard must support:

- selecting the connected Facebook destination to publish to
- selecting the connected Instagram destination to publish to
- assigning categories and schedules per destination
- viewing publish history per destination
- reconnecting or refreshing destination authorization when needed

If a platform integration imposes technical limits during implementation, those limits must be handled in the integration layer without changing the product goal that the user wants to target personal accounts and pages.

All Facebook and Instagram posting behavior, post content, hashtags, media handling, automation rules, and scheduling settings must comply with the target platform's current terms and conditions and any applicable API usage policies.

## 12. Data Persistence Requirements

The database must store at least:

- provider configurations
- publishing destinations
- destination credentials or references to secure credentials
- fetched raw provider payloads only for publishable or published articles where needed for audit or debugging
- normalized article records for publishable or published items only
- filtered article-to-destination matches for publishable or published items only
- publish jobs
- publish results
- schedule configurations
- category mappings
- country and region mappings
- dashboard settings

Persistence rules:

- in Release 1, only articles that are publishable or published may be saved as article records in the database
- articles filtered out as non-publishable must not be persisted as article records in Release 1
- the app may keep fetch-level logs, counters, and job metadata for non-publishable items without storing those full articles in the database
- the app must track whether a saved article was queued, published, failed, or skipped as a duplicate
- publish history must be queryable per platform, destination, and article

## 13. Deduplication and Idempotency

The app must prevent duplicate publishing.

Deduplication should consider:

- provider article id when available
- source URL
- normalized title
- published date and time
- previous fetch window and publish window
- destination and publish state

Rules:

- an already published article should not be republished to the same destination unless explicitly allowed
- the system should remain safe to retry after transient failures
- duplicate detection must happen before publish attempts
- duplicate detection must be time-aware so the same or substantially similar article is evaluated in the context of its source publication time and the stream's fetch history

## 14. Website Publishing Requirements

When the website platform is selected, the app must:

- create or update the website post record
- assign the configured category
- assign language and region metadata
- store source attribution
- generate or apply SEO-friendly slug, title, meta description, and keyword metadata
- support scheduled or immediate publishing according to the stream settings

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
- hourly fetch as the default when no schedule is set
- incremental fetching based on the previous successful fetch time
- environment-variable-based provider credential selection
- comprehensive and high-accuracy filtering
- time-aware duplicate detection before publishing
- Release 1 persistence limited to publishable or published articles only
- SEO-optimized or platform-optimized generated posts for each destination
- destination-aware formatting and publish logging

## 17. Source of Truth

This file, `app-write-up.md`, is the current product specification for `NewsPub`.

If implementation artifacts conflict with this document, this document should be treated as the updated product direction until a later revision replaces it.
