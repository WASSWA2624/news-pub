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
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.GENERATE_POSTS)).toBe(true);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.EDIT_POSTS)).toBe(true);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.SCHEDULE_POSTS)).toBe(true);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.PUBLISH_POSTS)).toBe(false);
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.MODERATE_COMMENTS)).toBe(
      false,
    );
    expect(hasAdminPermission({ role: "EDITOR" }, ADMIN_PERMISSIONS.MANAGE_PROMPTS)).toBe(false);
  });

  it("maps admin pages to the correct required permissions", () => {
    expect(getAdminPageAccess("/admin/prompts")).toMatchObject({
      permission: ADMIN_PERMISSIONS.MANAGE_PROMPTS,
    });
    expect(getAdminPageAccess("/admin/providers")).toMatchObject({
      permission: ADMIN_PERMISSIONS.MANAGE_PROVIDER_CONFIG,
    });
    expect(getAdminPageAccess("/admin/posts/example-post")).toMatchObject({
      permission: ADMIN_PERMISSIONS.EDIT_POSTS,
    });
    expect(getAdminPageAccess("/admin/comments")).toMatchObject({
      permission: ADMIN_PERMISSIONS.MODERATE_COMMENTS,
    });
    expect(getAdminPageAccess("/admin/future-settings")).toMatchObject({
      permission: ADMIN_PERMISSIONS.MANAGE_SETTINGS,
    });
    expect(getAdminPageAccess("/en/blog")).toBeNull();
  });

  it("filters admin navigation to the actions each role can see", () => {
    expect(getAdminNavigation({ role: "EDITOR" }).map((item) => item.key)).toEqual([
      "dashboard",
      "generate",
      "drafts",
      "published",
      "media",
      "jobs",
    ]);

    expect(getAdminNavigation({ role: "SUPER_ADMIN" }).map((item) => item.key)).toEqual([
      "dashboard",
      "generate",
      "drafts",
      "published",
      "comments",
      "media",
      "jobs",
      "categories",
      "manufacturers",
      "prompts",
      "providers",
      "sources",
      "localization",
      "seo",
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
        editorialStage: "APPROVED",
        status: "PUBLISHED",
      }),
    ).toEqual([ADMIN_PERMISSIONS.EDIT_POSTS, ADMIN_PERMISSIONS.PUBLISH_POSTS]);
    expect(getRequiredPermissionsForPostUpdate({ status: "ARCHIVED" })).toEqual([
      ADMIN_PERMISSIONS.ARCHIVE_POSTS,
    ]);
  });

  it("produces a consistent forbidden payload for blocked actions", () => {
    expect(getAdminAuthorizationFailure(ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG, "EDITOR")).toEqual(
      {
        message: "You do not have permission to manage source configuration.",
        permission: ADMIN_PERMISSIONS.MANAGE_SOURCE_CONFIG,
        role: "EDITOR",
        status: "forbidden",
        success: false,
      },
    );
  });
});
