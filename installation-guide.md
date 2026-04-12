# NewsPub cPanel Installation Guide

Deploy NewsPub to a cPanel Node.js app with MySQL or MariaDB.

## Requirements

- Node.js 20 or 22 in cPanel.
- cPanel Node.js Application Manager or Passenger support.
- A MySQL or MariaDB database and database user.
- Terminal or SSH access is recommended for database setup.

## 1. Build the cPanel package

Run from the project root:

```bash
npm ci
npm run build:cpanel
```

Upload the contents of `dist/cpanel` to your cPanel app folder.

## 2. Create the cPanel database

In cPanel **MySQL Databases**:

1. Create a database, for example `cpaneluser_news_pub`.
2. Create a user, for example `cpaneluser_news_pub_user`.
3. Grant the user **All Privileges** on the database.

Use cPanel's exact database and username values in `DATABASE_URL`:

```text
DATABASE_URL="mysql://cpaneluser_news_pub_user:encoded_password@localhost:3306/cpaneluser_news_pub?connection_limit=5"
```

If the password has special characters, URL-encode it first:

```bash
node -e "console.log(encodeURIComponent(process.argv[1]))" "raw-password"
```

`mysql://` and `mariadb://` are both supported.

## 3. Set production environment variables

Set these in the cPanel Node.js app environment panel, or in `.env.production` in the uploaded app root when the host cannot manage variables in the panel. Existing cPanel/process environment variables win over `.env.production`, and `.env` is only a final fallback.

```text
NODE_ENV="production"
DATABASE_URL="mysql://cpaneluser_news_pub_user:encoded_password@localhost:3306/cpaneluser_news_pub?connection_limit=5"
NEXT_PUBLIC_APP_URL="https://your-domain.example"
NEXT_IMAGE_REMOTE_HOSTS="cdn.your-domain.example"
DEFAULT_LOCALE="en"
SUPPORTED_LOCALES="en"
WHATSAPP_ADVERT_NUMBER="+256783230321"
SESSION_SECRET="replace-with-a-long-random-production-secret"
SESSION_MAX_AGE_SECONDS="28800"
ADMIN_SEED_EMAIL="replace-me-production-admin@example.test"
ADMIN_SEED_PASSWORD="replace-with-a-strong-initial-admin-password"
# Optional only for constrained cPanel hosts. Leave unset to keep the stronger default.
# ADMIN_PASSWORD_HASH_COST="16384"
# ADMIN_PASSWORD_HASH_MAX_MEMORY_BYTES="134217728"
DESTINATION_TOKEN_ENCRYPTION_KEY="replace-with-a-long-random-production-encryption-key"
REVALIDATE_SECRET="replace-with-a-long-random-production-revalidate-secret"
CRON_SECRET="replace-with-a-long-random-production-cron-secret"
# Optional single-instance fallback when you do not have a host-level cron hitting
# /api/jobs/scheduled-publishing. Do not enable this if you already run external cron.
# INTERNAL_SCHEDULER_ENABLED="false"
# INTERNAL_SCHEDULER_INTERVAL_SECONDS="60"
MEDIA_DRIVER="s3"
S3_MEDIA_BUCKET="your-production-bucket"
S3_MEDIA_REGION="your-region"
S3_MEDIA_BASE_URL="https://cdn.your-domain.example"
S3_ACCESS_KEY_ID="replace-with-production-s3-access-key"
S3_SECRET_ACCESS_KEY="replace-with-production-s3-secret-key"
ENABLE_ANALYTICS="true"
ENABLE_METRICS="true"
DEFAULT_SCHEDULE_TIMEZONE="UTC"
INITIAL_BACKFILL_HOURS="24"
SHARP_CONCURRENCY="1"
OUTBOUND_FETCH_TIMEOUT_MS="10000"
OUTBOUND_FETCH_RETRY_COUNT="2"
# Optional: keep deploy and seed separate by default. Set RUN_DB_SEED_ON_DEPLOY=1 only when
# you intentionally want one-step migration plus seed during deploy. SKIP_DB_SEED_ON_DEPLOY=1
# always wins and prevents deploy-time seeding.
# RUN_DB_SEED_ON_DEPLOY="0"
# SKIP_DB_SEED_ON_DEPLOY="1"
```

Set these only when the related integrations are used:

```text
MEDIASTACK_API_KEY=""
NEWSDATA_API_KEY=""
NEWSAPI_API_KEY=""
OPENAI_API_KEY=""
META_SYSTEM_USER_ACCESS_TOKEN=""
META_APP_ID=""
META_APP_SECRET=""
META_USER_ACCESS_TOKEN=""
LOCAL_MEDIA_BASE_PATH=""
LOCAL_MEDIA_BASE_URL=""
```

