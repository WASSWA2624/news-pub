import { describe, expect, it } from "vitest";

import {
  getSuggestedCategorySlug,
  getSupportedCategoryPresets,
} from "@/lib/news/category-presets";

describe("category presets", () => {
  it("derives provider-safe categories from the supported provider catalog", () => {
    const presets = getSupportedCategoryPresets();

    expect(presets.map((preset) => preset.value)).toEqual(
      expect.arrayContaining([
        "breaking",
        "business",
        "entertainment",
        "general",
        "health",
        "politics",
        "science",
        "sports",
        "technology",
        "top",
        "world",
      ]),
    );

    expect(presets.find((preset) => preset.value === "business")).toMatchObject({
      name: "Business",
      providerKeys: expect.arrayContaining(["mediastack", "newsapi", "newsdata"]),
      slug: "business",
    });

    expect(presets.find((preset) => preset.value === "general")).toMatchObject({
      providerKeys: expect.arrayContaining(["mediastack", "newsapi"]),
      slug: "general-news",
    });

    expect(presets.find((preset) => preset.value === "politics")).toMatchObject({
      providerKeys: ["newsdata"],
      slug: "politics",
    });
  });

  it("creates seo-safe slugs for provider categories and custom names", () => {
    expect(getSuggestedCategorySlug("Breaking")).toBe("breaking-news");
    expect(getSuggestedCategorySlug("General")).toBe("general-news");
    expect(getSuggestedCategorySlug("World")).toBe("world");
    expect(getSuggestedCategorySlug("Climate Policy")).toBe("climate-policy");
  });
});
