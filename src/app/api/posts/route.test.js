import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("posts api route", () => {
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

  it("creates a manual story and reloads the editor snapshot", async () => {
    const createManualPostRecord = vi.fn().mockResolvedValue({
      locale: "en",
      post_id: "post_1",
    });
    const getPostEditorSnapshot = vi.fn().mockResolvedValue({
      post: {
        id: "post_1",
      },
    });

    vi.doMock("@/features/posts", () => ({
      createManualPostRecord,
      getPostEditorSnapshot,
      getPostInventorySnapshot: vi.fn(),
    }));
    vi.doMock("@/lib/auth/api", () => ({
      ensureAdminApiPermission: vi.fn().mockReturnValue(null),
      requireAdminApiPermission: vi.fn(),
      requireAdminApiSession: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/lib/auth/rbac", () => ({
      ADMIN_PERMISSIONS: {
        VIEW_POST_INVENTORY: "VIEW_POST_INVENTORY",
      },
      getRequiredPermissionsForPostUpdate: vi.fn().mockReturnValue(["EDIT_POSTS", "PUBLISH_POSTS"]),
    }));

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/posts", {
        body: JSON.stringify({
          action: "publish",
          content_md: "Story body",
          source_name: "NewsPub Editorial",
          source_url: "https://example.com/source-story",
          stream_id: "stream_1",
          summary: "Story summary",
          title: "Story title",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      data: {
        post: {
          id: "post_1",
        },
      },
      success: true,
    });
    expect(createManualPostRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        action: "publish",
        status: "PUBLISHED",
        stream_id: "stream_1",
      }),
      {
        actor_id: "admin_1",
      },
    );
    expect(getPostEditorSnapshot).toHaveBeenCalledWith({
      locale: "en",
      post_id: "post_1",
    });
  });
});
