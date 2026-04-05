export const ADMIN_HOME_PATH = "/admin";
export const ADMIN_LOGIN_PATH = "/admin/login";
export const ADMIN_REDIRECT_PARAM = "next";
export const SESSION_COOKIE_NAME = "equip_admin_session";
export const ADMIN_ROUTE_KIND_HEADER = "x-admin-route-kind";
export const ADMIN_REQUEST_PATH_HEADER = "x-admin-request-path";

const protectedAdminApiPrefixes = [
  "/api/comments/",
  "/api/posts/",
];

const protectedAdminApiPaths = new Set([
  "/api/auth/logout",
  "/api/categories",
  "/api/generate-post",
  "/api/jobs",
  "/api/localization",
  "/api/manufacturers",
  "/api/media",
  "/api/metrics",
  "/api/models",
  "/api/posts",
  "/api/publish-post",
  "/api/revalidate",
  "/api/save-draft",
]);

export function isAdminLoginPath(pathname) {
  return pathname === ADMIN_LOGIN_PATH;
}

export function isProtectedAdminPagePath(pathname) {
  return pathname.startsWith("/admin") && !isAdminLoginPath(pathname);
}

export function isProtectedAdminApiPath(pathname) {
  if (protectedAdminApiPaths.has(pathname)) {
    return true;
  }

  if (pathname.startsWith("/api/posts/slug/")) {
    return false;
  }

  return protectedAdminApiPrefixes.some((prefix) => pathname.startsWith(prefix));
}

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

export function buildAdminLoginHref(nextPath = ADMIN_HOME_PATH) {
  const url = new URL(ADMIN_LOGIN_PATH, "https://equip-blog.local");

  url.searchParams.set(ADMIN_REDIRECT_PARAM, normalizeAdminRedirectTarget(nextPath));

  return `${url.pathname}${url.search}`;
}
