const release1EditorPolicy = Object.freeze({
  canModerateComments: false,
  canPublishPosts: false,
});

export const RELEASE_1_EDITOR_POLICY = release1EditorPolicy;

export const ADMIN_PERMISSIONS = Object.freeze({
  ARCHIVE_POSTS: "archive_posts",
  EDIT_POSTS: "edit_posts",
  GENERATE_POSTS: "generate_posts",
  MANAGE_CATEGORIES: "manage_categories",
  MANAGE_LOCALIZATION: "manage_localization",
  MANAGE_MANUFACTURERS: "manage_manufacturers",
  MANAGE_PROMPTS: "manage_prompts",
  MANAGE_PROVIDER_CONFIG: "manage_provider_config",
  MANAGE_SEO: "manage_seo",
  MANAGE_SETTINGS: "manage_settings",
  MANAGE_SOURCE_CONFIG: "manage_source_config",
  MODERATE_COMMENTS: "moderate_comments",
  PUBLISH_POSTS: "publish_posts",
  REVALIDATE_SITE: "revalidate_site",
  SCHEDULE_POSTS: "schedule_posts",
  UPLOAD_MEDIA: "upload_media",
  VIEW_ANALYTICS: "view_analytics",
  VIEW_CONTENT_LISTS: "view_content_lists",
  VIEW_DASHBOARD: "view_dashboard",
  VIEW_JOBS: "view_jobs",
});

