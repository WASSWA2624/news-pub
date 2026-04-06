import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("news workflow image resolution", () => {
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

  it("preserves provider image urls when one is already available", async () => {
    const { resolveFetchedArticleImageUrl } = await import("./workflows");

    await expect(
      resolveFetchedArticleImageUrl({
        imageUrl: "https://cdn.example.com/story.jpg",
        sourceUrl: "https://example.com/news/story",
      }),
    ).resolves.toBe("https://cdn.example.com/story.jpg");
  });

  it("falls back to source-page discovery when providers omit image urls", async () => {
    const discoverRemoteImageUrl = vi.fn().mockResolvedValue("https://cdn.example.com/discovered-story.jpg");

    vi.doMock("@/lib/media", async () => ({
      ...(await vi.importActual("@/lib/media")),
      discoverRemoteImageUrl,
    }));

    const { resolveFetchedArticleImageUrl } = await import("./workflows");

    await expect(
      resolveFetchedArticleImageUrl({
        imageUrl: null,
        sourceUrl: "https://example.com/news/story",
      }),
    ).resolves.toBe("https://cdn.example.com/discovered-story.jpg");
    expect(discoverRemoteImageUrl).toHaveBeenCalledWith("https://example.com/news/story");
  });
});
