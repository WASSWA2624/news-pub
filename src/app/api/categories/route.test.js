import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("categories api route", () => {
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

  it("loads the category management snapshot", async () => {
    const getCategoryManagementSnapshot = vi.fn().mockResolvedValue({
      categories: [{ id: "category_1" }],
    });

    vi.doMock("@/features/categories", () => ({
      deleteCategoryRecord: vi.fn(),
      getCategoryManagementSnapshot,
      saveCategoryRecord: vi.fn(),
    }));
    vi.doMock("@/lib/auth/api", () => ({
      requireAdminApiPermission: vi.fn().mockResolvedValue({
        user: {
          id: "admin_1",
        },
      }),
    }));

    const { GET } = await import("./route");
    const response = await GET(new Request("https://example.com/api/categories"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        categories: [{ id: "category_1" }],
      },
      success: true,
    });
  });

  it("saves categories with the current admin id", async () => {
    const saveCategoryRecord = vi.fn().mockResolvedValue({
      id: "category_1",
      name: "Business",
    });

    vi.doMock("@/features/categories", () => ({
      deleteCategoryRecord: vi.fn(),
      getCategoryManagementSnapshot: vi.fn(),
      saveCategoryRecord,
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
      new Request("https://example.com/api/categories", {
        body: JSON.stringify({
          name: "Business",
          slug: "business",
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
        id: "category_1",
        name: "Business",
      },
      success: true,
    });
    expect(saveCategoryRecord).toHaveBeenCalledWith(
      {
        name: "Business",
        slug: "business",
      },
      {
        actorId: "admin_1",
      },
    );
  });
});
