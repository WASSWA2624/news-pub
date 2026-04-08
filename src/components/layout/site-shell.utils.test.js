import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { siteShellUtils } from "./site-shell.utils";

const messages = JSON.parse(readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8"));

describe("site shell utils", () => {
  it("builds bounded deterministic footer discovery sections", () => {
    const sections = siteShellUtils.buildFooterSections({
      aboutHref: "/en/about",
      categoryLinks: [
        { count: 12, name: "Technology", path: "/en/category/technology", slug: "technology" },
        { count: 10, name: "Business", path: "/en/category/business", slug: "business" },
        { count: 8, name: "Health", path: "/en/category/health", slug: "health" },
        { count: 6, name: "Science", path: "/en/category/science", slug: "science" },
        { count: 4, name: "Sports", path: "/en/category/sports", slug: "sports" },
      ],
      countryLinks: [
        { count: 9, label: "United States", path: "/en/search?country=us", value: "us" },
        { count: 7, label: "United Kingdom", path: "/en/search?country=gb", value: "gb" },
        { count: 5, label: "Uganda", path: "/en/search?country=ug", value: "ug" },
        { count: 3, label: "Kenya", path: "/en/search?country=ke", value: "ke" },
        { count: 2, label: "Canada", path: "/en/search?country=ca", value: "ca" },
      ],
      disclaimerHref: "/en/disclaimer",
      homeHref: "/en",
      messages,
      newsHref: "/en/news",
      privacyHref: "/en/privacy",
      searchHref: "/en/search",
    });

    expect(sections.map((section) => section.key)).toEqual([
      "browse",
      "discover",
      "company",
      "legal",
    ]);

    const discoverSection = sections.find((section) => section.key === "discover");

    expect(discoverSection.title).toBe(messages.site.footerNavigation.discover);
    expect(discoverSection.links).toHaveLength(8);
    expect(discoverSection.links.slice(0, 4).map((link) => link.key)).toEqual([
      "category-technology",
      "category-business",
      "category-health",
      "category-science",
    ]);
    expect(discoverSection.links.slice(4).map((link) => link.key)).toEqual([
      "country-us",
      "country-gb",
      "country-ug",
      "country-ke",
    ]);
    expect(sections.every((section) => section.links.every((link) => link.href.startsWith("/en")))).toBe(true);
  });
});
