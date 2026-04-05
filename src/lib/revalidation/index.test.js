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

  it("builds the expected public paths for a newly published post", async () => {
    const { buildPublishedPostRevalidationPaths } = await import("./index");

    expect(
      buildPublishedPostRevalidationPaths({
        categorySlugs: ["maintenance", "maintenance", "safety"],
        equipmentSlug: "microscope",
        manufacturerSlugs: ["acme-medical", "acme-medical", "biocare"],
        slug: "microscope-repair",
      }),
    ).toEqual([
      "/sitemap.xml",
      "/en/blog",
      "/en/blog/microscope-repair",
      "/en/equipment/microscope",
      "/en/category/maintenance",
      "/en/category/safety",
      "/en/manufacturer/acme-medical",
      "/en/manufacturer/biocare",
    ]);
  });

  it("normalizes relative paths before revalidating them", async () => {
    const revalidate = vi.fn(async () => {});
    const { revalidatePaths } = await import("./index");

    const paths = await revalidatePaths(["en/blog", "/en/blog", " /sitemap.xml "], revalidate);

    expect(paths).toEqual(["/en/blog", "/sitemap.xml"]);
    expect(revalidate.mock.calls.map(([path]) => path)).toEqual(["/en/blog", "/sitemap.xml"]);
  });

  it("rejects absolute URLs so only app-relative paths are revalidated", async () => {
    const { revalidatePaths } = await import("./index");

    await expect(revalidatePaths(["https://example.com/en/blog"])).rejects.toThrow(
      /relative application paths/i,
    );
  });
});