const adminPermissionMetadata = Object.freeze({
  [ADMIN_PERMISSIONS.ARCHIVE_POSTS]: Object.freeze({
    action: "archive posts",
    title: "Archive posts",
  }),
  [ADMIN_PERMISSIONS.EDIT_POSTS]: Object.freeze({
    action: "edit draft content",
    title: "Edit drafts",
  }),
  [ADMIN_PERMISSIONS.GENERATE_POSTS]: Object.freeze({
    action: "generate new drafts",
    title: "Generate drafts",
  }),
  [ADMIN_PERMISSIONS.MANAGE_CATEGORIES]: Object.freeze({
    action: "manage categories",
    title: "Manage categories",
  }),
  [ADMIN_PERMISSIONS.MANAGE_LOCALIZATION]: Object.freeze({
    action: "manage localization settings",
    title: "Manage localization",
  }),
  [ADMIN_PERMISSIONS.MANAGE_MANUFACTURERS]: Object.freeze({
    action: "manage manufacturers",
    title: "Manage manufacturers",
  }),
  [ADMIN_PERMISSIONS.MANAGE_PROMPTS]: Object.freeze({
    action: "manage prompt templates",
    title: "Manage prompts",
  }),
  [ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG]: Object.freeze({
    action: "manage provider configuration",
    title: "Manage provider configuration",
  }),
  [ADMIN_PERMISSIONS.MANAGE_SEO]: Object.freeze({
    action: "manage SEO settings",
    title: "Manage SEO",
  }),
  [ADMIN_PERMISSIONS.MANAGE_SETTINGS]: Object.freeze({
    action: "manage protected admin settings",
    title: "Manage admin settings",
  }),
  [ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG]: Object.freeze({
    action: "manage source configuration",
    title: "Manage sources",
  }),
  [ADMIN_PERMISSIONS.MODERATE_COMMENTS]: Object.freeze({
    action: "moderate comments",
    title: "Moderate comments",
  }),
  [ADMIN_PERMISSIONS.PUBLISH_POSTS]: Object.freeze({
    action: "publish posts",
    title: "Publish posts",
  }),
  [ADMIN_PERMISSIONS.REVALIDATE_SITE]: Object.freeze({
    action: "revalidate published content",
    title: "Revalidate content",
  }),
  [ADMIN_PERMISSIONS.SCHEDULE_POSTS]: Object.freeze({
    action: "schedule posts",
    title: "Schedule posts",
  }),
  [ADMIN_PERMISSIONS.UPLOAD_MEDIA]: Object.freeze({
    action: "upload media",
    title: "Upload media",
  }),
  [ADMIN_PERMISSIONS.VIEW_ANALYTICS]: Object.freeze({
    action: "view analytics",
    title: "View analytics",
  }),
  [ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS]: Object.freeze({
    action: "view content lists",
    title: "View content lists",
  }),
  [ADMIN_PERMISSIONS.VIEW_DASHBOARD]: Object.freeze({
    action: "view the admin dashboard",
    title: "View dashboard",
  }),
  [ADMIN_PERMISSIONS.VIEW_JOBS]: Object.freeze({
    action: "view job and generation logs",
    title: "View job logs",
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
  [ADMIN_PERMISSIONS.ARCHIVE_POSTS]: false,
  [ADMIN_PERMISSIONS.EDIT_POSTS]: true,
  [ADMIN_PERMISSIONS.GENERATE_POSTS]: true,
  [ADMIN_PERMISSIONS.MANAGE_CATEGORIES]: false,
  [ADMIN_PERMISSIONS.MANAGE_LOCALIZATION]: false,
  [ADMIN_PERMISSIONS.MANAGE_MANUFACTURERS]: false,
  [ADMIN_PERMISSIONS.MANAGE_PROMPTS]: false,
  [ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG]: false,
  [ADMIN_PERMISSIONS.MANAGE_SEO]: false,
  [ADMIN_PERMISSIONS.MANAGE_SETTINGS]: false,
  [ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG]: false,
  [ADMIN_PERMISSIONS.MODERATE_COMMENTS]: release1EditorPolicy.canModerateComments,
  [ADMIN_PERMISSIONS.PUBLISH_POSTS]: release1EditorPolicy.canPublishPosts,
  [ADMIN_PERMISSIONS.REVALIDATE_SITE]: false,
  [ADMIN_PERMISSIONS.SCHEDULE_POSTS]: true,
  [ADMIN_PERMISSIONS.UPLOAD_MEDIA]: true,
  [ADMIN_PERMISSIONS.VIEW_ANALYTICS]: false,
  [ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS]: true,
  [ADMIN_PERMISSIONS.VIEW_DASHBOARD]: true,
  [ADMIN_PERMISSIONS.VIEW_JOBS]: true,
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
    key: "dashboard",
    permission: ADMIN_PERMISSIONS.VIEW_DASHBOARD,
  }),
  Object.freeze({
    href: "/admin/generate",
    key: "generate",
    permission: ADMIN_PERMISSIONS.GENERATE_POSTS,
  }),
  Object.freeze({
    href: "/admin/posts/drafts",
    key: "drafts",
    permission: ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS,
  }),
  Object.freeze({
    href: "/admin/posts/published",
    key: "published",
    permission: ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS,
  }),
  Object.freeze({
    href: "/admin/comments",
    key: "comments",
    permission: ADMIN_PERMISSIONS.MODERATE_COMMENTS,
  }),
  Object.freeze({
    href: "/admin/media",
    key: "media",
    permission: ADMIN_PERMISSIONS.UPLOAD_MEDIA,
  }),
  Object.freeze({
    href: "/admin/jobs",
    key: "jobs",
    permission: ADMIN_PERMISSIONS.VIEW_JOBS,
  }),
  Object.freeze({
    href: "/admin/categories",
    key: "categories",
    permission: ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
  }),
  Object.freeze({
    href: "/admin/manufacturers",
    key: "manufacturers",
    permission: ADMIN_PERMISSIONS.MANAGE_MANUFACTURERS,
  }),
  Object.freeze({
    href: "/admin/prompts",
    key: "prompts",
    permission: ADMIN_PERMISSIONS.MANAGE_PROMPTS,
  }),
  Object.freeze({
    href: "/admin/providers",
    key: "providers",
    permission: ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG,
  }),
  Object.freeze({
    href: "/admin/sources",
    key: "sources",
    permission: ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG,
  }),
  Object.freeze({
    href: "/admin/localization",
    key: "localization",
    permission: ADMIN_PERMISSIONS.MANAGE_LOCALIZATION,
  }),
  Object.freeze({
    href: "/admin/seo",
    key: "seo",
    permission: ADMIN_PERMISSIONS.MANAGE_SEO,
  }),
]);

