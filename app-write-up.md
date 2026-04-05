# Automated Medical Equipment Blog Platform - Complete App Write-Up

## 1. Project Overview

This project is a full-stack AI-powered blog platform for publishing educational content about medical equipment.

The Release 1 target is a production-ready application where an authenticated admin can enter a general equipment name, generate a source-grounded draft in English, review the draft, schedule or publish it, and expose the finished content on a public English website built on a locale-ready architecture.

The platform must work for many medical equipment categories, not only microscopes. Example inputs include `microscope`, `centrifuge`, `hematology analyzer`, `ultrasound machine`, `autoclave`, `patient monitor, etc`.

## 2. Primary Goal

Build a scalable content generation and publishing system where creating a detailed medical-equipment article is as simple as:

- typing the equipment name
- clicking `Generate Post`
- reviewing the draft
- clicking `Publish`

Publishing must remain a human action. Draft generation may be automated; final publication must not be fully automatic.

## 3. Core Business Requirements

### 3.1 Required Generated Post Content

For any equipment entered, the generated post must include the following sections when reliable source data exists:

1. Equipment title
2. Definition and overview
3. Featured image
4. Principle of operation
5. Illustrative images with captions
6. Main components and parts
7. Different types and variants
8. Clinical or laboratory uses
9. Common manufacturers
10. Commonly used manufacturers list
11. Commonly encountered models grouped under each manufacturer
12. Common faults, errors, or failure modes
13. Remedies or troubleshooting steps
14. Daily care and maintenance
15. Preventive maintenance schedule
16. Safety precautions
17. User manuals, brochures, operator manuals, service manuals, or technical documents where available, stored as links only
18. How-to-use section with SOPs, including model-specific differences inline when verified
19. FAQ section
20. Disclaimer
21. References and sources

Content quality requirements for every generated section:

- every section must be information-rich, instructional, and not surface-level
- include practical examples and contextual explanation where useful
- include inline photos or illustrations where they improve clarity
- clearly distinguish verified facts from AI-composed summary language
- explicitly state when reliable information was not found instead of inventing content
- address the supported target audiences in a way that is readable by non-specialists and still useful to technical readers

Manufacturer and model list rules:

- target up to 100 manufacturers and up to 100 models only when reliable data exists
- the UI must show the top 5 entries first with a `View more` affordance for the remainder
- the labels shown to the user must be `Commonly used manufacturers` and `Commonly encountered models`
- the system must not claim an exact global ranking unless a source explicitly provides one

Fault and remedy rules:

- target up to 100 common faults only when reliable data exists
- if fewer reliable faults exist, publish only the verified set
- every published fault entry must include a paired cause, symptom, and remedy when that information is available

### 3.2 Required Disclaimer

Every generated post must include this visible disclaimer text in English for Release 1. Future locales must provide an equivalent localized disclaimer through the locale file system:

> While care has been taken to ensure accuracy of the content in this post, this content is provided for educational and informational purposes only. It does not replace the manufacturer's official instructions, operator manual, service manual, safety procedures, or institutional biomedical engineering protocols. Always follow the official manufacturer guidelines and applicable clinical regulations.

### 3.3 Publishing Requirements

Release 1 must support all of the following:

- draft generation before publishing
- manual publish button
- editable content before publishing
- schedule publish date and time during generation or after generation
- slug generation
- SEO metadata generation
- social sharing metadata generation
- public post sharing actions
- duplicate detection before generation for existing equipment posts in the same locale

Duplicate-handling rules:

- Release 1 treats the generated equipment guide as one canonical guide post per equipment record, stored in locale-aware translations with only the English translation active
- when an existing non-archived post for the same canonical equipment and locale is detected, the admin must be warned before generation continues
- the admin must choose either `Replace existing post` or `Cancel`
- generation must not continue until one of those actions is chosen
- if the admin chooses replacement, the existing post record must be updated in place so the canonical slug and public URL stay stable unless the admin explicitly edits the slug
- if the admin chooses cancel, no generation, overwrite, or publish action occurs

### 3.4 Visitor Requirements

Visitors must be able to:

- read published posts without signing up
- browse public pages and archives
- search content
- comment on posts as guests
- share posts through supported social actions and email

The system must also provide:

- spam control for comments
- moderation tools for comments
- mobile-first page rendering

## 4. Recommended Tech Stack

Release 1 must use the following stack:

- Frontend and fullstack framework: Next.js, JavaScript, App Router
- AI layer: Vercel AI SDK
- Styling: styled-components
- State management: Redux Toolkit
- Validation: Zod
- ORM and database access: Prisma
- Database: MySQL
- Localization: Next.js locale-prefixed routing strategy with `en` as the only active locale in Release 1
- Image and file handling: local `public/uploads` storage first, switchable to S3-compatible object storage by environment configuration
- Search indexing: database-backed search for Release 1
- Background jobs: internal job runner and queue
- Auth: admin-only authentication, public reading for visitors

### 4.1 Why This Stack Fits

- Next.js App Router supports server rendering, route handlers, layouts, metadata, and server-first rendering.
- Vercel AI SDK supports model abstraction, streaming workflows, and tool integrations.
- styled-components works with App Router when the registry pattern is configured correctly.
- Redux Toolkit fits admin-side client state such as generation progress, moderation filters, and editor UI state.
- Zod is suitable for input validation, API validation, AI output validation, and admin form validation.
- Prisma and MySQL are appropriate for structured relational content, moderation, analytics, and configuration data.

### 4.2 Reproducibility Rule

The implementation may use current stable package versions, but the resulting project must commit a lockfile and must not replace any of the required libraries above with alternatives.

## 5. Product Scope

Unless explicitly marked optional or future-phase later in this document, the following pages and capabilities are mandatory for Release 1.

### 5.1 Public Website

Mandatory public routes and pages for Release 1 are the English instances of these locale-ready route families:

- English home page
- English blog index page
- English category pages
- English manufacturer pages
- English equipment pages
- English individual post pages
- English search page
- English About page
- English Contact page
- English Disclaimer page
- English Privacy Policy page

Mandatory public page behavior:

- all public routes are locale-prefixed even though only `en` is active in Release 1
- root `/` redirects to the English home page at `/en`
- published content only appears on public pages
- manufacturer and equipment pages act as topical landing pages and discovery pages
- post pages contain share actions and comments

### 5.2 Admin Panel

Mandatory admin routes and pages:

