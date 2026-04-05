# ADR 0002: Routing And Locale Segmentation

- Status: Accepted
- Date: 2026-04-02
- Source sections: 5, 10.3, 11, 14, 44, 46

## Context

The public site must be locale-ready from day one, while the admin panel stays operationally separate and simpler to secure. Release 1 ships English only, but the routing foundation must not require redesign when a new locale is enabled later.

## Decision

Routing is frozen as follows:

- All public route families are locale-prefixed under `/[locale]`.
- Release 1 accepts only the `en` locale and treats it as both the default and only active locale.
- Root `/` redirects to `/en`.
- Admin routes remain under `/admin` and are not locale-prefixed.
- Canonical public URLs use the locale-prefixed form.

Release 1 public route families:

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

Release 1 admin route families:

- `/admin/login`
- `/admin`
- `/admin/generate`
- `/admin/posts/drafts`
- `/admin/posts/published`
- `/admin/posts/{id}`
- `/admin/categories`
- `/admin/manufacturers`
- `/admin/media`
- `/admin/comments`
- `/admin/seo`
- `/admin/localization`
- `/admin/jobs`
- `/admin/prompts`
- `/admin/sources`

Locale extensibility is frozen as follows:

- Adding a new locale must require a new locale file under `messages/` and registration in the existing supported-locale configuration.
- Adding a new locale must not require schema changes or route redesign.
- Unsupported locale prefixes must be rejected safely by the routing policy in later implementation steps.

## Consequences

- Step 02 must scaffold public routes under `[locale]` and admin routes under `admin`.
- Step 08 must implement locale-aware routing, metadata, and message loading without changing the route shape.
- Future locale enablement remains configuration-driven instead of structural.
