# 08 Locale Routing

Source sections: 10.3, 11.1, 11.2, 14.
Atomic aspect: locale routing only.
Prerequisite: step 07.

## Goal

Implement the Release 1 public routing model with locale-prefixed URLs, `en` as the only active locale, and root redirection.

## Implement

1. Support `en` as the only active locale in Release 1 through a config-driven locale registry.
2. Implement root `/` redirection to `/en`.
3. Ensure all public pages render under `[locale]` while only `en` resolves in Release 1.
4. Keep admin routes under `/admin`.
5. Add helpers for locale-aware links and canonical path generation.
6. Add safe handling for unsupported locale prefixes.

## Required Outputs

- locale routing layer
- root redirect behavior
- locale-aware path helpers

## Verify

- all public route families resolve correctly for `en`
- `/` redirects correctly
- unsupported locales do not resolve to broken content

## Exit Criteria

- the app has a stable routing contract for all public pages and a config-driven path for future locales