Keep `DESTINATION_TOKEN_ENCRYPTION_KEY` stable after launch so stored destination tokens remain decryptable.

Use `MEDIA_DRIVER=s3` for production whenever possible so uploaded originals and generated variants survive redeploys. `MEDIA_DRIVER=local` is supported only when `LOCAL_MEDIA_BASE_PATH` points to a persistent directory outside files that cPanel overwrites on redeploy, and the corresponding public URL is protected from listing and script execution by the host.

## 4. Configure the cPanel Node.js app

Create the app in cPanel with:

```text
Node.js version: 20 or 22
Application mode: Production
Application root: your uploaded NewsPub folder
Application URL: https://your-domain.example
Application startup file: app.js
```

Then run **NPM Install** from the cPanel Node.js app screen.

The packaged `npm start` command runs `node app.js`. Do not run `next build` from the uploaded cPanel package; the package already contains the standalone Next server and static assets.

The uploaded app root should include:

```text
app.js
package.json
server.js
.next/
public/
prisma/
scripts/
tmp/
```

Do not upload `.env*.local` files. The package build and `npm run repo:check` both fail when local env files are found in the source root or cPanel release bundle.

## 5. Deploy the database

From the uploaded app root on the cPanel server, run:

```bash
npm run cpanel:db:deploy
```

If cPanel only lets you run a JavaScript file:

```bash
node scripts/cpanel-db-deploy.js
```

This applies Prisma migrations only. It is safe to rerun; applied migrations are skipped.
The latest package uses lowercase Prisma table names by default and normalizes legacy mixed-case tables from older uploads before seeding.

If you intentionally want one-step migration plus seed, set `RUN_DB_SEED_ON_DEPLOY=1` before you run the deploy command. `SKIP_DB_SEED_ON_DEPLOY=1` always prevents deploy-time seeding.

Automatic stream publishing also needs a scheduler trigger. By default, configure your host or cPanel cron to `POST` to `/api/jobs/scheduled-publishing` with the `x-cron-secret` header set to `CRON_SECRET`. On a single-instance deployment where that is not available, you can set `INTERNAL_SCHEDULER_ENABLED=true` and optionally `INTERNAL_SCHEDULER_INTERVAL_SECONDS=60` so the app self-triggers the same endpoint. Do not enable the internal scheduler alongside an external cron for the same site.

If the database tables already exist and you only want to seed default data:

```bash
npm run cpanel:db:seed
```

If cPanel only lets you run a JavaScript file:

```bash
node scripts/cpanel-db-seed.js
```

This does not create or alter tables. It only runs the baseline data upserts in smaller phases so cPanel hosts are less likely to hit memory pressure.

## 6. Start and verify

Start or restart the app in cPanel. For Passenger-style restarts, update:

```text
tmp/restart.txt
```

Verify:

- The site loads at `https://your-domain.example`.
- The admin login works with `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`.
- cPanel logs show no missing env var, database, migration, or startup errors.
- Enabled provider, OpenAI, Meta, S3, and media settings use production credentials.

If admin login fails, run this from the uploaded cPanel app root:

```bash
npm run cpanel:doctor
```

It checks that the package starts through `app.js`, the required environment variables are present, the database is reachable, migrations are applied, and the seeded admin email/password match the database record.

## Quick troubleshooting

- Database error: check cPanel database name, username, password, host, port, and password URL encoding.
- Password contains `@`, `:`, `/`, or `#`: percent-encode those characters inside `DATABASE_URL` before running the cPanel scripts.
- Failed migration retry: use a new database or drop the partially created tables first. Emptying tables is not enough.
- Missing `DATABASE_URL`: add it to cPanel env vars, `.env.production`, or `.env`.
- Login reports database not ready: run `npm run cpanel:db:deploy`, restart the app, then retry `npm run cpanel:doctor`.
- Older database uses mixed-case Prisma tables: rerun `npm run cpanel:db:deploy` with the latest package to normalize them to the lowercase table convention.
- Seeded admin password mismatch: run `npm run cpanel:db:seed`, restart the app, then sign in with `ADMIN_SEED_EMAIL` and `ADMIN_SEED_PASSWORD`.
- Missing `mariadb` dependency: run cPanel **NPM Install**, then rerun database deploy.
- Startup failure: confirm Node.js 20 or 22, startup file `app.js`, and upload source `dist/cpanel`.
- Redirect fetch errors to `0.0.0.0:3000`: rebuild and upload the latest cPanel package so `app.js` defaults `HOSTNAME` to `127.0.0.1` for Next internal self-fetches, then restart the app.
