/**
 * NewsPub RBAC permissions and authorization helpers for admin pages, APIs, and navigation visibility.
 */

export const ADMIN_PERMISSIONS = Object.freeze({
  EDIT_POSTS: "edit_posts",
  MANAGE_CATEGORIES: "manage_categories",
  MANAGE_DESTINATIONS: "manage_destinations",
  MANAGE_MEDIA: "manage_media",
  MANAGE_PROVIDERS: "manage_providers",
  MANAGE_SEO: "manage_seo",
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_STREAMS: "manage_streams",
  MANAGE_TEMPLATES: "manage_templates",
  PUBLISH_POSTS: "publish_posts",
  REVALIDATE_SITE: "revalidate_site",
  SCHEDULE_POSTS: "schedule_posts",
  VIEW_ANALYTICS: "view_analytics",
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_JOBS: "view_jobs",
  VIEW_POST_INVENTORY: "view_post_inventory",
  VIEW_REVIEW_QUEUE: "view_review_queue",
});

const adminPermissionMetadata = Object.freeze({
  [ADMIN_PERMISSIONS.EDIT_POSTS]: Object.freeze({
    action: "edit story content",
    title: "Edit stories",
  }),
  [ADMIN_PERMISSIONS.MANAGE_CATEGORIES]: Object.freeze({
    action: "manage categories",
    title: "Manage categories",
  }),
  [ADMIN_PERMISSIONS.MANAGE_DESTINATIONS]: Object.freeze({
    action: "manage destinations",
    title: "Manage destinations",
  }),
  [ADMIN_PERMISSIONS.MANAGE_MEDIA]: Object.freeze({
    action: "manage media assets",
    title: "Manage media",
  }),
  [ADMIN_PERMISSIONS.MANAGE_PROVIDERS]: Object.freeze({
    action: "manage provider configuration",
    title: "Manage providers",
  }),
  [ADMIN_PERMISSIONS.MANAGE_SEO]: Object.freeze({
    action: "manage SEO settings",
    title: "Manage SEO",
  }),
  [ADMIN_PERMISSIONS.MANAGE_SETTINGS]: Object.freeze({
    action: "manage workspace settings",
    title: "Manage settings",
  }),
  [ADMIN_PERMISSIONS.MANAGE_STREAMS]: Object.freeze({
    action: "manage publishing streams",
    title: "Manage streams",
  }),
  [ADMIN_PERMISSIONS.MANAGE_TEMPLATES]: Object.freeze({
    action: "manage destination templates",
    title: "Manage templates",
  }),
  [ADMIN_PERMISSIONS.PUBLISH_POSTS]: Object.freeze({
    action: "publish stories",
    title: "Publish stories",
  }),
  [ADMIN_PERMISSIONS.REVALIDATE_SITE]: Object.freeze({
    action: "revalidate website content",
    title: "Revalidate website content",
  }),
  [ADMIN_PERMISSIONS.SCHEDULE_POSTS]: Object.freeze({
    action: "schedule stories",
    title: "Schedule stories",
  }),
  [ADMIN_PERMISSIONS.VIEW_ANALYTICS]: Object.freeze({
    action: "view analytics",
    title: "View analytics",
  }),
  [ADMIN_PERMISSIONS.VIEW_DASHBOARD]: Object.freeze({
    action: "view the admin dashboard",
    title: "View dashboard",
  }),
  [ADMIN_PERMISSIONS.VIEW_JOBS]: Object.freeze({
    action: "view job logs",
    title: "View job logs",
  }),
  [ADMIN_PERMISSIONS.VIEW_POST_INVENTORY]: Object.freeze({
    action: "view story inventory",
    title: "View story inventory",
  }),
  [ADMIN_PERMISSIONS.VIEW_REVIEW_QUEUE]: Object.freeze({
    action: "review held stories",
    title: "Review stories",
  }),
});

const allPermissionKeys = Object.values(ADMIN_PERMISSIONS);

const superAdminPermissionMatrix = Object.freeze(
  allPermissionKeys.reduce((permissions, permission) => {
    permissions[permission] = true;
    return permissions;
  }, {}),
);

const editorPermissionMatrix = Object.freeze({
  [ADMIN_PERMISSIONS.EDIT_POSTS]: true,
  [ADMIN_PERMISSIONS.MANAGE_CATEGORIES]: false,
  [ADMIN_PERMISSIONS.MANAGE_DESTINATIONS]: false,
  [ADMIN_PERMISSIONS.MANAGE_MEDIA]: true,
  [ADMIN_PERMISSIONS.MANAGE_PROVIDERS]: false,
  [ADMIN_PERMISSIONS.MANAGE_SEO]: false,
  [ADMIN_PERMISSIONS.MANAGE_SETTINGS]: false,
  [ADMIN_PERMISSIONS.MANAGE_STREAMS]: false,
  [ADMIN_PERMISSIONS.MANAGE_TEMPLATES]: false,
  [ADMIN_PERMISSIONS.PUBLISH_POSTS]: true,
  [ADMIN_PERMISSIONS.REVALIDATE_SITE]: false,
  [ADMIN_PERMISSIONS.SCHEDULE_POSTS]: true,
  [ADMIN_PERMISSIONS.VIEW_ANALYTICS]: false,
  [ADMIN_PERMISSIONS.VIEW_DASHBOARD]: true,
  [ADMIN_PERMISSIONS.VIEW_JOBS]: true,
  [ADMIN_PERMISSIONS.VIEW_POST_INVENTORY]: true,
  [ADMIN_PERMISSIONS.VIEW_REVIEW_QUEUE]: true,
});

