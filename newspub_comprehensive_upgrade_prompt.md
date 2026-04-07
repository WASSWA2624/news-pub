# NewsPub Comprehensive Upgrade Prompt

You are upgrading an existing **Next.js 16.2.2 + React 19.2.4 + Prisma 7.6.0 + MySQL/MariaDB + styled-components + Redux Toolkit + Zod** codebase named **NewsPub**.

Work directly in the current repository and **update all required files** so the app becomes production-ready, visually uniform, responsive, robust, and fully connected end-to-end.

Do not produce a partial scaffold. Deliver a coherent implementation with updated code, schema, validation, UI, backend flows, tests, docs, and environment contract.

---

## 1. Repository context you must respect

This repo already contains:

- Next.js App Router app under `src/app`
- public locale routes under `src/app/[locale]`
- admin routes under `src/app/admin`
- API routes under `src/app/api`
- Prisma schema at `prisma/schema.prisma`
- runtime env parsing in `src/lib/env/runtime.js`
- Redux store in `src/store`
- styled-components theme in `src/styles/theme.js`
- global styles in `src/app/globals.js`
- product write-up in `app-write-up.md`
- implementation plan in `dev-plan/*`

Important: the current write-up says Release 1 is **not** an AI writing product. Since this upgrade now requires an AI optimization layer, you must first **update the source-of-truth documentation and implementation plan** so the codebase, docs, and runtime behavior no longer conflict.

---

## 2. Main outcome

Transform NewsPub into a **fully operational content ingestion, review, optimization, scheduling, and publishing platform** for:

- **Website**
- **Facebook**
- **Instagram**

The final system must be:

- totally responsive across mobile, tablet, laptop, and large screens
- visually uniform across admin and public surfaces
- simple to use
- robust under invalid input, missing media, bad provider payloads, failed publish attempts, and API rate limits
- fully wired from UI to backend to database to publishing logic
- optimized for low subscription and API usage
- compliant-aware, especially for Facebook and Instagram posting safety

---

## 3. Non-negotiable architectural goals

### 3.1 Keep the existing stack unless change is required
Reuse the current architecture and existing modules where possible. Do not rebuild the project from scratch.

Preserve and strengthen:

- Next.js App Router
- Prisma persistence
- styled-components design system
- Redux Toolkit admin state
- Zod validation
- existing public/admin route structure
- existing SEO foundations
- current provider/destination/stream workflow shape

### 3.2 Eliminate inconsistency
Normalize the codebase so naming, module layout, patterns, validation, formatting, and error behavior are consistent throughout.

### 3.3 Full connectivity
Ensure all relevant UI actions are backed by working server logic:

- create/edit destination
- create/edit stream
- review post
- optimize post
- approve/reject post
- schedule post
- publish post
- retry failed publish
- show exact failure reason
- surface operational history and audit state

### 3.4 No rounded UI language
Avoid or remove corner radii across the app. Use a clean, sharp, modern editorial dashboard look.

- set radii to `0` or near-zero consistently
- remove mixed rounded styles
- unify borders, spacing, shadows, and hover states

---

## 4. Mandatory documentation updates

Update these files so the repo’s documentation matches the new product behavior:

- `README.md`
- `app-write-up.md`
- `dev-plan/00_plan_index.md`
- any impacted `dev-plan/*.md` files

Revise the product scope to support a **minimal AI-assisted optimization layer** while preserving source attribution and preventing factual invention.

The updated documentation must clearly state:

- AI is used for **formatting, rewriting, SEO optimization, policy pre-checks, and destination-specific packaging**
- AI must **not invent facts** or alter the factual meaning of provider content
- source attribution remains visible and preserved
- AI output is bounded, structured, validated, and auditable

---

## 5. AI layer requirements

Add an **AI SDK-based optimization layer** for filtered and eligible posts.

### 5.1 Purpose of the AI layer
The AI layer must process already filtered posts and produce platform-specific render payloads efficiently for:

- Facebook
- Website
- Instagram

The AI layer must operate **after ingestion/filtering/deduplication** and **before final publish or review approval**, depending on stream mode.

