import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

describe("revalidation helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DEFAULT_LOCALE: "en",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      SUPPORTED_LOCALES: "en",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds the expected public paths for a newly published story", async () => {
    const { buildPublishedPostRevalidationPaths } = await import("./index");

    expect(
      buildPublishedPostRevalidationPaths({
        categorySlugs: ["technology", "technology", "world"],
        slug: "breaking-story",
      }),
    ).toEqual([
      "/sitemap.xml",
      "/en",
      "/en/news",
      "/en/news/breaking-story",
      "/en/category/technology",
      "/en/category/world",
    ]);
  });

  it("normalizes relative paths before revalidating them", async () => {
    const revalidate = vi.fn(async () => {});
    const { revalidatePaths } = await import("./index");

    const paths = await revalidatePaths(["en/news", "/en/news", " /sitemap.xml "], revalidate);

    expect(paths).toEqual(["/en/news", "/sitemap.xml"]);
    expect(revalidate.mock.calls.map(([path]) => path)).toEqual(["/en/news", "/sitemap.xml"]);
  });

  it("rejects absolute URLs so only app-relative paths are revalidated", async () => {
    const { revalidatePaths } = await import("./index");

    await expect(revalidatePaths(["https://example.com/en/news"])).rejects.toThrow(
      /relative application paths/i,
    );
  });
});