- login page
- dashboard
- Generate Post page
- Drafts list
- Published posts list
- post editor page
- Categories management
- Manufacturers management
- Media library
- Comments moderation
- SEO management
- Localization management
- Job logs and generation logs
- Prompt configuration
- Source configuration

Admin routes are not locale-prefixed, but admin labels must be sourced from locale-ready message files. Release 1 only ships English admin copy.

## 6. User Roles

### 6.1 Super Admin

Super Admin must be able to:

- access all admin routes
- manage settings
- manage prompt templates
- manage source configuration
- manage provider and model configuration
- publish, unpublish, archive, and schedule posts
- moderate comments
- manage locale configuration and any future translations that are added
- manage categories and manufacturers
- view logs and analytics

### 6.2 Editor

Editor must be able to:

- generate drafts
- edit drafts
- schedule posts
- publish posts if that permission is enabled in the server-side policy
- upload media
- moderate comments if that permission is enabled in the server-side policy
- view generation logs and content lists

Editors must not be able to change global provider credentials, source configuration, or security-sensitive settings unless explicitly granted by policy. Release 1 defaults those settings to Super Admin only.

### 6.3 Visitor

Visitor capabilities:

- read public content
- search public content
- submit guest comments
- use public sharing actions

## 7. High-Level Workflow

### 7.1 Post Generation Flow

1. Admin opens `Generate Post`.
2. Admin enters equipment name and selects article depth, target audiences, and content toggles. The locale is fixed to `en` in Release 1.
3. System normalizes the equipment name into a canonical equipment identity.
4. System checks for duplicates using canonical equipment plus locale.
5. If a duplicate exists, the system blocks generation until the admin chooses replacement or cancel.
6. System collects sources from approved source tiers and scores the findings.
7. System extracts normalized structured research data.
8. System validates the research package.
9. System generates structured article output, then Markdown, then HTML, then SEO metadata.
10. System saves the draft, warnings, sources, media metadata, and generation logs.
11. Admin reviews, edits, schedules, or publishes.

### 7.2 Comment Flow

1. Visitor opens a published post.
2. Visitor submits a guest comment with name, optional email, and body.
3. System validates and rate-limits the submission.
4. System runs spam, profanity, and duplicate-content checks.
5. Comment enters moderation state.
6. Approved comments become visible on the post page.
7. Moderators can approve, reject, mark spam, or delete comments.

## 8. Content Generation Strategy

### 8.1 Step 1: Input Normalization

The system must normalize the admin's raw input into a canonical equipment record. This includes:

- trimming whitespace
- normalizing casing and punctuation
- matching aliases to a canonical equipment name
- generating a normalized slug base
- preserving the original admin-entered label for audit history

Examples that should normalize to one canonical equipment identity when supported by aliases:

- microscope
- laboratory microscope
- optical microscope
- compound microscope
- clinical microscope

### 8.2 Step 2: Structured Research Schema

Before AI writing begins, the system must build a structured research payload containing, at minimum:

- canonical equipment identity
- aliases used
- target locale, which is `en` in Release 1
- verified definition
- operating principle summary
- component list
- variants and types
- clinical and laboratory uses
- manufacturers with source-backed metadata
- models grouped under manufacturers with latest known year when verified
- manuals and document links with metadata
- faults and remedies
- maintenance tasks and preventive schedule notes
- safety precautions
- images and media candidates with legal usage metadata
- source references for every critical factual cluster
- reliability warnings

### 8.3 Step 3: AI Writing Layer

The AI layer is a writing and organization layer, not the source of truth.

It must:

- transform validated research data into a coherent long-form article
- preserve stable section order
- generate FAQs
- generate SEO text
- generate image captions
- keep warnings and unknowns explicit
- follow prompt templates stored in the system

It must not:

- invent manuals, models, or technical facts
- state unsupported rankings as certain
- remove the required disclaimer

### 8.4 Step 4: Quality Gate

A draft is not valid unless all of the following pass:

- required sections exist where reliable data exists
- no empty headings remain
- at least one image exists when reliable legal media is available and `includeImages` is true
- manual links are valid when collected
- manufacturer, model, and fault lists are deduplicated
- fault, cause, symptom, and remedy records are paired correctly
- content length meets minimum thresholds for the selected depth mode
- unsupported claims are flagged in warnings
- target audience coverage is present
- disclaimer and references are present

## 9. Article Structure Template

### 9.1 Recommended Post Order

Release 1 must render generated posts in this order:

1. Title
2. Excerpt
3. Featured image
4. Definition and overview
5. Principle of operation
6. Components and parts
7. Types and variants
8. Uses and applications
9. Commonly used manufacturers
10. Commonly encountered models by manufacturer
11. Faults and remedies
12. Daily care and maintenance
13. Preventive maintenance schedule
14. Safety precautions
15. SOP and how-to-use guidance
16. Manuals and technical documents
17. FAQ
18. References
19. Disclaimer
20. Related posts
21. Comments

## 10. SEO Requirements

### 10.1 Technical SEO Requirements

Release 1 must include:

- server-rendered public pages
- clean readable URLs
- locale-prefixed canonical public routes
- dynamic metadata per published English post in Release 1 and per post translation when future locales are enabled
- Open Graph metadata
- Twitter/X metadata
- canonical URLs
- locale alternate links when additional locales are enabled
- XML sitemap
- robots.txt
- breadcrumb schema
- article schema
- organization schema
- FAQ schema when FAQ content exists
- descriptive image alt text
- internal linking
- compressed images
- lazy loading for non-critical media
- proper heading hierarchy
- JSON-LD structured data

### 10.2 Content SEO Requirements

- unique title per post translation
- unique meta description per post translation
- keyword-focused heading hierarchy
- natural use of equipment synonyms
- descriptive image captions
- topical cluster landing pages for categories, manufacturers, and equipment
- related posts section
- multilingual SEO-ready architecture with English-only output in Release 1

### 10.3 SEO Page Types

Canonical public routes for Release 1:

- `/`
- `/en`
- `/en/blog`
- `/en/blog/{slug}`
- `/en/category/{slug}`
- `/en/manufacturer/{slug}`
- `/en/equipment/{slug}`
- `/en/search`
- `/en/about`
- `/en/contact`
- `/en/disclaimer`
- `/en/privacy`

Routing rules:

- `/` redirects to `/en`
- canonical tags on public pages must point to locale-prefixed URLs
- alternate language links must be emitted only for enabled locales that actually exist

### 10.4 Metadata to Generate Per Post Translation