### 5.2 AI constraints
The AI must:

- preserve the factual meaning of the original article
- not invent names, claims, statistics, quotes, or events
- not remove source attribution
- not generate prohibited, sensationalized, deceptive, hateful, or unsafe content
- degrade gracefully when AI is unavailable

### 5.3 Usage-efficiency requirements
Minimize model and subscription usage:

- only optimize posts that pass eligibility rules
- cache optimization results by deterministic content hash
- never re-run optimization when source content and destination settings are unchanged
- support cheap-first strategy with bounded prompt size
- truncate and sanitize input before model submission
- use structured output schemas
- use one-pass generation where possible
- support manual re-optimize only on demand
- avoid generating variants that will never be published

### 5.4 AI implementation expectations
Add the required AI SDK dependency and implement a reusable optimization service layer under a suitable path, for example:

- `src/lib/ai/*`
- `src/features/posts/optimization/*`
- `src/lib/content/*`

Use strict schema validation for all AI outputs.

---

## 6. Platform-specific output rules

### 6.1 Facebook output
For each Facebook-ready post, generate:

1. **A rephrased bold title** of **maximum 10 words**
2. **A rephrased, on-point body** in **20 to 100 words**
3. **A photo**, if the source post contains one, using the supplied image link

Formatting rules:

- output must suit Facebook formatting
- text must feel natural, readable, and concise
- title and body must be suitable for feed posting
- if bold-style formatting is represented textually, use the project’s selected formatting convention consistently
- if no valid image exists, publish text-only safely

Compliance rules:

- run a pre-publish content safety review aligned with Facebook platform rules
- block or hold content that appears deceptive, spammy, misleading, abusive, or otherwise risky
- flag risky phrases, overuse of engagement bait, duplicate posting patterns, or suspicious formatting

### 6.2 Website output
For each website post, generate:

1. **A hot rephrased title** with **fewer than 15 words**
2. **A rephrased and optimized body** in **100 to 500 words**
3. **A rendered image** from the supplied link when available

SEO rules:

- produce SEO-friendly title and meta description
- preserve source attribution
- improve readability with clear structure
- optimize slug generation
- support canonical metadata and structured data
- avoid keyword stuffing

### 6.3 Instagram output
Create an Instagram-safe optimized caption and media preparation flow.

Requirements:

- concise, platform-appropriate caption
- optional hashtags with strict cap and quality filter
- avoid spam-like repetition
- respect Instagram posting rate and duplication guardrails
- if media is unsuitable for Instagram destination requirements, hold for review instead of posting blindly

---

## 7. Account-ban protection and platform safety

For Facebook and Instagram, add protective measures to reduce the risk of account restriction or ban.

Implement guardrails such as:

- rate limiting per destination
- cooldown windows for repeated/similar content
- duplicate content detection across recent publish history
- ban-risk scoring before publish
- blocklists for disallowed phrases and risky patterns
- hashtag caps and deduplication
- minimum time intervals between posts
- media validation before publish
- hold-for-review for borderline content
- clear audit logs for why a post was blocked, held, retried, or published

Do not claim guaranteed compliance or immunity from enforcement. Implement practical safeguards and transparent review states.

---

## 8. Robustness and error handling

The system must have **full error catchment and decoding** across UI, API, services, jobs, providers, and publishing flows.

### 8.1 Error handling requirements
Implement:

- centralized error normalization
- typed/domain error classes where appropriate
- safe decoding of provider/API failures
- user-facing error messages that are clear but safe
- developer-facing structured logs with enough detail for debugging
- retryable vs non-retryable failure classification
- full `try/catch` coverage for non-trivial async boundaries
- no silent failures

### 8.2 Required behavior
Handle and surface failures for:

- missing env variables
- invalid credentials
- provider API failures
- malformed provider payloads
- image fetch failures
- AI optimization failures
- validation failures
- DB write failures
- publish API failures
- scheduler failures
- revalidation failures
- auth/session failures

### 8.3 Error UI
Add consistent error, empty, loading, retry, and success states across admin and public interfaces.

