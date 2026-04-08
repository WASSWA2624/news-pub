/**
 * Route and cookie configuration for NewsPub admin authentication and redirect handling.
 */

export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_REDIRECT_PARAM = "next";
export const SESSION_COOKIE_NAME = "news_pub_admin_session";
export const ADMIN_ROUTE_KIND_HEADER = "x-admin-route-kind";
export const ADMIN_REQUEST_PATH_HEADER = "x-admin-request-path";

const protectedAdminApiPrefixes = [
  "/api/destinations/",
  "/api/jobs/",
  "/api/posts/",
  "/api/providers/",
  "/api/streams/",
  "/api/templates/",
];

const protectedAdminApiPaths = new Set([
  "/api/auth/logout",
  "/api/categories",
  "/api/destinations",
  "/api/jobs",
  "/api/media",
  "/api/metrics",
  "/api/posts",
  "/api/providers",
  "/api/revalidate",
  "/api/seo",
  "/api/settings",
  "/api/streams",
  "/api/templates",
]);

const publicAdminApiPrefixes = [
  "/api/posts/slug/",
];

const publicAdminApiPaths = new Set([
  "/api/analytics/views",
]);

/**
 * Returns whether a pathname targets the NewsPub admin login route.
 */
export function isAdminLoginPath(pathname) {
  return pathname === ADMIN_LOGIN_PATH;
}

/**
 * Returns whether a pathname belongs to a protected NewsPub admin page.
 */
export function isProtectedAdminPagePath(pathname) {
  return pathname.startsWith("/admin") && !isAdminLoginPath(pathname);
}

/**
 * Returns whether a pathname belongs to a protected NewsPub admin API route.
 */
export function isProtectedAdminApiPath(pathname) {
  if (publicAdminApiPaths.has(pathname) || publicAdminApiPrefixes.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }

  if (protectedAdminApiPaths.has(pathname)) {
    return true;
  }

  return protectedAdminApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

/**
 * Normalizes a requested redirect target to a safe internal NewsPub admin path.
 */
export function normalizeAdminRedirectTarget(value) {
  if (typeof value !== "string") {
    return ADMIN_HOME_PATH;
  }

  const trimmedValue = value.trim();

  if (!trimmedValue.startsWith("/admin") || trimmedValue.startsWith("//")) {
    return ADMIN_HOME_PATH;
  }

  if (trimmedValue === ADMIN_LOGIN_PATH) {
    return ADMIN_HOME_PATH;
  }

  return trimmedValue;
}

/**
 * Builds the NewsPub admin login URL with a sanitized next-path redirect.
 */
export function buildAdminLoginHref(nextPath = ADMIN_HOME_PATH) {
  const url = new URL(ADMIN_LOGIN_PATH, "https://news-pub.local");

  url.searchParams.set(ADMIN_REDIRECT_PARAM, normalizeAdminRedirectTarget(nextPath));

  return `${url.pathname}${url.search}`;
}
