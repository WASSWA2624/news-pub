import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("published post by slug api route", () => {
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

  it("returns the localized published story for a valid slug", async () => {
    const getPublishedPostTranslationBySlug = vi.fn().mockResolvedValue({
      id: "post_1",
      slug: "story-slug",
      title: "Story title",
    });

    vi.doMock("@/features/posts", () => ({
      getPublishedPostTranslationBySlug,
    }));

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://example.com/api/posts/slug/story-slug?locale=fr"),
      {
        params: Promise.resolve({
          slug: "story-slug",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body).toEqual({
      post: {
        id: "post_1",
        slug: "story-slug",
        title: "Story title",
      },
      success: true,
    });
    expect(getPublishedPostTranslationBySlug).toHaveBeenCalledWith({
      locale: "fr",
      slug: "story-slug",
    });
  });

  it("returns a not-found payload when the published story does not exist", async () => {
    vi.doMock("@/features/posts", () => ({
      getPublishedPostTranslationBySlug: vi.fn().mockResolvedValue(null),
    }));

    const { GET } = await import("./route");
    const response = await GET(
      new NextRequest("https://example.com/api/posts/slug/missing-story"),
      {
        params: Promise.resolve({
          slug: "missing-story",
        }),
      },
    );
    const body = await response.json();

    expect(response.status).toBe(404);
    expect(body).toEqual({
      message: "Published localized content was not found.",
      status: "post_not_found",
      success: false,
    });
  });
});
