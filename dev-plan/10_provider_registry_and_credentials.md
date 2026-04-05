# 10 Provider Registry And Credentials

Source sections: 7, 10, 12, 21, 22.
Atomic aspect: provider registry, selection, and credential resolution only.
Prerequisite: step 09.

## Goal

Implement the provider layer that NewsPub uses to select a news API, resolve credentials, and expose provider-specific defaults safely.

## Reuse First

- Repurpose the existing provider-configuration screen, env parser, validation style, and admin API conventions.
- Replace AI provider catalogs with a small, explicit news-provider registry.

## Implement

1. Create a provider registry that supports exactly:
   - `mediastack`
   - `newsdata`
   - `newsapi`
2. Store provider metadata and defaults in `NewsProviderConfig`, not in hard-coded admin-only page state.
3. Resolve credentials from env at runtime based on the active provider key.
4. Show provider health, credential status, and enabled or disabled state in the admin UI without exposing secrets.
5. Support provider-specific request defaults, paging hints, and fallback query settings.
6. Remove AI-model, prompt, and catalog logic from the provider workflow.
7. Document the provider registry, credential resolver, and health-status surfaces with JSDoc, and add inline comments where needed to explain secret-handling boundaries, fallback defaults, or provider-specific quirks.

## Required Outputs

- provider registry modules
- `src/components/admin/provider-configuration-screen.js`
- provider admin routes and APIs
- provider validation tests

## Verify

- only the three NewsPub providers are selectable
- `mediastack` is the seeded default provider
- missing provider credentials block execution and surface an admin-visible error
- credential resolution and provider-specific defaults are documented clearly enough that the secret-handling flow is understandable without tribal knowledge
- no AI provider catalogs or model-selection flows remain in the active provider UI

## Exit Criteria

- provider selection and credential resolution are stable enough for fetch pipeline work