---

## 9. Responsiveness and UI uniformity

Refine the entire UI for consistency and quality.

### 9.1 Visual direction
Use a clean, modern, editorial operations style:

- sharp edges, little to no radius
- consistent border system
- consistent spacing scale
- consistent typography hierarchy
- consistent button/input/table/card treatment
- accessible contrast
- predictable focus states

### 9.2 Responsiveness
Make every major screen work cleanly on:

- small mobile
- large mobile
- tablet
- laptop
- desktop
- ultra-wide

### 9.3 Required UI review areas
Review and improve:

- app shell
- admin navigation
- data tables
- forms
- review queue
- post detail/editor pages
- destination and stream configuration screens
- public news pages
- story pages
- search and category pages
- media displays

### 9.4 Remove design drift
Refactor any mixed or legacy UI patterns so the app feels like one product.

---

## 10. Backend and workflow completeness

Make sure the whole content pipeline is fully operational.

### 10.1 End-to-end flow
The final flow must reliably support:

1. fetch provider data
2. normalize provider payload
3. filter by stream rules
4. deduplicate
5. persist eligible article
6. build canonical post artifact
7. optimize for destination using AI layer
8. review or auto-publish based on stream mode
9. publish to website/Facebook/Instagram
10. store publish attempts and responses
11. expose status in admin UI

### 10.2 Canonical content model
Keep one canonical source-backed post record, then derive destination-specific optimized payloads from it.

### 10.3 Review flow
Add a clear review workflow with statuses such as:

- ingested
- optimized
- held
- review required
- approved
- scheduled
- published
- failed

### 10.4 Retry behavior
Retries must be:

- idempotent
- bounded
- auditable
- platform-aware

---

## 11. Data model and persistence updates

Update `prisma/schema.prisma`, migrations, seed logic, and any affected data-access code as needed.

Add or extend fields/models required for:

- AI optimization state
- per-platform optimized payloads
- compliance review state
- ban-risk or policy-check results
- content hashes for cache reuse
- prompt/input hash or optimization hash
- destination-specific publish guardrails
- richer publish attempt diagnostics
- post review decisions

If existing models already fit, extend them instead of creating unnecessary parallel models.

Also update:

- `prisma/seed.js`
- migration files
- any Prisma access helpers under `src/lib/prisma/*`

---

## 12. Environment and secrets

Update environment parsing and docs.

Required file updates include:

- `.env.example`
- `src/lib/env/runtime.js`
- `src/lib/env/server.js`
- `src/lib/env/shared.js`
- tests covering env parsing

Add only the env keys actually needed for the AI layer and new safety controls.

Requirements:

- fail fast on missing critical config
- validate all new env values with Zod
- keep secrets server-side only
- keep platform safety thresholds configurable

---

## 13. SEO and website quality

Improve website publishing quality with:

- SEO-friendly titles and metadata
- structured data where appropriate
- canonical URLs
- better slug creation
- better image metadata handling
- consistent article layout
- source attribution block
- internal linking opportunities where reasonable

Review and update relevant files under:

- `src/app/[locale]/*`
- `src/lib/seo/*`
- `src/components/seo/*`
- `src/features/public-site/*`

---

## 14. Media handling

Media must be robust and platform-aware.

Requirements:

- validate remote image URLs before use
- gracefully handle missing/broken images
- preserve attribution where required
- generate responsive variants where needed
- only pass valid renderable media links to platform formatters
- do not let broken media crash publishing jobs

Review and update relevant files under:

- `src/lib/media/*`
- `src/lib/storage/*`
- `src/features/media/*`
- `src/components/public/*`
- `src/components/admin/*`

---

## 15. Simplicity of use

Add value without making the app harder to use.

Required product qualities:

- fewer clicks for common tasks
- clearer labels and helper text
- better defaults
- visible validation hints
- compact, readable admin screens
- straightforward publish/review actions
- clean status badges and timeline/history views

Add simple high-value features only, for example:

