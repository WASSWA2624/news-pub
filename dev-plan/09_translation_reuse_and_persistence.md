# 09 Translation Reuse and Persistence

Source sections: 11.3, 11.4, 24, 39.
Atomic aspect: English-first locale persistence and localization management only.
Prerequisite: step 08.

## Goal

Persist English content correctly in Release 1 while keeping the app ready for future locale additions without redesign.

## Implement

1. Implement `en` as the only active locale in Release 1.
2. Persist exactly one active translation record per post and locale, with `en` as the only populated locale in Release 1.
3. Build locale-aware rendering and persistence helpers so additional locales can be added without schema or route changes.
4. Support manual editing of English locale content in the admin Localization Management page, while keeping the page ready to list future locales.
5. Document and implement the future locale activation path: add a new locale file, register it in supported locale configuration, then use the existing locale-aware persistence flow.
6. Persist Markdown and HTML render artifacts per post and locale.

## Required Outputs

- locale-aware persistence service
- locale activation and reuse logic
- localization management admin surface

## Verify

- Release 1 content persists under `en` correctly
- adding a test locale requires only a new locale file and configuration registration, with no schema or route redesign
- English locale edits are persisted correctly through the locale-aware storage layer

## Exit Criteria

- English-first locale behavior is deterministic and the future locale extension path is already supported