const adminPageRules = Object.freeze([
  Object.freeze({
    label: "Dashboard",
    matches: (pathname) => pathname === "/admin",
    permission: ADMIN_PERMISSIONS.VIEW_DASHBOARD,
  }),
  Object.freeze({
    label: "Generate",
    matches: (pathname) => pathname === "/admin/generate",
    permission: ADMIN_PERMISSIONS.GENERATE_POSTS,
  }),
  Object.freeze({
    label: "Draft posts",
    matches: (pathname) => pathname === "/admin/posts/drafts",
    permission: ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS,
  }),
  Object.freeze({
    label: "Published posts",
    matches: (pathname) => pathname === "/admin/posts/published",
    permission: ADMIN_PERMISSIONS.VIEW_CONTENT_LISTS,
  }),
  Object.freeze({
    label: "Post editor",
    matches: (pathname) => /^\/admin\/posts\/[^/]+$/.test(pathname),
    permission: ADMIN_PERMISSIONS.EDIT_POSTS,
  }),
  Object.freeze({
    label: "Comments moderation",
    matches: (pathname) => pathname === "/admin/comments",
    permission: ADMIN_PERMISSIONS.MODERATE_COMMENTS,
  }),
  Object.freeze({
    label: "Media library",
    matches: (pathname) => pathname === "/admin/media",
    permission: ADMIN_PERMISSIONS.UPLOAD_MEDIA,
  }),
  Object.freeze({
    label: "Job logs",
    matches: (pathname) => pathname === "/admin/jobs",
    permission: ADMIN_PERMISSIONS.VIEW_JOBS,
  }),
  Object.freeze({
    label: "Categories",
    matches: (pathname) => pathname === "/admin/categories",
    permission: ADMIN_PERMISSIONS.MANAGE_CATEGORIES,
  }),
  Object.freeze({
    label: "Manufacturers",
    matches: (pathname) => pathname === "/admin/manufacturers",
    permission: ADMIN_PERMISSIONS.MANAGE_MANUFACTURERS,
  }),
  Object.freeze({
    label: "Prompts",
    matches: (pathname) => pathname === "/admin/prompts",
    permission: ADMIN_PERMISSIONS.MANAGE_PROMPTS,
  }),
  Object.freeze({
    label: "Providers",
    matches: (pathname) => pathname === "/admin/providers",
    permission: ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG,
  }),
  Object.freeze({
    label: "Sources",
    matches: (pathname) => pathname === "/admin/sources",
    permission: ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG,
  }),
  Object.freeze({
    label: "Localization",
    matches: (pathname) => pathname === "/admin/localization",
    permission: ADMIN_PERMISSIONS.MANAGE_LOCALIZATION,
  }),
  Object.freeze({
    label: "SEO",
    matches: (pathname) => pathname === "/admin/seo",
    permission: ADMIN_PERMISSIONS.MANAGE_SEO,
  }),
]);

const sensitivePostStatusPermissions = Object.freeze({
  ARCHIVED: ADMIN_PERMISSIONS.ARCHIVE_POSTS,
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

export function isAdminRole(role) {
  return typeof role === "string" && adminRoleSet.has(role);
}

export function hasAdminPermission(userOrRole, permission) {
  const role = resolveRole(userOrRole);

  if (!isAdminRole(role)) {
    return false;
  }

  return Boolean(ADMIN_PERMISSION_MATRIX[role]?.[permission]);
}

export function getAdminPermissionTitle(permission) {
  return adminPermissionMetadata[permission]?.title || "Restricted admin action";
}

export function getAdminPermissionAction(permission) {
  return adminPermissionMetadata[permission]?.action || "perform this admin action";
}

export function getAdminAuthorizationFailure(permission, userOrRole) {
  return {
    message: `You do not have permission to ${getAdminPermissionAction(permission)}.`,
    permission,
    role: resolveRole(userOrRole),
    status: "forbidden",
    success: false,
  };
}

export function getAdminNavigation(userOrRole) {
  return ADMIN_NAV_ITEMS.filter((item) => hasAdminPermission(userOrRole, item.permission));
}

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

export function getRequiredPermissionForPublishAction(publishAt) {
  return publishAt ? ADMIN_PERMISSIONS.SCHEDULE_POSTS : ADMIN_PERMISSIONS.PUBLISH_POSTS;
}

export function getRequiredPermissionsForPostUpdate(payload = {}) {
  const permissions = [];

  if (
    payload.categoryIds !== undefined ||
    payload.editorialStage !== undefined ||
    payload.slug !== undefined ||
    payload.title !== undefined
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