Each persisted post translation, including the required English translation in Release 1, must have:

- title
- description
- canonical URL
- OG title
- OG description
- OG image
- Twitter title
- Twitter description
- keywords
- authors
- publication date
- modified date

## 11. Internationalization Strategy

### 11.1 Locale Strategy

Release 1 active locale:

- `en`

`en` is both the default locale and the only active locale in Release 1.

Locale extensibility rules:

- public routing, metadata, message loading, and content persistence must remain locale-aware even though only `en` is active in Release 1
- adding a new locale must not require schema changes or route redesign
- enabling a new locale should require:
  - adding a new locale file under `messages/`
  - registering the locale in the existing supported locale configuration
  - providing any required locale-specific legal copy such as disclaimers
- the existing routing, rendering, metadata, and persistence flow must then handle the new locale without architectural changes

### 11.2 Localized Routing

Release 1 example:

- `/en/blog/microscope`

Future examples after a new locale is registered:

- `/fr/blog/microscope`
- `/sw/blog/microscope`
- `/ar/blog/microscope`

Routing rules:

- all public routes are nested under `[locale]`
- Release 1 only accepts `en`
- root `/` redirects to `/en`
- unsupported locale prefixes return `404` or redirect safely according to implementation policy
- admin routes remain under `/admin`

### 11.3 Locale-Driven Surfaces

The system must be built so these surfaces are locale-driven even though Release 1 only ships English copy:

- UI labels
- buttons
- admin interface labels
- navigation
- disclaimers
- generated article body
- SEO metadata
- image captions where possible
- public legal pages

Release 1 only requires English files and English content for these surfaces.

### 11.4 Translation and Locale Persistence Approach

- Release 1 generates and persists English content only
- `PostTranslation` and locale-aware render artifacts remain mandatory so future locales can be added without schema changes
- when a new supported locale is enabled in the future:
  - if the translation does not exist, translate from the current approved `en` content and persist it
  - if the translation already exists, reuse the stored translation
- store exactly one active translation record per post per locale
- allow manual editing per locale
- persist one render artifact per post per locale for Markdown and HTML output

## 12. Authentication and Access Control

Visitors do not need accounts.

### 12.1 Admin Authentication

Release 1 must support:

- email and password login
- secure password hashing
- protected admin routes
- protected admin APIs
- session expiry
- logout
- audit trail for publish, archive, moderation, configuration, and authentication events

Secure external provider login is optional after Release 1 and must not replace the required email/password flow.

### 12.2 Public Access

- all published posts are readable without login
- comments are guest-based in Release 1
- guest comments require name and comment body
- guest email is optional and used only for moderation follow-up if needed

## 13. Database Design

### 13.1 Required Persistence Behavior

The data model must:

- support locale-aware content per post with `en` as the only active locale in Release 1
- preserve stable canonical slugs
- support duplicate detection by canonical equipment and locale
- support scheduling, publishing, and archiving
- store source attribution for critical facts
- store media licensing and usage notes
- store prompt and source configuration
- store analytics and audit logs
- support high-read public workloads

### 13.2 Required Data Models and Constraints

The following model contract is normative for Release 1. The Prisma implementation may add helper fields, but it must not remove any required field or constraint listed here.

`User`

- `id`
- `email` unique
- `name`
- `passwordHash`
- `role` enum: `SUPER_ADMIN | EDITOR`
- `isActive`
- `createdAt`
- `updatedAt`

`Equipment`

- `id`
- `name`
- `normalizedName` unique
- `slug` unique
- `description`
- `createdAt`
- `updatedAt`

`EquipmentAlias`

- `id`
- `equipmentId`
- `alias`
- `normalizedAlias` unique

`Post`

- `id`
- `equipmentId`
- `slug` unique
- `status` enum: `DRAFT | SCHEDULED | PUBLISHED | ARCHIVED`
- `editorialStage` enum: `GENERATED | REVIEWED | EDITED | APPROVED`
- `excerpt`
- `featuredImageId`
- `authorId`
- `scheduledPublishAt`
- `publishedAt`
- `createdAt`
- `updatedAt`

`PostTranslation`

- `id`
- `postId`
- `locale`
- `title`
- `contentMd`
- `contentHtml`
- `structuredContentJson`
- `excerpt`
- `disclaimer`
- `faqJson`
- `isAutoTranslated`
- `createdAt`
- `updatedAt`
- unique constraint on `postId + locale`

`Category`

- `id`
- `name` unique
- `slug` unique
- `description`

`Tag`

- `id`
- `name` unique
- `slug` unique

`Manufacturer`

- `id`
- `name`
- `normalizedName`
- `slug` unique
- `primaryDomain`
- `headquartersCountry`
- `branchCountriesJson`
- `rankingScore`
- unique constraint on `normalizedName + primaryDomain`

`ManufacturerAlias`

- `id`
- `manufacturerId`
- `alias`
- `normalizedAlias`
- unique constraint on `manufacturerId + normalizedAlias`

`Model`

- `id`
- `manufacturerId`
- `equipmentId`
- `name`
- `normalizedName`
- `slug`
- `latestKnownYear`
- `summary`
- `rankingScore`
- unique constraint on `manufacturerId + slug`

`Fault`

- `id`
- `postId`
- `title`
- `normalizedTitle`
- `cause`
- `symptoms`
- `remedy`
- `severity`
- `evidenceCount`
- `sortOrder`
- unique constraint on `postId + normalizedTitle`

`MaintenanceTask`

- `id`
- `postId`
- `frequency`
- `title`
- `description`
- `sortOrder`

`MediaAsset`

- `id`
- `storageDriver`
- `storageKey`
- `publicUrl`
- `localPath`
- `sourceUrl`
- `sourceDomain`
- `alt`
- `caption`
- `mimeType`
- `width`
- `height`
- `attributionText`
- `licenseType`
- `usageNotes`
- `isAiGenerated`
- `createdAt`
- `updatedAt`

`SourceReference`

- `id`
- `postId` nullable
- `equipmentId` nullable
- `manufacturerId` nullable
- `modelId` nullable
- `title`
- `url`
- `sourceDomain`
- `sourceType`
- `fileType`
- `language`
- `accessStatus`
- `reliabilityTier`
- `lastCheckedAt`
- `notes`
- `excerpt`

`Comment`

- `id`
- `postId`
- `parentId` nullable
- `name`
- `email` nullable
- `body`
- `status` enum: `PENDING | APPROVED | REJECTED | SPAM`
- `ipHash`
- `userAgent`
- `createdAt`
- `updatedAt`

