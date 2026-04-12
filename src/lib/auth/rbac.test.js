import { describe, expect, it } from "vitest";

import {
  ADMIN_PERMISSIONS,
  getAdminAuthorizationFailure,
  getAdminNavigation,
  getAdminPageAccess,
  getRequiredPermissionForPublishAction,
  getRequiredPermissionsForPostUpdate,
  hasAdminPermission,
} from "./rbac";

describe("RBAC policy", () => {
  it("grants super admins all release 1 permissions and keeps editors restricted", () => {
    expect(hasAdminPermission({ role: "SUPER_ADMIN" }, ADMIN_PERMISSIONS.MANAGE_SETTINGS)).toBe(
      true,
    );
    expect(hasAdminPermission({ role: "SUPER_ADMIN" }, ADMIN_PERMISSIONS.PUBLISH_POSTS)).toBe(
      true,
    );
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.EDIT_POSTS)).toBe(true);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.SCHEDULE_POSTS)).toBe(true);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.PUBLISH_POSTS)).toBe(true);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.MANAGE_PROVIDERS)).toBe(
      false,
    );
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.MANAGE_STREAMS)).toBe(false);
  });

  it("maps admin pages to the correct required permissions", () => {
    expect(getAdminPageAccess("/admin/providers")).toMatchObject({
      permission: ADMIN_PERMISSIONS.MANAGE_PROVIDERS,
    });
    expect(getAdminPageAccess("/admin/posts/example-post")).toMatchObject({
      permission: ADMIN_PERMISSIONS.EDIT_POSTS,
    });
    expect(getAdminPageAccess("/admin/jobs")).toMatchObject({
      permission: ADMIN_PERMISSIONS.VIEW_JOBS,
    });
    expect(getAdminPageAccess("/admin/future-settings")).toMatchObject({
      permission: ADMIN_PERMISSIONS.MANAGE_SETTINGS,
    });
    expect(getAdminPageAccess("/en/news")).toBeNull();
  });

  it("filters admin navigation to the actions each role can see", () => {
    expect(getAdminNavigation({ role: "EDITOR" }).map((item) => item.key)).toEqual([
      "dashboard",
      "review",
      "published",
      "media",
      "jobs",
    ]);

    expect(getAdminNavigation({ role: "SUPER_ADMIN" }).map((item) => item.key)).toEqual([
      "dashboard",
      "providers",
      "destinations",
      "streams",
      "categories",
      "review",
      "published",
      "media",
      "templates",
      "jobs",
      "performance",
      "seo",
      "settings",
    ]);
  });

  it("derives publish and post update permissions from the requested action", () => {
    expect(getRequiredPermissionForPublishAction("2026-04-02T12:00:00.000Z")).toBe(
      ADMIN_PERMISSIONS.SCHEDULE_POSTS,
    );
    expect(getRequiredPermissionForPublishAction(null)).toBe(ADMIN_PERMISSIONS.PUBLISH_POSTS);

    expect(getRequiredPermissionsForPostUpdate({ title: "Updated draft" })).toEqual([
      ADMIN_PERMISSIONS.EDIT_POSTS,
    ]);
    expect(getRequiredPermissionsForPostUpdate({ categoryIds: ["cat_1"], slug: "updated-draft" })).toEqual([
      ADMIN_PERMISSIONS.EDIT_POSTS,
    ]);
    expect(
      getRequiredPermissionsForPostUpdate({
        editorial_stage: "APPROVED",
        status: "PUBLISHED",
      }),
    ).toEqual([ADMIN_PERMISSIONS.EDIT_POSTS, ADMIN_PERMISSIONS.PUBLISH_POSTS]);
    expect(getRequiredPermissionsForPostUpdate({ status: "ARCHIVED" })).toEqual([
      ADMIN_PERMISSIONS.EDIT_POSTS,
    ]);
  });

  it("produces a consistent forbidden payload for blocked actions", () => {
    expect(getAdminAuthorizationFailure(ADMIN_PERMISSIONS.MANAGE_STREAMS, "EDITOR")).toEqual({
      message: "You do not have permission to manage publishing streams.",
      permission: ADMIN_PERMISSIONS.MANAGE_STREAMS,
      role: "EDITOR",
      status: "forbidden",
      success: false,
    });
  });
});
