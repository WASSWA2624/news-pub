import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("public collection stories api route", () => {
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

  it("returns search pagination data for supported collection views", async () => {
    const searchPublishedPosts = vi.fn().mockResolvedValue({
      items: [{ id: "story_1" }],
      pagination: {
        currentPage: 3,
        hasNextPage: true,
        totalItems: 12,
      },
    });

    vi.doMock("@/features/public-site", () => ({
      getPublishedCategoryPageData: vi.fn(),
      getPublishedNewsIndexData: vi.fn(),
      searchPublishedPosts,
    }));

    const { GET } = await import("./route");
    const response = await GET(
      new Request(
        "https://example.com/api/public/collection-stories?locale=EN&view=search&page=3&q=markets&country=ug",
      ),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        hasMore: true,
        items: [{ id: "story_1" }],
        page: 3,
        totalItems: 12,
      },
      success: true,
    });
    expect(searchPublishedPosts).toHaveBeenCalledWith({
      country: "ug",
      locale: "en",
      page: 3,
      search: "markets",
    });
  });

  it("rejects unsupported collection views", async () => {
    vi.doMock("@/features/public-site", () => ({
      getPublishedCategoryPageData: vi.fn(),
      getPublishedNewsIndexData: vi.fn(),
      searchPublishedPosts: vi.fn(),
    }));

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/api/public/collection-stories?view=unsupported"),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual({
      message: "Unsupported collection view.",
      success: false,
    });
  });
});
