# Architecture Summary

This summary freezes the Release 1 architecture before scaffolding begins. The authoritative decision records live in [docs/adr/README.md](./adr/README.md).

## Fixed Decisions

- Runtime stack: Next.js App Router, JavaScript, Vercel AI SDK, styled-components, Redux Toolkit, Zod, Prisma, MySQL
- Public routing: locale-prefixed under `/[locale]`, with only `en` active in Release 1
- Root behavior: `/` redirects to `/en`
- Admin routing: non-locale routes under `/admin`
- Content rule: structured research is the factual source layer; AI is the writing layer
- Publishing rule: generation may be automated, but publish must be manual
- Lifecycle rule: `status` and `editorialStage` stay separate
- Storage rule: persist Markdown, HTML, and structured JSON; media uses a driver abstraction
- Access rule: Release 1 uses admin email/password auth and guest public comments
- Locale extensibility rule: a new locale is added by creating `src/messages/<locale>.json`, registering it in the locale configuration, and reusing the existing locale-aware persistence flow

## Route Families


| Surface | Family                                                                                                                                                                                                                | Release 1 behavior                         | Boundary                                                            |
| ------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| Public  | `/`                                                                                                                                                                                                                   | Redirect to `/en`                          | No public content renders at root                                   |
| Public  | `/[locale]`                                                                                                                                                                                                           | Only `/en` is active                       | Home and discovery pages must stay locale-aware                     |
| Public  | `/[locale]/blog` and `/[locale]/blog/[slug]`                                                                                                                                                                          | Published content only                     | Reads published translations and render artifacts only              |
| Public  | `/[locale]/category/[slug]`, `/[locale]/manufacturer/[slug]`, `/[locale]/equipment/[slug]`                                                                                                                            | English topical landing pages in Release 1 | Discovery pages; no admin mutations                                 |
| Public  | `/[locale]/search`, `/[locale]/about`, `/[locale]/contact`, `/[locale]/disclaimer`, `/[locale]/privacy`                                                                                                               | English-only output in Release 1           | Locale-driven public surfaces                                       |
| Admin   | `/admin/login`                                                                                                                                                                                                        | Email/password login                       | Authentication entry point only                                     |
| Admin   | `/admin`, `/admin/generate`, `/admin/posts/*`, `/admin/categories`, `/admin/manufacturers`, `/admin/media`, `/admin/comments`, `/admin/seo`, `/admin/localization`, `/admin/jobs`, `/admin/prompts`, `/admin/sources` | Protected admin-only routes                | Never locale-prefixed; reads locale-ready labels from message files |


## Major Modules, Owners, And Boundaries


| Module                           | Planned owner                                                                       | Boundary                                                                                                                                       |
| -------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| App shell and routing            | `src/app`, `proxy.js`                                                               | Composes route trees, redirects, layouts, metadata entry points, and route protection; does not own business rules                             |
| Public experience                | `src/app/[locale]`, `src/components/blog`, `src/features/posts`                     | Renders published locale-aware content only; no admin mutations                                                                                |
| Admin experience                 | `src/app/admin`, `src/components/admin`, `src/features/*`                           | Hosts authenticated admin workflows, forms, moderation, settings, and editorial tooling                                                        |
| Internationalization             | `src/features/i18n`, `messages/`, locale config                                     | Owns supported locales, message loading, locale validation, and localized legal copy                                                           |
| Styling and theming              | `src/styles`, shared layout components                                              | Owns styled-components registry, theme tokens, and global visual primitives                                                                    |
| Admin client state               | `src/store`, `src/store/slices`, admin-facing features                              | Redux Toolkit is limited to admin-side client state such as generator progress, draft editor state, and moderation filters                     |
| Validation contract              | `src/lib/validation`                                                                | Owns Zod schemas for env, inputs, API payloads, and AI output validation                                                                       |
| Research and generation pipeline | `src/lib/normalization`, `src/lib/research`, `src/lib/ai`, `src/features/generator` | Normalizes equipment input, collects sources, validates structured research, and composes drafts; AI never becomes the factual source of truth |
| Editorial workflow               | `src/features/editor`, `src/features/posts`, `src/lib/jobs`                         | Owns draft review, schedule confirmation, publish actions, and background publish execution                                                    |
| Persistence                      | `prisma/schema.prisma`, `src/lib/prisma`                                            | Owns relational models, locale-aware content storage, auditability, and query access to MySQL                                                  |
| Media storage                    | `src/features/media`, `src/lib/storage`                                             | Owns media metadata, upload policy, and storage-driver abstraction across local and S3-compatible backends                                     |
| Auth and access control          | `src/features/auth`, `src/lib/auth`, protected route handlers                       | Owns admin email/password auth, sessions, RBAC hooks, and guest-comment/public-read split                                                      |
| SEO, search, and analytics       | `src/features/seo`, `src/lib/seo`, `src/lib/analytics`, `src/features/analytics`    | Owns metadata, sitemap, robots, database-backed search, and observability for public and admin surfaces                                        |


## Data Flow

1. Admin enters an equipment name in `/admin/generate`.
2. The system normalizes the input and checks duplicates against canonical equipment plus locale.
3. Approved sources are collected and transformed into a structured research payload.
4. Validation gates run before any AI composition step.
5. The AI layer turns validated research into structured article output, Markdown, HTML, and SEO artifacts.
6. The system saves the result as a draft with separate `status` and `editorialStage` values.
7. An admin reviews, edits, schedules, or manually publishes the draft.
8. Public routes render only published locale-aware content plus moderated comments.