- optimization preview before publish
- side-by-side canonical vs platform preview
- policy warning badges
- one-click retry for retryable failures
- schedule recommendations
- usage-saving indicators showing cached optimization reuse
- per-platform readiness checklist

Do not add bloated or distracting features.

---

## 16. Subscription and API cost optimization

Optimize the app to minimize subscription usage while maximizing useful output.

Implement strategies such as:

- optimization only after filter pass
- strict content hashing and result reuse
- avoid duplicate AI calls
- skip unnecessary image processing
- bounded retries
- low-token prompts
- selective field extraction from source articles
- batched background operations where safe
- cached policy checks for unchanged content
- post frequency controls to avoid waste and spam

Also expose enough metrics to understand:

- how many AI runs were skipped due to cache reuse
- how many posts were blocked before costly publish attempts
- success/failure rates by destination

---

## 17. Required code areas to review and update

Do not limit changes to one or two files. Update all affected files across the repo, including where necessary:

### Core docs and config
- `README.md`
- `app-write-up.md`
- `dev-plan/*`
- `package.json`
- `next.config.mjs`
- `eslint.config.mjs`

### Database
- `prisma/schema.prisma`
- `prisma/seed.js`
- migration files

### Environment
- `.env.example`
- `src/lib/env/runtime.js`
- `src/lib/env/server.js`
- `src/lib/env/shared.js`
- env tests

### Global styling and theme
- `src/styles/theme.js`
- `src/app/globals.js`
- shared layout and shell components

### App routes
- `src/app/layout.js`
- `src/app/[locale]/*`
- `src/app/admin/*`
- `src/app/api/*`

### Features and services
- `src/features/posts/*`
- `src/features/public-site/*`
- `src/features/providers/*`
- `src/features/destinations/*`
- `src/features/streams/*`
- `src/features/templates/*`
- `src/features/media/*`
- `src/features/seo/*`
- `src/features/auth/*`

### Libraries
- `src/lib/content/*`
- `src/lib/news/*`
- `src/lib/normalization/*`
- `src/lib/validation/*`
- `src/lib/security/*`
- `src/lib/seo/*`
- `src/lib/media/*`
- `src/lib/storage/*`
- add new AI service modules under a clean location such as `src/lib/ai/*`

### UI components
- `src/components/admin/*`
- `src/components/public/*`
- `src/components/common/*`
- `src/components/forms/*`
- `src/components/layout/*`
- `src/components/seo/*`

### State and tests
- `src/store/*`
- `src/test/*`
- route tests
- service tests
- validation tests
- publish flow tests
- AI output schema tests

---

## 18. Implementation standards

Follow these standards everywhere:

- add or update JSDoc on non-trivial files and exports
- use consistent naming
- keep modules focused
- avoid dead code and parallel legacy code paths
- no placeholder TODO logic left behind
- no mock-only implementation pretending to be production-ready
- keep behavior deterministic where possible
- use schema validation at external boundaries
- keep server/client separation clean

---

## 19. Acceptance criteria

The work is complete only when all of the following are true:

1. the docs and codebase no longer conflict about AI usage
2. the app is fully responsive and visually uniform
3. rounded corners are removed or consistently minimized
4. UI actions are actually connected to backend behavior
5. provider, optimization, and publish failures are fully caught and surfaced
6. Facebook/Instagram safety guardrails are implemented
7. per-platform optimized outputs follow the required word limits and formatting rules
8. website output is SEO-aware
9. image handling is resilient
10. subscription/API usage is reduced through caching and selective processing
11. Prisma schema, env parsing, routes, services, and UI are aligned
12. tests are updated and passing
13. linting passes
14. no obvious dead routes, dead state, or broken flows remain

---

## 20. Final deliverables expected from the implementation

Deliver all necessary code and file updates, including:

- updated docs
- updated schema and migrations
- updated env contract
- updated UI and styling
- updated admin/public flows
- AI optimization service
- platform formatter and policy-check logic
- full error handling improvements
- tests

At the end, provide a concise change summary listing:

- files changed
- major architectural decisions
- new environment variables
- migration notes
- testing performed
- remaining risks or manual setup steps