Release 1 supports one reply level only. Deeper nesting is out of scope.

`CommentModerationEvent`

- `id`
- `commentId`
- `actorId` nullable for automated moderation
- `action`
- `notes`
- `createdAt`

`GenerationJob`

- `id`
- `postId` nullable
- `equipmentName`
- `locale`
- `providerConfigId`
- `status` enum: `PENDING | RUNNING | COMPLETED | FAILED | CANCELLED`
- `currentStage`
- `requestJson`
- `responseJson`
- `warningJson`
- `errorMessage`
- `replaceExistingPost`
- `schedulePublishAt`
- `startedAt`
- `finishedAt`
- `createdAt`
- `updatedAt`

`PromptTemplate`

- `id`
- `name`
- `purpose`
- `version`
- `systemPrompt`
- `userPromptTemplate`
- `isActive`
- `createdAt`
- `updatedAt`

`SourceConfig`

- `id`
- `name`
- `sourceType`
- `priority`
- `isEnabled`
- `allowedDomainsJson`
- `notes`
- `createdAt`
- `updatedAt`

`ModelProviderConfig`

- `id`
- `provider`
- `model`
- `purpose`
- `apiKeyEnvName`
- `apiKeyEncrypted` nullable
- `apiKeyLast4` nullable
- `apiKeyUpdatedAt` nullable
- `isDefault`
- `isEnabled`
- unique constraint on `provider + model + purpose`

Trusted provider catalog rules:

- Release 1 provider support includes `OpenAI`, `Anthropic`, `Google`, `Mistral AI`, `Cohere`, `xAI`, `Meta Platforms`, `Microsoft`, `Amazon`, `Groq`, `Together AI`, `Replicate`, `Hugging Face`, `DeepSeek`, `Stability AI`, `IBM`, `NVIDIA`, `Fireworks AI`, `Perplexity AI`, and `AI21 Labs`
- provider catalogs are not hard-coded model enums
- provider and model suggestions are loaded from trusted official APIs, provider-owned docs, or official provider-owned catalog feeds
- if a provider exposes an authenticated models API, the admin-stored encrypted API key or server-only env fallback may be used to load the live model list
- provider catalog search results may be cached server-side for performance, but the authoritative source remains the trusted upstream provider catalog

`SEORecord`

- `id`
- `postTranslationId` unique
- `canonicalUrl`
- `metaTitle`
- `metaDescription`
- `ogTitle`
- `ogDescription`
- `ogImageId`
- `twitterTitle`
- `twitterDescription`
- `keywordsJson`
- `authorsJson`
- `noindex`
- `createdAt`
- `updatedAt`

`ViewEvent`

- `id`
- `postId` nullable
- `path`
- `locale`
- `eventType` enum: `WEBSITE_VIEW | PAGE_VIEW | POST_VIEW`
- `ipHash`
- `userAgent`
- `referrer`
- `createdAt`

`AuditEvent`

- `id`
- `actorId` nullable
- `entityType`
- `entityId`
- `action`
- `payloadJson`
- `createdAt`

Required join tables:

- `PostCategory`
- `PostTag`
- `PostManufacturer`

### 13.3 Performance and Scalability Data Rules

- index localized public lookup paths, especially `slug`, `status`, `publishedAt`, and translation locale combinations
- treat `ViewEvent` as append-only
- keep analytics aggregation separate from public post lookup paths
- allow event archival or partitioning without impacting post reads

## 14. Folder Structure

Recommended Next.js App Router structure in JavaScript:

```text
src/
  app/
    page.js
    [locale]/
      layout.js
      page.js
      about/
        page.js
      contact/
        page.js
      disclaimer/
        page.js
      privacy/
        page.js
      blog/
        page.js
        [slug]/
          page.js
      category/
        [slug]/
          page.js
      manufacturer/
        [slug]/
          page.js
      equipment/
        [slug]/
          page.js
      search/
        page.js
    admin/
      login/
        page.js
      layout.js
      page.js
      generate/
        page.js
      posts/
        drafts/
          page.js
        published/
          page.js
        [id]/
          page.js
      categories/
        page.js
      manufacturers/
        page.js
      media/
        page.js
      comments/
        page.js
      seo/
        page.js
      localization/
        page.js
      jobs/
        page.js
      prompts/
        page.js
      sources/
        page.js
    api/
      auth/
        login/route.js
        logout/route.js
      generate-post/route.js
      save-draft/route.js
      publish-post/route.js
      posts/[id]/route.js
      posts/slug/[slug]/route.js
      comments/route.js
      comments/[id]/route.js
      manufacturers/route.js
      models/route.js
      media/route.js
      revalidate/route.js
      metrics/route.js
      jobs/route.js
    sitemap.js
    robots.js
    opengraph-image.js
    twitter-image.js
    globals.js
  components/
    common/
    layout/
    blog/
    comments/
    admin/
    forms/
    seo/
  features/
    auth/
    generator/
    editor/
    posts/
    comments/
    media/
    seo/
    i18n/
    analytics/
    settings/
  lib/
    ai/
    auth/
    prisma/
    validation/
    seo/
    markdown/
    storage/
    research/
    normalization/
    comments/
    analytics/
    jobs/
    security/
  store/
    index.js
    provider.js
    slices/
  styles/
    theme.js
    styled-registry.js
  messages/
    en.json
    <new-locale>.json
  prisma/
    schema.prisma
  proxy.js
```

Release 1 only requires `messages/en.json`. Future locales follow the same `messages/<locale>.json` pattern.

## 15. Styled-Components Architecture

Use the App Router registry pattern:

- `styles/styled-registry.js`
- the root layout wraps the app in the registry
- the theme provider sits high in the tree
- the public site and admin site share core tokens but may have different layout components

### 15.1 Theme Shape Example

```js
export const lightTheme = {
  colors: {
    bg: '#ffffff',
    surface: '#f7f9fc',
    text: '#102033',
    muted: '#586174',
    primary: '#005f73',
    accent: '#c97b2a',
    danger: '#b42318',
    success: '#157347',
    border: '#d7dce3'
  },
  spacing: {
    xs: '4px',
    sm: '8px',
    md: '16px',
    lg: '24px',
    xl: '32px'
  },
  radius: {
    sm: '6px',
    md: '12px',
    lg: '20px'
  }
}
```

## 16. Redux Toolkit Usage Plan

