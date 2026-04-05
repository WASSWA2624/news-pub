# 02 Repo Scaffold

Source sections: 1, 3, 4, 5, 6, 23, 24.
Atomic aspect: repo shape and baseline app skeleton only.
Prerequisite: step 01.

## Goal

Reshape the existing repo from the retired equipment product into the NewsPub skeleton without introducing the feature logic yet.

## Reuse First

- Keep the App Router layout structure, admin and public shells, theme, store provider, auth helpers, env parser, storage adapter, SEO helpers, analytics helpers, and shared UI primitives.
- Rebrand and repurpose existing routes and screens before creating new parallel folders.

## Implement

1. Rename the package and visible product branding from `equip-blog` and `Equip Blog` to `news-pub` and `NewsPub`.
2. Replace active route metadata, shell titles, logos, message copy, and layout headings so they describe a news-ingestion publishing app.
3. Repoint the public route tree to the NewsPub route map:
   - keep `/` redirecting to the default locale
   - keep `/[locale]`
   - replace equipment and manufacturer pages with `news`, `category`, `search`, and legal pages
4. Repoint the admin route tree to the NewsPub control-plane map:
   - keep `/admin/login` and `/admin`
   - add `providers`, `destinations`, `streams`, `templates`, and `settings`
   - replace or retire prompt, localization, manufacturer, generation, and comment routes
5. Delete or quarantine the AI, equipment, manufacturer, prompt, and comment module families marked for removal in section `23`.
6. Keep route placeholders compiling even before later feature steps land, so the repo stays runnable throughout the rewrite.
7. Update the root docs that must immediately match the new product identity, especially `README.md` if it still presents the old product as current.
8. Add or refresh module-level JSDoc in repurposed layout, shell, and placeholder route files when the file is non-trivial, so renamed scaffolding explains its NewsPub role before later feature steps expand it.

## Required Outputs

- `package.json`
- `README.md`
- `src/app/*` route folders and placeholder pages
- rebranded layout and message files
- removed or renamed legacy module directories

## Verify

- the app boots into NewsPub-branded public and admin shells
- the active route tree matches sections `5` and `6`
- no active shell, page title, or route placeholder still presents the old equipment-generation product
- repurposed scaffold files explain their NewsPub role with current JSDoc where the file contains more than trivial placeholder code
- deleted legacy modules are not still imported by the new scaffold

## Exit Criteria

- the repo shape and product identity are ready for NewsPub feature work
