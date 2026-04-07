````markdown
# Facebook Page Posting Failure Report

## Summary

The codebase is unable to post to the Facebook page because the app generates article URLs using a `localhost` base URL, and the Facebook publisher explicitly blocks non-public URLs before making any request to Facebook.

## Primary Failure Cause

### 1. Non-public `localhost` URL is being used
The environment is configured with:

```env
NEXT_PUBLIC_APP_URL=http://localhost:3000
````

Because of this:

* canonical story URLs are generated from `http://localhost:3000`
* the Facebook publisher validates the URL before publishing
* `localhost`, private IPs, `.local`, and other non-public URLs are rejected
* publishing stops before any Facebook Graph API request is made

### Relevant files

* `.env.local:2`
* `src/lib/news/workflows.js:30-31`
* `src/lib/news/publishers.js:91-154`
* `src/lib/news/publishers.js:351-353`
* `src/lib/news/publishers.test.js:273-319`

## Additional Blocking Conditions

### 2. Facebook destination may not be connected

Publishing will fail early if the destination:

* is not marked as `CONNECTED`
* does not have a stored page token
* does not have a stored Facebook page/account ID

### Relevant files

* `src/lib/news/workflows.js:691-705`
* `src/lib/news/destination-runtime.js:37-70`

---

### 3. `META_USER_ACCESS_TOKEN` is not the actual publish token

The environment token is only used to discover Facebook pages/accounts.

Actual publishing requires the selected page’s access token to be saved in the destination configuration.

### Relevant files

* `.env.local:16-18`
* `src/features/destinations/meta-config.js:97-112`
* `src/features/destinations/index.js:112-150`
* `src/features/destinations/meta-config.js:652-676`

---

### 4. Seeded Facebook destination is disconnected

If the app is using seeded data, the default Facebook destination starts as:

* `DISCONNECTED`

### Relevant file

* `prisma/seed.js:89-99`

---

### 5. Seeded Facebook stream requires review

If the app is using seeded stream data, Facebook publishing is configured as:

* `REVIEW_REQUIRED`

This means posts are queued for review instead of being auto-published.

### Relevant file

* `prisma/seed.js:178-205`

---

### 6. Facebook page permissions/tasks may be insufficient

The page discovery logic only accepts pages with required Meta tasks such as:

* `CREATE_CONTENT`
* `MANAGE`
* `MODERATE`

If the connected page does not meet these requirements, publishing setup may fail.

### Relevant files

* `src/features/destinations/meta-config.js:31-32`
* `src/features/destinations/meta-config.js:245-255`

## Most Likely Failure Chain

1. `NEXT_PUBLIC_APP_URL` is set to `http://localhost:3000`
2. Generated story URLs point to `localhost`
3. Publisher rejects the URL as non-public
4. Facebook posting is aborted before the API call

## Recommended Fixes

### Required fix

Set `NEXT_PUBLIC_APP_URL` to a public HTTPS domain, for example:

```env
NEXT_PUBLIC_APP_URL=https://yourdomain.com
```

### Also verify

* reconnect the Facebook page in the admin panel
* ensure the destination stores the correct page access token
* ensure the destination status is `CONNECTED`
* change the stream mode to `AUTO_PUBLISH` if automatic posting is expected
* confirm the Facebook page has the required Meta tasks/permissions

## Security Note

The uploaded `.env.local` contains real-looking secrets, including a Meta token.

That token should be treated as exposed and rotated immediately.

```
```
