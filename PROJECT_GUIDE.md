# NewsPub Project Guide

## Overview

NewsPub is a Next.js news publishing platform that:

- fetches news from supported providers
- filters and deduplicates stories per configured stream
- creates canonical posts in the local database
- publishes approved stories to the website and connected social destinations
- provides an admin dashboard for configuration, review, scheduling, media, SEO, and reporting

The app has two main surfaces:

- Public site: locale-based news pages for readers
- Admin site: protected workspace for managing the publishing pipeline

## How The App Works

At a high level, the app follows this workflow:

1. An admin signs in to `/admin/login`.
2. Providers, destinations, templates, categories, and streams are configured in the admin area.
3. A stream fetches articles from a provider.
4. Fetched articles are normalized, filtered, and checked for duplicates.
5. Eligible stories become local `Post` records.
6. Streams in `AUTO_PUBLISH` mode publish immediately.
7. Streams in `REVIEW_REQUIRED` mode place stories in the review queue first.
8. Published website stories appear on the public site and related pages are revalidated.
9. Failed publish attempts can be retried from the jobs area or by the scheduler.

### Main Runtime Areas

- `src/app`: Next.js routes for the public site, admin pages, and API routes
- `src/lib/news/workflows.js`: fetch, review, publish, scheduling, and retry workflows
- `src/features/*`: business logic for providers, streams, posts, templates, settings, media, and analytics
- `prisma/schema.prisma`: database schema
- `prisma/seed.js`: baseline data and admin seed user creation

## Public Routes

The public site uses locale-prefixed routes. With the default config, `/` redirects to `/en`.

Main public pages:

- `/[locale]`
- `/[locale]/news`
- `/[locale]/news/[slug]`
- `/[locale]/category/[slug]`
- `/[locale]/search`
- `/[locale]/about`
- `/[locale]/privacy`
- `/[locale]/disclaimer`

## Admin Routes

Main admin pages:

- `/admin`
- `/admin/login`
- `/admin/providers`
- `/admin/destinations`
- `/admin/streams`
- `/admin/categories`
- `/admin/posts/review`
- `/admin/posts/published`
- `/admin/posts/[id]`
- `/admin/media`
- `/admin/templates`
- `/admin/jobs`
- `/admin/seo`
- `/admin/settings`

## Requirements To Run The App

You need:

- Node.js 20+ recommended
- npm
- MySQL or MariaDB
- a valid `.env.local` file at the project root

Optional, depending on what you want to test:

- provider API keys for `mediastack`, `newsdata`, or `newsapi`
- social destination tokens for Facebook and Instagram publishing
- S3 credentials if you want to use `MEDIA_DRIVER=s3`

## Environment Variables

The project includes `.env.example`. Copy it into `.env.local` and update the values.

Important variables:

- `DATABASE_URL`: MySQL or MariaDB connection string
- `NEXT_PUBLIC_APP_URL`: app base URL, usually `http://localhost:3000`
- `SESSION_SECRET`: admin session secret
- `ADMIN_SEED_EMAIL`: seeded admin login email
- `ADMIN_SEED_PASSWORD`: seeded admin login password
- `DESTINATION_TOKEN_ENCRYPTION_KEY`: encrypts stored destination tokens
- `REVALIDATE_SECRET`: used for revalidation endpoints
- `CRON_SECRET`: used for scheduled job endpoints
- `MEDIA_DRIVER`: `local` or `s3`
- `DEFAULT_LOCALE` and `SUPPORTED_LOCALES`: locale configuration

Notes:

- If `MEDIA_DRIVER=local`, `LOCAL_MEDIA_BASE_PATH` and `LOCAL_MEDIA_BASE_URL` are required.
- If `MEDIA_DRIVER=s3`, all S3 variables are required.
- The app validates env values at runtime and will fail to start if required values are missing or invalid.

## How To Run It

1. Install dependencies:

```bash
npm install
```

2. Create or update `.env.local` from `.env.example`.

3. Make sure your database server is running and the database in `DATABASE_URL` exists.

4. Start the development server:

```bash
npm run dev
```

What `npm run dev` does:

- generates the Prisma client
- applies Prisma migrations
- baselines old local databases when possible
- seeds baseline data if the database is empty
- starts the Next.js dev server through `nodemon`

5. Open the app in your browser:

- Public site: `http://localhost:3000`
- Admin site: `http://localhost:3000/admin/login`

6. Sign in using the values from:

- `ADMIN_SEED_EMAIL`
- `ADMIN_SEED_PASSWORD`

## Typical Usage Flow

After signing in, a normal setup flow is:

1. Check `Providers` and make sure at least one provider is enabled and has credentials if required.
2. Check `Destinations` and confirm the website destination exists.
3. Review `Categories` and `Templates`.
4. Review `Streams` and confirm the active provider, destination, schedule, mode, and filters.
5. Run a stream manually from the admin dashboard or streams page.
6. Review held stories in `/admin/posts/review` if the stream requires review.
7. Publish or schedule stories from the post editor.
8. Monitor failures and retries in `/admin/jobs`.

## Default Seeded Data

On first run, the seed script creates baseline records including:

- one default locale: `en`
- an admin user from `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`
- default categories such as World, Business, Technology, and Policy
- provider records for Mediastack, NewsData, and NewsAPI
- default destinations for Website, Facebook, and Instagram
- default publishing templates
- default streams for website auto-publishing and review-based social publishing

## Useful Commands

```bash
npm run dev
npm run build
npm run start
npm run lint
npm run test
npm run prisma:generate
npm run prisma:validate
npm run prisma:seed
```

## Troubleshooting

- If startup fails with env errors, compare `.env.local` against `.env.example`.
- If Prisma fails, confirm the database exists and `DATABASE_URL` points to MySQL or MariaDB.
- If the admin login does not work, verify the seeded credentials in `.env.local` and reseed if needed.
- If providers fetch no content, confirm the provider API keys are present and valid.
- If website stories do not appear publicly, check whether the stream is in review mode and whether publication succeeded.
- If social publishing fails, confirm the destination is connected and has a valid token.

## Project Summary

This app is best understood as a configurable publishing pipeline:

- providers bring in external news
- streams decide what qualifies
- posts store the local canonical story
- templates shape how stories are published
- destinations define where they go
- the public site displays website-published stories