export const ADMIN_PERMISSION_MATRIX = Object.freeze({
  EDITOR: editorPermissionMatrix,
  SUPER_ADMIN: superAdminPermissionMatrix,
});

export const ADMIN_ROLE_NAMES = Object.freeze(Object.keys(ADMIN_PERMISSION_MATRIX));

const adminRoleSet = new Set(ADMIN_ROLE_NAMES);

export const ADMIN_NAV_ITEMS = Object.freeze([
  Object.freeze({
    href: "/admin",
    icon: "dashboard",
    key: "dashboard",
    permission: ADMIN_PERMISSIONS.VIEW_DASHBOARD,
  }),
  Object.freeze({
    href: "/admin/providers",
    icon: "providers",
    key: "providers",
    permission: ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
  }),
  Object.freeze({
    href: "/admin/destinations",
    icon: "destinations",
    key: "destinations",
    permission: ADMIN_PERMISSIONS.MANAGE_DESTINATIONS,
  }),
  Object.freeze({
    href: "/admin/streams",
    icon: "streams",
    key: "streams",
    permission: ADMIN_PERMISSIONS.MANAGE_STREAMS,
  }),
  Object.freeze({
    href: "/admin/categories",
    icon: "categories",
    key: "categories",
    permission: ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
  }),
  Object.freeze({
    href: "/admin/posts/review",
    icon: "review",
    key: "review",
    permission: ADMIN_PERMISSIONS.VIEW_REVIEW_QUEUE,
  }),
  Object.freeze({
    href: "/admin/posts/published",
    icon: "published",
    key: "published",
    permission: ADMIN_PERMISSIONS.VIEW_POST_INVENTORY,
  }),
  Object.freeze({
    href: "/admin/media",
    icon: "media",
    key: "media",
    permission: ADMIN_PERMISSIONS.MANAGE_MEDIA,
  }),
  Object.freeze({
    href: "/admin/templates",
    icon: "templates",
    key: "templates",
    permission: ADMIN_PERMISSIONS.MANAGE_TEMPLATES,
  }),
  Object.freeze({
    href: "/admin/jobs",
    icon: "jobs",
    key: "jobs",
    permission: ADMIN_PERMISSIONS.VIEW_JOBS,
  }),
  Object.freeze({
    href: "/admin/performance",
    icon: "activity",
    key: "performance",
    permission: ADMIN_PERMISSIONS.VIEW_ANALYTICS,
  }),
  Object.freeze({
    href: "/admin/seo",
    icon: "seo",
    key: "seo",
    permission: ADMIN_PERMISSIONS.MANAGE_SEO,
  }),
  Object.freeze({
    href: "/admin/settings",
    icon: "settings",
    key: "settings",
    permission: ADMIN_PERMISSIONS.MANAGE_SETTINGS,
  }),
]);

const adminPageRules = Object.freeze([
  Object.freeze({
    label: "Dashboard",
    matches: (pathname) => pathname === "/admin",
    permission: ADMIN_PERMISSIONS.VIEW_DASHBOARD,
  }),
  Object.freeze({
    label: "Providers",
    matches: (pathname) => pathname === "/admin/providers",
    permission: ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
  }),
  Object.freeze({
    label: "Destinations",
    matches: (pathname) => pathname === "/admin/destinations",
    permission: ADMIN_PERMISSIONS.MANAGE_DESTINATIONS,
  }),
  Object.freeze({
    label: "Streams",
    matches: (pathname) => pathname === "/admin/streams",
    permission: ADMIN_PERMISSIONS.MANAGE_STREAMS,
  }),
  Object.freeze({
    label: "Categories",
    matches: (pathname) => pathname === "/admin/categories",
    permission: ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
  }),
  Object.freeze({
    label: "Review Queue",
    matches: (pathname) => pathname === "/admin/posts/review",
    permission: ADMIN_PERMISSIONS.VIEW_REVIEW_QUEUE,
  }),
  Object.freeze({
    label: "Published Stories",
    matches: (pathname) => pathname === "/admin/posts/published",
    permission: ADMIN_PERMISSIONS.VIEW_POST_INVENTORY,
  }),
  Object.freeze({
    label: "Story Editor",
    matches: (pathname) => /^\/admin\/posts\/[^/]+$/.test(pathname),
    permission: ADMIN_PERMISSIONS.EDIT_POSTS,
  }),
  Object.freeze({
    label: "Media",
    matches: (pathname) => pathname === "/admin/media",
    permission: ADMIN_PERMISSIONS.MANAGE_MEDIA,
  }),
  Object.freeze({
    label: "Templates",
    matches: (pathname) => pathname === "/admin/templates",
    permission: ADMIN_PERMISSIONS.MANAGE_TEMPLATES,
  }),
  Object.freeze({
    label: "Jobs",
    matches: (pathname) => pathname === "/admin/jobs",
    permission: ADMIN_PERMISSIONS.VIEW_JOBS,
  }),
  Object.freeze({
    label: "Performance",
    matches: (pathname) => pathname === "/admin/performance",
    permission: ADMIN_PERMISSIONS.VIEW_ANALYTICS,
  }),
  Object.freeze({
    label: "SEO",
    matches: (pathname) => pathname === "/admin/seo",
    permission: ADMIN_PERMISSIONS.MANAGE_SEO,
  }),
  Object.freeze({
    label: "Settings",
    matches: (pathname) => pathname === "/admin/settings",
    permission: ADMIN_PERMISSIONS.MANAGE_SETTINGS,
  }),
]);

