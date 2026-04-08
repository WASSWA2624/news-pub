import { readFileSync } from "node:fs";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const messages = JSON.parse(readFileSync(new URL("../../messages/en.json", import.meta.url), "utf8"));
const pageContent = messages.public.search;
const originalEnv = process.env;

describe("public search page utils", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.resetModules();
  });

  it("builds an empty-query discovery state", async () => {
    const { buildPublicSearchPageModel } = await import("./public-search-page-utils");
    const model = buildPublicSearchPageModel({
      categoryLinks: [
        {
          count: 7,
          name: "Technology",
          path: "/en/category/technology",
          slug: "technology",
        },
      ],
      collectionCountry: "all",
      locale: "en",
      pageContent,
      pageData: {
        pagination: {
          totalItems: 8,
        },
        query: "",
      },
      searchFilters: {
        countries: [
          {
            count: 3,
            label: "United States",
            value: "us",
          },
        ],
      },
    });

    expect(model.stateTitle).toBe(pageContent.emptyQueryTitle);
    expect(model.quickActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          key: "browse-latest",
        }),
      ]),
    );
    expect(model.discoverySections).toHaveLength(2);
  });

  it("builds a filtered search state with active query and country filters", async () => {
    const { buildPublicSearchPageModel } = await import("./public-search-page-utils");
    const model = buildPublicSearchPageModel({
      categoryLinks: [],
      collectionCountry: "us",
      locale: "en",
      pageContent,
      pageData: {
        country: "us",
        countryLabel: "United States",
        pagination: {
          totalItems: 4,
        },
        query: "climate policy",
      },
      searchFilters: {
        countries: [
          {
            count: 4,
            label: "United States",
            value: "us",
          },
          {
            count: 2,
            label: "United Kingdom",
            value: "gb",
          },
        ],
      },
    });

    expect(model.stateTitle).toBe(`${pageContent.resultsTitle}: “climate policy”`);
    expect(model.stateDescription).toContain("United States");
    expect(model.activeFilters.map((filter) => filter.key)).toEqual(["query", "country"]);
    expect(model.quickActions.map((action) => action.key)).toEqual(["clear-query", "clear-country"]);
    expect(model.showDiscoveryLead).toBe(true);
  });

  it("builds a no-results search state with recovery actions", async () => {
    const { buildPublicSearchPageModel } = await import("./public-search-page-utils");
    const model = buildPublicSearchPageModel({
      categoryLinks: [
        {
          count: 5,
          name: "Health",
          path: "/en/category/health",
          slug: "health",
        },
      ],
      locale: "en",
      pageContent,
      pageData: {
        pagination: {
          totalItems: 0,
        },
        query: "impossible phrase",
      },
      searchFilters: {
        countries: [],
      },
    });

    expect(model.stateTitle).toContain(pageContent.noResultsTitle);
    expect(model.stateTitle).toContain("impossible phrase");
    expect(model.quickActions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ key: "clear-query" }),
        expect.objectContaining({ key: "browse-latest" }),
      ]),
    );
    expect(model.showDiscoveryLead).toBe(true);
  });
});