Redux Toolkit is for admin-side client state only. Use server components and server actions for primary data access wherever possible.

### 16.1 Required Slices

- `authSlice`
- `generatorSlice`
- `draftEditorSlice`
- `commentModerationSlice`
- `mediaLibrarySlice`
- `uiSlice`
- `localeSlice`
- `settingsSlice`

### 16.2 Required Generator Slice State

```js
{
  equipmentName: '',
  locale: 'en',
  articleDepth: 'complete',
  targetAudience: [],
  loading: false,
  progress: 0,
  currentStage: 'idle',
  resultPostId: null,
  error: null,
  warnings: [],
  preview: null,
  duplicateMatch: null,
  selectedProviderConfigId: null
}
```

### 16.3 RTK Query Usage

Use RTK Query for admin-side list and moderation APIs, including:

- drafts list
- published posts list
- comments moderation
- manufacturer lookup
- generation logs
- media library
- localization list
- prompt and source settings

## 17. Validation with Zod

Use Zod in these layers:

1. admin input validation
2. API request validation
3. AI structured output validation
4. comment submission validation
5. environment variable validation

### 17.1 Required Generation Input Schema

The generation contract must validate:

- `equipmentName`
- `locale`, validated against the configured supported locales and equal to `en` in Release 1
- `articleDepth` enum: `fast | complete | repair | maintenance`
- `targetAudience` as a non-empty array of:
  - `students`
  - `nurses`
  - `doctors`
  - `medical_workers`
  - `technicians`
  - `engineers`
  - `hospital_owners`
  - `administrators`
  - `procurement_teams`
  - `trainers`
  - `biomedical_staff`
- `includeImages` boolean default `true`
- `includeManualLinks` boolean default `true`
- `includeManufacturers` boolean default `true`
- `includeModels` boolean default `true`
- `includeFaults` boolean default `true`
- `schedulePublishAt` optional ISO datetime
- `replaceExistingPost` boolean default `false`
- `providerConfigId`

Validation rules:

- `schedulePublishAt` must be in the future
- `replaceExistingPost` may only be `true` after duplicate detection

### 17.2 Required Comment Schema

Validate:

- `postId`
- `parentId` optional
- `name`
- `email` optional
- `body`

Release 1 comment body maximum is `3000` characters.

## 18. AI Integration Design

### 18.1 AI Responsibilities

The AI layer must:

- organize validated research into readable sections
- generate summaries and FAQs
- generate meta titles and descriptions
- generate image captions
- generate related-keyword suggestions
- rewrite for supported audiences and active locales from configuration
- use configured provider and model settings without code changes
- load provider and model suggestions from trusted provider catalogs without redeploying the app

The AI layer must not be treated as the factual source of truth.

### 18.2 Generation Modes

- `fast`: shorter draft while keeping the required section skeleton
- `complete`: full depth article with all required sections
- `repair`: fault-heavy and troubleshooting-heavy emphasis
- `maintenance`: care-heavy and schedule-heavy emphasis
- `translation`: future locale version of an approved `en` article once an additional locale is enabled

### 18.3 AI Pipeline Components

- input validator
- normalization service
- duplicate detector
- source collector
- structured research aggregator
- AI writer
- post formatter
- SEO generator
- persistence service
- provider and model switch layer controlled from admin UI
- trusted provider catalog sync and search layer for searchable provider/model selection

### 18.4 Required Prompt Layers

1. system instruction for educational medical-equipment writing
2. data-grounding instruction
3. output JSON structure instruction
4. final article formatting instruction
5. safety instruction for non-diagnostic, non-clinical advice boundaries

### 18.5 Output Stages

- stage A: structured research JSON
- stage B: validated structured article JSON
- stage C: Markdown article
- stage D: HTML render output
- stage E: SEO package

## 19. Research and Source Collection Layer

This is the most important layer in the system.

### 19.1 Source Priority

Source priority order:

1. official manufacturer websites
2. official product pages
3. official manuals, brochures, IFUs, and service documents
4. official distributor documentation
5. trusted biomedical engineering references
6. trusted professional societies
7. reputable educational institutions
8. trusted search results gathered through approved tool integrations

### 19.2 What to Collect

For each equipment query, collect:

- official definition if available
- operating principle
- manufacturer list
- model list
- PDF manuals and brochures
- maintenance instructions
- troubleshooting references
- images with usable attribution rules
- legal warnings about unavailable or restricted media

### 19.3 Reliability Rules

- tag every critical fact with at least one source
- do not present unsupported counts as certain
- if a target count is not reliably available, return the best verified set
- do not fabricate manuals, models, or faults
- separate verified data from AI-composed summary text
- avoid copying proprietary text verbatim beyond short fair-use excerpts
- prefer synthesized explanations with citations
- use only licensed images or internally generated illustrations
- store license and usage notes for each media asset

### 19.4 Manuals and Brochures Metadata

Store for each document link:

- title
- source domain
- file type
- language
- access status
- last checked time
- notes

## 20. Handling "Top 100 Manufacturers" and "Top 100 Models"

### 20.1 Problem

For many medical devices, there is no universal authoritative ranking of the top 100 manufacturers or models.

### 20.2 Deterministic Scoring Rules

Release 1 must use deterministic ranking logic so repeated implementations produce the same ordering from the same evidence.

Manufacturer ranking score:

- +40 if an official manufacturer page clearly matches the equipment type
- +25 if at least one official manual or brochure exists for the equipment type
- +15 if the manufacturer appears in at least one trusted distributor or procurement catalog for the equipment type
- +10 if the manufacturer appears in at least one trusted biomedical or educational reference
- +1 per additional corroborating trusted source after the first, capped at +10

Model ranking score:

- +50 if an official product page or official manual clearly confirms the model
- +20 if the model is explicitly tied to the canonical equipment type
- +10 if a latest known year is verified
- +1 per additional corroborating trusted source after the first, capped at +20

Tie-break rules:

- higher score first
- if scores tie for models under the same manufacturer, higher `latestKnownYear` first
- then alphabetical ascending by normalized display name

### 20.3 Output Rules

- present the lists as `Commonly used manufacturers` and `Commonly encountered models`
- do not call the results a worldwide rank unless a source explicitly says so
- deduplicate manufacturers by normalized name plus primary domain
- merge aliases into one canonical manufacturer record
- include headquarters and branch-country data only when verified

## 21. Handling "Up To 100 Common Faults and Remedies"

### 21.1 Required Logic

