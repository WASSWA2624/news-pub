import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("templates api route", () => {
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

  it("saves templates with the current admin id", async () => {
    const saveTemplateRecord = vi.fn().mockResolvedValue({
      id: "template_1",
      name: "Website default",
    });

    vi.doMock("@/features/templates", () => ({
      getTemplateManagementSnapshot: vi.fn(),
      saveTemplateRecord,
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { PUT } = await import("./route");
    const response = await PUT(
      new Request("https://example.com/api/templates", {
        body: JSON.stringify({
          body_template: "{{body}}",
          name: "Website default",
          platform: "WEBSITE",
        }),
        headers: {
          "content-type": "application/json",
        },
        method: "PUT",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        id: "template_1",
        name: "Website default",
      },
      success: true,
    });
    expect(saveTemplateRecord).toHaveBeenCalledWith(
      {
        body_template: "{{body}}",
        name: "Website default",
        platform: "WEBSITE",
      },
      {
        actor_id: "admin_1",
      },
    );
  });
});
