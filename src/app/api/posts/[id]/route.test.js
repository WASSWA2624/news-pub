import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("post editor api route", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
    vi.resetModules();
  });

  it("passes the route param into the editor update workflow", async () => {
    const updatePostEditorialRecord = vi.fn().mockResolvedValue({
      post: {
        id: "post_1",
      },
    });

    vi.doMock("@/features/posts", () => ({
      getPostEditorSnapshot: vi.fn(),
      updatePostEditorialRecord,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      ensureAdminApiPermission: vi.fn().mockReturnValue(null),
      requireAdminApiSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/auth/rbac", () => ({
      ADMIN_PERMISSIONS: {
        EDIT_POSTS: "EDIT_POSTS",
      },
      getRequiredPermissionsForPostUpdate: vi.fn().mockReturnValue(["EDIT_POSTS"]),
    }));

    const { PATCH } = await import("./route");
    const response = await PATCH(
      new Request("https://example.com/api/posts/post_1", {
        body: JSON.stringify({
          action: "optimize",
          title: "Updated title",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PATCH",
      }),
      {
        params: Promise.resolve({
          id: "post_1",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        post: {
          id: "post_1",
        },
      },
      success: true,
    });
    expect(updatePostEditorialRecord).toHaveBeenCalledWith(
      {
        action: "optimize",
        post_id: "post_1",
        title: "Updated title",
      },
      {
        actor_id: "admin_1",
      },
    );
  });
});