- collect verified issues from manuals, service documents, and support references
- deduplicate similar faults
- normalize wording
- map each fault to cause, symptom, and remedy
- count distinct corroborating source references per fault

### 21.2 Output Rules

- if only 18 reliable faults are found, publish 18 reliable faults
- order faults by evidence count descending, then severity descending, then normalized title ascending
- do not include a fault entry that has no supported title

### 21.3 Fault Record Example

```json
{
  "fault": "Image is blurry",
  "cause": "Dirty objective lens or incorrect focus",
  "symptoms": "Observed specimen lacks sharp detail",
  "remedy": "Clean objective lens with approved lens paper and refocus gradually"
}
```

## 22. Media and Image Strategy

### 22.1 Required Images

Release 1 targets the following media when reliable legal assets exist:

- featured image
- principle-of-operation illustration
- component diagram
- representative equipment type images
- inline illustrations anchored to relevant article sections

### 22.2 Image Metadata to Store

- source URL
- source domain
- alt text
- caption
- width
- height
- attribution text
- license type
- usage notes
- storage driver
- optimized local path or storage key
- public URL
- AI-generated flag

### 22.3 Image Processing Rules

- download or proxy only when legally allowed
- optimize for web delivery
- generate responsive sizes
- lazy load non-critical images
- auto-generate descriptive alt text draft
- support inline illustrations, not only hero media
- use a storage adapter so local and object storage can be swapped through configuration

## 23. Admin Generate Post Page Specification

### 23.1 Inputs

The Generate Post page must include:

- equipment name
- locale control fixed to `en` in Release 1 and designed to expand automatically when new locales are registered
- article depth dropdown, default `complete`
- target audience multi-select checkboxes, all selected by default
- include images toggle
- include manuals toggle
- include faults toggle
- include manufacturers toggle
- include models toggle
- optional schedule publish date-time picker
- replace existing post checkbox shown only after duplicate detection
- AI provider and model selector backed by `providerConfigId`
- searchable provider and model dropdowns backed by trusted provider catalogs, with free-text model id override when an exact upstream model id is known but not yet returned by the latest sync

If a schedule is entered during generation, it acts as a pre-filled scheduling intent only. The post must remain a draft until an admin explicitly confirms the schedule action after review.

The provider catalog available to the Generate Post and Providers admin pages must support:

- `OpenAI`
- `Anthropic`
- `Google`
- `Mistral AI`
- `Cohere`
- `xAI`
- `Meta Platforms`
- `Microsoft`
- `Amazon`
- `Groq`
- `Together AI`
- `Replicate`
- `Hugging Face`
- `DeepSeek`
- `Stability AI`
- `IBM`
- `NVIDIA`
- `Fireworks AI`
- `Perplexity AI`
- `AI21 Labs`

### 23.2 UI Flow

- text input
- duplicate check after equipment name normalization
- generate button
- progress indicator
- stage labels
- live draft preview
- error panel
- warnings section
- save draft button
- publish button
- schedule controls
- duplicate warning and replace-or-cancel branch

### 23.3 Progress Stages

1. validating input
2. normalizing equipment
3. checking duplicates
4. collecting sources
5. extracting structured data
6. generating article
7. generating SEO
8. saving draft

## 24. Public Website and Post Page Specification

### 24.1 Mandatory Public Pages

Release 1 must include:

- English home page with featured and recent published content
- English blog index page with pagination
- English category page with content list
- English manufacturer page with manufacturer summary, related posts, and model list where available
- English equipment page with equipment overview, related posts, and manufacturer coverage
- English post page
- English search page
- English About page
- English Contact page
- English Disclaimer page
- English Privacy Policy page

### 24.2 Mandatory Post Page Sections

- breadcrumb
- title
- excerpt
- publish information
- hero image
- article body
- inline images or diagrams anchored to relevant sections
- references
- disclaimer
- related posts
- comments block
- share actions for X, Facebook, LinkedIn, WhatsApp, email, and copy link

### 24.3 Comments Block

- comment form
- approved comment list
- one-level reply support
- moderation notice

## 25. Comment System Design

### 25.1 Fields

- name
- email optional
- comment body
- postId
- parentId optional

### 25.2 Moderation Rules

Mandatory Release 1 controls:

- rate limiting
- spam keyword checks
- duplicate-body detection
- profanity filtering
- moderation status workflow: `pending`, `approved`, `rejected`, `spam`

Optional hardening:

- CAPTCHA behind configuration

### 25.3 Admin Comment Tools

- approve
- reject
- mark spam
- delete
- filter by post
- filter by status
- view moderation history

## 26. API Route Plan

Recommended route handlers for Release 1:

- `POST /api/auth/login`
- `POST /api/auth/logout`
- `POST /api/generate-post`
- `POST /api/save-draft`
- `POST /api/publish-post`
- `PATCH /api/posts/:id`
- `GET /api/posts`
- `GET /api/posts/slug/:slug`
- `POST /api/comments`
- `PATCH /api/comments/:id`
- `DELETE /api/comments/:id`
- `GET /api/manufacturers`
- `GET /api/models`
- `POST /api/media`
- `POST /api/revalidate`
- `GET /api/metrics`
- `GET /api/jobs`

Route behavior rules:

- all mutating routes must validate input with Zod
- admin-only routes must require authenticated admin sessions
- public read routes must only expose published content

## 27. Suggested Generation API Contract

### 27.1 Request

```json
{
  "equipmentName": "microscope",
  "locale": "en",
  "targetAudience": ["students", "technicians", "biomedical_staff"],
  "articleDepth": "complete",
  "includeImages": true,
  "includeManualLinks": true,
  "includeManufacturers": true,
  "includeModels": true,
  "includeFaults": true,
  "schedulePublishAt": null,
  "replaceExistingPost": false,
  "providerConfigId": "provider_cfg_default_generation"
}
```

`schedulePublishAt` in the generation request stores the intended schedule value for the draft. It must not publish or schedule the post until an admin explicitly confirms the schedule action.

### 27.2 Response

```json
{
  "success": true,
  "jobId": "job_123",
  "postId": "post_123",
  "status": "draft_saved",
  "editorialStage": "GENERATED",
  "warnings": [
    "Only 12 verified model manuals were found"
  ]
}
```

## 28. Rendering Format Strategy

Release 1 must store content in:

- Markdown for editing portability
- HTML for rendering
- structured JSON for section blocks such as faults, maintenance tasks, model lists, and FAQs

