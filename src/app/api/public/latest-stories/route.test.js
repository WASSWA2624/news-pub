import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("public latest stories api route", () => {
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

  it("normalizes locale and pagination inputs before fetching more home stories", async () => {
    const getPublishedHomeLatestStoriesData = vi.fn().mockResolvedValue({
      items: [{ id: "story_1" }],
      pagination: {
        currentPage: 2,
      },
    });

    vi.doMock("@/features/public-site", () => ({
      getPublishedHomeLatestStoriesData,
    }));

    const { GET } = await import("./route");
    const response = await GET(
      new Request("https://example.com/api/public/latest-stories?locale=EN&skip=abc&take=999"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      data: {
        items: [{ id: "story_1" }],
        pagination: {
          currentPage: 2,
        },
      },
      success: true,
    });
    expect(getPublishedHomeLatestStoriesData).toHaveBeenCalledWith({
      locale: "en",
      skip: 1,
      take: 5,
    });
  });
});
