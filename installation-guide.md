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

Optional local seeded database export:

```bash
npm run db:export:seeded
```

This seeds the local `.env.local` database, then writes `dist/db/news-pub-seeded.sql`. Add `-- --data-only` to export INSERT data without table creation statements.

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

Set these in the cPanel Node.js app environment panel, or in `.env.production.local` in the uploaded app root:

```text
NODE_ENV="production"
DATABASE_URL="mysql://cpaneluser_news_pub_user:encoded_password@localhost:3306/cpaneluser_news_pub?connection_limit=5"
NEXT_PUBLIC_APP_URL="https://your-domain.example"
DEFAULT_LOCALE="en"
SUPPORTED_LOCALES="en"
SESSION_SECRET="replace-with-a-long-random-production-secret"
SESSION_MAX_AGE_SECONDS="28800"
ADMIN_SEED_EMAIL="admin@your-domain.example"
ADMIN_SEED_PASSWORD="replace-with-a-strong-initial-admin-password"
DESTINATION_TOKEN_ENCRYPTION_KEY="replace-with-a-long-random-production-encryption-key"
REVALIDATE_SECRET="replace-with-a-long-random-production-revalidate-secret"
CRON_SECRET="replace-with-a-long-random-production-cron-secret"
MEDIA_DRIVER="local"
LOCAL_MEDIA_BASE_PATH="public/uploads"
LOCAL_MEDIA_BASE_URL="/uploads"
ENABLE_ANALYTICS="true"
ENABLE_METRICS="true"
DEFAULT_SCHEDULE_TIMEZONE="UTC"
INITIAL_BACKFILL_HOURS="24"
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
S3_MEDIA_BUCKET=""
S3_MEDIA_REGION=""
S3_MEDIA_BASE_URL=""
S3_ACCESS_KEY_ID=""
S3_SECRET_ACCESS_KEY=""
```

Keep `DESTINATION_TOKEN_ENCRYPTION_KEY` stable after launch so stored destination tokens remain decryptable.

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

Do not upload local secret files such as `.env.local`.

## 5. Deploy the database

From the uploaded app root on the cPanel server, run:

```bash
npm run cpanel:db:deploy
```

If cPanel only lets you run a JavaScript file:

```bash
node scripts/cpanel-db-deploy.js
```

This applies Prisma migrations and seeds the baseline admin user, locale, categories, providers, destinations, templates, and streams. It is safe to rerun; applied migrations are skipped and seed records are upserted.

If the database tables already exist and you only want to seed default data:

```bash
npm run cpanel:db:seed
```

If cPanel only lets you run a JavaScript file:

```bash
node scripts/cpanel-db-seed.js
```

This does not create or alter tables. It only runs the baseline data upserts.

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

## Quick troubleshooting

- Database error: check cPanel database name, username, password, host, port, and password URL encoding.
- Failed migration retry: use a new database or drop the partially created tables first. Emptying tables is not enough.
- Missing `DATABASE_URL`: add it to cPanel env vars or `.env.production.local`.
- Missing `mariadb` dependency: run cPanel **NPM Install**, then rerun database deploy.
- Startup failure: confirm Node.js 20 or 22, startup file `app.js`, and upload source `dist/cpanel`.