This hybrid storage strategy is mandatory because the app needs editable content, fast rendering, and reusable structured subsections.

## 29. Related Content Strategy

Release 1 must generate related-post relationships automatically based on:

- equipment type
- manufacturers
- shared tags
- shared categories
- locale

Related-content ordering rules:

- prefer same-locale content first
- then higher overlap count
- then most recently published

## 30. Search Strategy

### 30.1 Initial Version

Release 1 uses database-backed search across published content in the active locale, which is `en`, using:

- post title
- excerpt
- body text
- tags
- equipment name
- manufacturer name

Search result ordering:

- exact title match first
- then prefix title match
- then weighted text match
- then most recently published

### 30.2 Future Version

Dedicated search indexing may be added in a later phase when content volume grows.

## 31. Performance Strategy

Release 1 performance rules:

- design mobile-first, then scale to tablet and desktop
- use server components by default
- keep client components minimal
- paginate comments and admin tables
- cache published post pages where appropriate
- optimize images
- lazy load below-the-fold media
- revalidate only changed routes
- support streaming progress updates for generation where useful
- keep the UI fast, readable, and visually intentional

## 32. Security Strategy

Release 1 must include:

- protected admin routes
- protected admin APIs
- comment sanitization
- rendered HTML sanitization
- Zod validation for all API inputs
- rate limiting for public comment submissions
- secure secret handling in environment variables
- restricted upload MIME types
- external URL verification before storing
- audit logging for publish, moderation, settings, and authentication events
- safe rendering boundaries that do not present generated content as clinical or diagnostic instruction

## 33. Observability and Logging

Track and persist:

- generation success and failure
- source fetch errors
- missing manual links
- image processing failures
- comment spam rate
- publish events
- SEO generation issues
- website, page, and post views

Admin must be able to see:

- dashboard summary metrics
- generation logs per job
- recent failures and warnings
- view trends over time

## 34. Environment Variables

The exact env schema may add helper variables, but Release 1 must support this contract:

```env
DATABASE_URL="mysql://user:password@localhost:3306/med_blog"
NEXT_PUBLIC_APP_URL="https://example.com"
DEFAULT_LOCALE="en"
SUPPORTED_LOCALES="en"

SESSION_SECRET="change-me"
SESSION_MAX_AGE_SECONDS="28800"
AI_PROVIDER_CONFIG_SECRET="change-me"

AI_PROVIDER_DEFAULT="openai"
AI_MODEL_DEFAULT="gpt-5.4"
AI_PROVIDER_FALLBACK="openai"
AI_MODEL_FALLBACK="gpt-5.4-mini"
OPENAI_API_KEY="your-openai-key"
# Optional server-side fallback credentials for other providers follow the normalized
# <PROVIDER>_API_KEY pattern, for example ANTHROPIC_API_KEY, GOOGLE_API_KEY,
# MISTRAL_API_KEY, COHERE_API_KEY, XAI_API_KEY, META_API_KEY, MICROSOFT_API_KEY,
# AMAZON_API_KEY, GROQ_API_KEY, TOGETHER_API_KEY, REPLICATE_API_KEY,
# HUGGINGFACE_API_KEY, DEEPSEEK_API_KEY, STABILITY_API_KEY, IBM_API_KEY,
# NVIDIA_API_KEY, FIREWORKS_API_KEY, PERPLEXITY_API_KEY, and AI21_API_KEY.

MEDIA_DRIVER="local"
LOCAL_MEDIA_BASE_PATH="public/uploads"
LOCAL_MEDIA_BASE_URL="/uploads"
S3_MEDIA_BUCKET="your-bucket"
S3_MEDIA_REGION="your-region"
S3_MEDIA_BASE_URL="https://cdn.example.com"
S3_ACCESS_KEY_ID="your-access-key"
S3_SECRET_ACCESS_KEY="your-secret-key"

ADMIN_SEED_EMAIL="admin@example.com"
ADMIN_SEED_PASSWORD="strong-password"

COMMENT_RATE_LIMIT_WINDOW_MS="60000"
COMMENT_RATE_LIMIT_MAX="5"
COMMENT_CAPTCHA_ENABLED="false"
COMMENT_CAPTCHA_SECRET=""

UPLOAD_ALLOWED_MIME_TYPES="image/jpeg,image/png,image/webp"
REVALIDATE_SECRET="change-me"
CRON_SECRET="change-me"
```

Encrypted admin-stored provider keys are the primary credential mechanism. Environment variables remain optional server-side fallbacks and must never be exposed to the browser.

## 35. Publishing States and Editorial Workflow

### 35.1 Persisted Post Status

These are the persisted post status values:

- `DRAFT`
- `SCHEDULED`
- `PUBLISHED`
- `ARCHIVED`

### 35.2 Editorial Checkpoints

These are the editorial checkpoint values:

- `GENERATED`
- `REVIEWED`
- `EDITED`
- `APPROVED`

`editorialStage` and `status` are separate fields. A post may be `status = DRAFT` while moving through editorial checkpoints.

### 35.3 Scheduling Workflow

Scheduling is mandatory for Release 1.

- a draft only moves to `status = SCHEDULED` after an admin explicitly confirms scheduling
- once confirmed, the future `scheduledPublishAt` value is used by the scheduler
- the scheduler publishes it exactly once when the target time arrives
- publish actions must write an audit event
- manual publish clears any future schedule

### 35.4 Optional Editorial Enhancements

Optional after Release 1:

- revision history UI
- rollback UI
- draft comparison view

## 36. Content Quality Rules

Every generated post must pass these checks:

- title exists
- definition exists
- principle of operation exists
- maintenance section exists
- disclaimer exists
- references exist
- no broken internal structure
- no duplicate manufacturer rows
- no empty model sections
- readable paragraph length
- tables are formatted correctly
- each section contains deep explanation, not only summary statements
- SOP and how-to-use section exists and includes model-specific differences where available
- target audience coverage is explicit across students, nurses, doctors, medical workers, technicians, engineers, hospital owners, administrators, procurement teams, trainers, and biomedical staff
- manufacturer entries are deduplicated and include branch countries where verified

## 37. Prompt Design Requirements

The writing prompts must instruct the model to:

- write for educational use
- avoid unsupported claims
- preserve source-grounded structure
- organize sections in the stable learning sequence defined in section 9
- clearly separate facts, guidance, and warnings
- never invent manuals or technical documents
- explicitly note missing information where necessary
- preserve disclaimers and references
- respect the selected article depth and target audiences

