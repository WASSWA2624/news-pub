import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("destinations api route", () => {
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

  it("normalizes save failures into a consistent admin API response", async () => {
    const saveDestinationRecord = vi.fn().mockRejectedValue({
      message: "Graph API returned 190: Invalid OAuth access token.",
      status: "destination_validation_failed",
      statusCode: 400,
    });

    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));
    vi.doMock("@/features/destinations", () => ({
      getDestinationManagementSnapshot: vi.fn(),
      saveDestinationRecord,
    }));

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://example.com/api/destinations", {
        body: JSON.stringify({
          connectionStatus: "ERROR",
          kind: "FACEBOOK_PAGE",
          name: "Example Facebook Page",
          platform: "FACEBOOK",
          slug: "example-facebook-page",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      details: null,
      message: "Graph API returned 190: Invalid OAuth access token.",
      retryable: false,
      status: "destination_validation_failed",
      success: false,
    });
    expect(saveDestinationRecord).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: "FACEBOOK_PAGE",
        name: "Example Facebook Page",
        platform: "FACEBOOK",
      }),
      {
        actorId: "admin_1",
      },
    );
  });
});
