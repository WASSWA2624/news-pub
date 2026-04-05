# Localization Workflow

## Release 1 Behavior

- `en` is the only active locale in Release 1.
- Public routing stays locale-prefixed under `/[locale]`.
- Post content persists through one `PostTranslation` record per post and locale.
- Each localized record stores Markdown, HTML, structured JSON, FAQ JSON, excerpt, title, and disclaimer content.

## Future Locale Activation Path

Add a new locale without changing schema or routes:

1. Create `src/messages/<locale>.json` with the required UI copy and `post.defaultDisclaimer`.
2. Register the locale in [`src/features/i18n/config.js`](../src/features/i18n/config.js).
3. Add the locale code to `SUPPORTED_LOCALES`.
4. Use the existing localization management page or persistence service to save locale-specific content.

The locale registry sync helper will upsert the configured locale record into the `Locale` table automatically, so activation remains configuration-driven.