## 38. Acceptance Fixture for "Microscope"

Use `microscope` as the baseline acceptance fixture during implementation and QA.

The resulting English draft must include, when reliable data exists:

1. What is a microscope
2. Featured image of a microscope
3. How a microscope works
4. Key components of a microscope
5. Types of microscopes
6. Common laboratory applications
7. Commonly used microscope manufacturers
8. Commonly encountered microscope models by manufacturer
9. Common microscope faults and remedies
10. Daily care and cleaning
11. Preventive maintenance checklist
12. Safety precautions
13. Manuals and brochures
14. SOP and how-to-use guidance
15. FAQ
16. Disclaimer
17. References

This fixture is mandatory for acceptance testing. The implementation may add more fixtures later.

## 39. Release 1 Minimum Feature Set

This section summarizes the minimum ship-ready subset of the mandatory Release 1 requirements already defined above. It does not reduce or override earlier mandatory sections.

Release 1 must include:

- admin authentication
- Generate Post page
- draft save and edit flow
- manual publish
- scheduled publish
- English public blog pages on a locale-ready routing foundation
- comments with moderation
- SEO metadata
- sitemap and robots
- manufacturer, model, and manual-link support
- search
- analytics dashboard and job logs

## 40. Phase 2 Features

These are future enhancements and are not required for Release 1:

- richer manufacturer pages
- manual source approval queue
- PDF extraction pipeline
- source confidence scoring UI
- content update reminders
- multilingual translation dashboard enhancements
- advanced search filters

## 41. Phase 3 Features

These are future enhancements and are not required for Release 1:

- automatic refresh of old posts
- model comparison tables
- equipment troubleshooting decision trees
- biomedical engineer review workflow
- geo-aware provider routing policies
- downloadable maintenance checklists
- semantic search
- AI-assisted comment moderation

## 42. Recommended Development Order

Follow the `dev-plan` files in numeric order from `00` through `24`.

At a high level, the build order is:

1. lock architecture decisions
2. scaffold the repo and routes
3. define environment schema
4. implement database schema, indexes, and seeds
5. add authentication and RBAC
6. add locale-ready routing and English-first locale persistence
7. add generation validation, source collection, and AI composition
8. add duplicate handling and Generate Post admin UX
9. add editorial lifecycle and scheduling
10. add public pages, media, comments, SEO, search, and related posts
11. add analytics, observability, performance work, and final release traceability

## 43. Practical Constraints and Important Notes

### 43.1 About Full Automation

A fully automatic medical-equipment publisher is technically possible, but medical and technical accuracy must be handled carefully.

### 43.2 Required Operating Policy

Release 1 must follow this operating policy:

- AI generates drafts automatically
- publishing remains a manual editor action

### 43.3 Why This Matters

Medical-equipment content can influence cleaning, maintenance, safety, and troubleshooting behavior. Incorrect details can create operational risk.

The safest Release 1 workflow is:

- automated research
- automated draft generation
- human review
- manual final publish approval

## 44. Final Architecture Summary

This application must be built as a Next.js App Router full-stack content platform with:

- JavaScript only
- Vercel AI SDK for generation
- styled-components for theming and styling
- Redux Toolkit for admin-side state
- Zod for strict validation
- Prisma plus MySQL for structured persistence
- English-first locale-ready public routes and translation-ready persistence
- public reading without signup
- guest comments with moderation
- rich SEO metadata
- source-grounded AI generation workflow

The core design rule is:

> Do not treat the model as the source of truth. Treat the model as the writing and organization layer on top of a structured research pipeline.

## 45. Official Technology References

These references are informational and do not override this document:

- Next.js App Router documentation
- Next.js Metadata and SEO documentation
- Next.js internationalization documentation
- Next.js CSS-in-JS documentation
- Vercel AI SDK documentation
- Prisma documentation for Next.js and Prisma schema
- Redux Toolkit documentation
- Zod documentation

## 46. Source of Truth and Implementation Completeness

This file, `app-write-up.md`, is the single source of truth for implementation.

### 46.1 Precedence Rules

Use this precedence order for all implementation decisions:

1. safety, legal, and compliance requirements in this document
2. core business requirements and workflows in this document
3. data model and API contracts in this document
4. UX and UI behavior in this document
5. optimization rules and future-phase notes in this document

If any implementation artifact conflicts with this document, this document wins.

### 46.2 Normative Requirement Semantics

- `Must`: mandatory for Release 1
- `Should`: expected unless a documented exception is approved
- `May` or `Optional`: not mandatory for Release 1, but if implemented must still follow this document
- `Future phase`: explicitly excluded from Release 1
- `Where available`: include data only when it is verifiably sourced; never fabricate missing values

Mandatory Release 1 scope rule:

- sections `1-39` and `42-46` are mandatory unless a specific item is explicitly labeled optional
- sections `40-41` are future-phase only and are not part of Release 1
- section `45` is informational only
- Release 1 locale support is limited to `en`; additional locales are optional extensions that must reuse the existing locale-aware architecture

### 46.3 Completion Gate

Implementation is incomplete unless all of the following are true:

- all required content sections are generated, including SOP and model-specific differences where available
- English-only locale behavior is correct in Release 1, and adding a new locale requires only adding a locale file, registering it in the existing locale configuration, and using the existing locale-aware routing and persistence flow
- duplicate equipment detection and replace-or-cancel branching are enforced
- article depth, target audience, and provider selection controls match UI and API contracts
- scheduling works during or after generation with a date-time picker and background worker
- inline images, media attribution, and copyright constraints are enforced
- manufacturer, model, and fault deduplication and reliability rules are enforced
- admin can switch AI provider and model, refresh trusted model catalogs, and store provider credentials without code changes
- website, page, and post view analytics are tracked and visible to admin
- public sharing through social actions, email, and copy link works
- mobile-first responsive behavior is implemented across required public pages
- security validation and moderation controls are active
- every mandatory page listed in section 5 exists
- every mandatory admin page listed in section 5 exists

### 46.4 Change Control for Future Edits

Any future update to this document must include:

- the explicit sections changed
- the reason for the change
- the impact on schema, API, UI, and workflows
- migration or backward-compatibility notes when relevant

### 46.5 Definition of Done

The application is complete only when:

- all mandatory requirements in sections `1-46` are satisfied according to section `46.2`
- no unresolved contradictions remain inside this document
- the `dev-plan` is fully aligned with this document
- release validation confirms behavior against the completion gate in section `46.3`
