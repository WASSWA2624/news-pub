# Permanently fix Facebook publish failures caused by expired access tokens

You are working on the `news-pub` codebase.

## Goal

Implement a permanent fix so Facebook Page publishing does **not fail because a previously stored access token expired**.

Be honest in the implementation:

- We can eliminate failures caused by **routine token expiry**.
- We cannot guarantee success for unrelated cases like revoked permissions, removed Page access, app misconfiguration, or Meta outages.

## Current problem in this codebase

Right now the app persists a selected Meta token on the destination and later publishes with that stored token.

The relevant flow is:

- `src/features/destinations/meta-config.js`
- `src/features/destinations/index.js`
- `src/lib/news/destination-runtime.js`
- `src/lib/news/publishers.js`
- `src/components/admin/destination-form-card.js`

Today:

1. Meta discovery uses `META_USER_ACCESS_TOKEN`.
2. Destination save persists the selected token into `Destination.encryptedToken`*.
3. Runtime prefers the stored token.
4. Facebook publishing uses that token directly.
5. If Meta returns OAuth/token expiry error code 190, publish fails with no automatic credential re-resolution and no retry.

That design is wrong for long-running automated publishing.

## What to change

### 1) Introduce a proper Meta auth strategy

Add a clear runtime auth strategy for Facebook publishing.

Preferred order:

1. **System-user token strategy** for automated Facebook Page publishing.
2. **Refreshable long-lived user token strategy** if system-user token is not configured.
3. **Legacy stored destination token strategy** only as backward-compatible fallback, not as the primary long-term solution.

Add env support for:

- `META_APP_ID`
- `META_APP_SECRET`
- `META_SYSTEM_USER_ACCESS_TOKEN`
- keep supporting `META_USER_ACCESS_TOKEN`

Update:

- `.env.example`
- `src/lib/env/runtime.js`
- `src/lib/env/runtime.test.js`
- `src/test/test-env.js`

### 2) Stop treating stored Page tokens as durable source of truth

For Facebook Page destinations, do **not** rely on `Destination.encryptedToken`* as the long-term publish credential.

Instead:

- persist stable identity/config only:
  - page ID
  - external account ID
  - discovery source key
  - handle/name
  - graph base URL
  - auth strategy metadata
- treat any stored page token as a **cache or legacy fallback**, not the primary source

Update destination save logic in:

- `src/features/destinations/index.js`
- `src/features/destinations/meta-config.js`

Also update admin copy in:

- `src/components/admin/destination-form-card.js`

Replace messaging like:

- “stores the selected token”
with messaging like:
- “stores the selected page/account identity and resolves a fresh valid publish credential at runtime”

### 3) Add runtime credential resolution before every Facebook publish

Create a dedicated helper, for example:

- `src/lib/news/meta-credentials.js`

It should expose something like:

- `resolveFacebookPublishCredential(destination, prisma?)`
- `refreshFacebookPublishCredential(destination, prisma?)`
- `isMetaTokenExpiredError(error)`
- `persistResolvedMetaCredential(...)`

Behavior:

- For `FACEBOOK_PAGE`, before publishing, resolve a usable credential dynamically.
- If `META_SYSTEM_USER_ACCESS_TOKEN` exists, prefer it.
- Otherwise use the configured long-lived user token source and fetch a fresh Page access token from discovery.
- If a cached/stored token exists, validate it before use or treat it as low-priority fallback.
- Persist non-secret metadata such as:
  - auth strategy
  - last validated at
  - token expires at, if known
  - source key
- Never log raw tokens.

### 4) Auto-refresh and retry on Meta auth expiry

In `src/lib/news/publishers.js`:

- Detect Meta OAuth expiry/invalid token errors explicitly, especially Graph error code `190`.
- When code `190` happens during:
  - destination verification, or
  - the actual `/feed` or `/photos` publish call
- do this flow:
  1. re-resolve credentials from the active source
  2. persist refreshed credential metadata if needed
  3. retry the publish **once**
- Never retry infinitely.

Important:

- If refresh/re-resolution succeeds, the publish attempt should complete successfully.
- If refresh is impossible, fail with a precise actionable error:
  - `destination_token_expired_reconnect_required`
  - `destination_token_revoked`
  - `destination_page_permission_missing`
  - etc.

### 5) Add explicit token lifecycle metadata

Add durable metadata so the app knows the credential state.

Use either new columns or structured `settingsJson`, but prefer explicit fields if it keeps the code cleaner.

Track at least:

- `metaAuthStrategy`
- `metaCredentialSourceKey`
- `metaTokenExpiresAt`
- `metaTokenLastValidatedAt`
- `metaLastRefreshAttemptAt`
- `metaLastRefreshError`

Migration must be backward-compatible with existing destinations.

### 6) Make `destination-runtime` resolve fresh credentials

Refactor:

- `src/lib/news/destination-runtime.js`

So it no longer simply does:

- stored token first
- env user token fallback

Instead it should:

- resolve credential by strategy
- prefer runtime-resolved valid credential
- mark whether the credential is:
  - system-user
  - refreshed-user-derived
  - legacy stored token fallback

### 7) Preserve existing behavior where possible

Do not break:

- Instagram publishing
- website publishing
- existing Facebook destinations already in the database

Migration expectations:

- Existing destinations should still work.
- If they currently only have a stale stored token but a valid system-user or valid discovery source exists, the publish path should auto-heal.

### 8) Add focused tests

Update/add tests in:

- `src/lib/news/publishers.test.js`
- `src/lib/news/destination-runtime.test.js`
- `src/features/destinations/index.test.js`
- `src/features/destinations/meta-config.test.js`
- env tests as needed

Add tests for:

1. Facebook publish succeeds with `META_SYSTEM_USER_ACCESS_TOKEN` and no stored destination token.
2. Stored token is expired, Graph returns code `190`, runtime re-resolves a fresh credential, retries once, and succeeds.
3. Verify step fails with code `190`, credential refresh occurs, publish then succeeds.
4. Legacy stored token still works when valid.
5. No secrets/tokens are written to logs or returned in admin payloads.
6. If refresh is impossible, the failure is precise and actionable, not generic.

### 9) Update discovery and save behavior

In Meta discovery/save:

- Continue discovering Pages/accounts from configured Meta source(s).
- Persist the selected Page/account identity.
- Only persist a destination token when the user explicitly chooses a manual override.
- When a system-user strategy is active, do not persist per-destination Page tokens by default.

### 10) Acceptance criteria

The implementation is complete only when all of the following are true:

- A Facebook Page destination can publish successfully even if its old stored token has expired, provided a valid system-user token or valid refreshable Meta credential source exists.
- Publish flow retries once automatically after resolving fresh credentials.
- Routine token expiry no longer breaks scheduled publishing.
- Existing destinations remain usable after migration.
- Tokens are never logged.
- Error messages clearly distinguish:
  - expired token
  - revoked/invalid token
  - missing Page permission
  - missing destination account ID
  - misconfigured Meta env

## Important implementation notes

- Keep changes small, clean, and production-ready.
- Prefer extracting a Meta credential service/helper rather than spreading token logic across publishers and destination save code.
- Do not hack around this by only telling the admin to paste a new token manually.
- Do not solve this by blindly swallowing code `190`.
- Do not keep “stored page token forever” as the primary model.

## Deliverables

1. Implement the fix.
2. Add/adjust migrations if needed.
3. Update tests.
4. At the end, provide a concise summary of:
  - files changed
  - auth strategy used
  - migration impact
  - how expired-token auto-recovery now works