const sensitivePostStatusPermissions = Object.freeze({
  PUBLISHED: ADMIN_PERMISSIONS.PUBLISH_POSTS,
  SCHEDULED: ADMIN_PERMISSIONS.SCHEDULE_POSTS,
});

function normalizeAdminPathname(pathname) {
  if (typeof pathname !== "string") {
    return "";
  }

  const normalizedPathname = pathname.split("?")[0]?.replace(/\/+$/, "") || "";

  return normalizedPathname || "/";
}

function resolveRole(userOrRole) {
  if (typeof userOrRole === "string") {
    return userOrRole;
  }

  return userOrRole?.role || null;
}

/**
 * Returns whether a role is a supported NewsPub admin role.
 */
export function isAdminRole(role) {
  return typeof role === "string" && adminRoleSet.has(role);
}

/**
 * Returns whether the supplied user or role has the requested NewsPub admin permission.
 */
export function hasAdminPermission(userOrRole, permission) {
  const role = resolveRole(userOrRole);

  if (!isAdminRole(role)) {
    return false;
  }

  return Boolean(ADMIN_PERMISSION_MATRIX[role]?.[permission]);
}

/**
 * Returns the human-readable title for a NewsPub admin permission.
 */
export function getAdminPermissionTitle(permission) {
  return adminPermissionMetadata[permission]?.title || "Restricted admin action";
}

/**
 * Returns the action-oriented copy used when a NewsPub admin permission is denied.
 */
export function getAdminPermissionAction(permission) {
  return adminPermissionMetadata[permission]?.action || "perform this admin action";
}

/**
 * Builds the standard permission-denied payload for NewsPub admin pages and APIs.
 */
export function getAdminAuthorizationFailure(permission, userOrRole) {
  return {
    message: `You do not have permission to ${getAdminPermissionAction(permission)}.`,
    permission,
    role: resolveRole(userOrRole),
    status: "forbidden",
    success: false,
  };
}

/**
 * Returns the NewsPub admin navigation items visible to the supplied user or role.
 */
export function getAdminNavigation(userOrRole) {
  return ADMIN_NAV_ITEMS.filter((item) => hasAdminPermission(userOrRole, item.permission));
}

/**
 * Returns the required permission metadata for a NewsPub admin route pathname.
 */
export function getAdminPageAccess(pathname) {
  const normalizedPathname = normalizeAdminPathname(pathname);

  if (!normalizedPathname.startsWith("/admin") || normalizedPathname === "/admin/login") {
    return null;
  }

  const matchedPage = adminPageRules.find((rule) => rule.matches(normalizedPathname));

  return {
    label: matchedPage?.label || "Admin settings",
    pathname: normalizedPathname,
    permission: matchedPage?.permission || ADMIN_PERMISSIONS.MANAGE_SETTINGS,
  };
}

/**
 * Returns the publish-related permission required for an immediate or scheduled NewsPub publish action.
 */
export function getRequiredPermissionForPublishAction(publishAt) {
  return publishAt ? ADMIN_PERMISSIONS.SCHEDULE_POSTS : ADMIN_PERMISSIONS.PUBLISH_POSTS;
}

/**
 * Returns the NewsPub post-edit permissions implied by an update payload.
 */
export function getRequiredPermissionsForPostUpdate(payload = {}) {
  const permissions = [];

  if (
    payload.categories !== undefined ||
    payload.editorialStage !== undefined ||
    payload.slug !== undefined ||
    payload.title !== undefined ||
    payload.summary !== undefined ||
    payload.contentHtml !== undefined ||
    payload.contentMd !== undefined ||
    payload.status === "DRAFT"
  ) {
    permissions.push(ADMIN_PERMISSIONS.EDIT_POSTS);
  }

  if (payload.status !== undefined) {
    permissions.push(sensitivePostStatusPermissions[payload.status] || ADMIN_PERMISSIONS.EDIT_POSTS);
  }

  if (!permissions.length) {
    permissions.push(ADMIN_PERMISSIONS.EDIT_POSTS);
  }

  return [...new Set(permissions)];
}
