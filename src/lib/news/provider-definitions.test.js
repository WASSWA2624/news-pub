import { describe, expect, it } from "vitest";

import {
  getProviderEndpointShape,
  getProviderFormDefinition,
  getProviderRequestValidationIssues,
  getProviderSourceCatalogSupport,
  getProviderTimeBoundarySupport,
  sanitizeProviderFieldValues,
} from "./provider-definitions";

describe("provider definition option metadata", () => {
  it("adds flag metadata to checkbox-based language catalogs", () => {
    const definition = getProviderFormDefinition("mediastack", "provider");
    const languageField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "languages");

    expect(languageField?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flagEmoji: "🇬🇧",
          flagImageUrl: "https://flagcdn.com/24x18/gb.png",
          label: "English",
          value: "en",
        }),
      ]),
    );
  });

  it("preserves language flag metadata through single-select wrappers", () => {
    const definition = getProviderFormDefinition("newsapi", "provider", {
      endpoint: "everything",
    });
    const languageField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "language");
    const englishOption = languageField?.options?.find((option) => option.value === "en");

    expect(englishOption).toMatchObject({
      flagEmoji: "🇬🇧",
      flagImageUrl: "https://flagcdn.com/24x18/gb.png",
      label: "English",
      value: "en",
    });
  });

  it("reports endpoint-specific time-boundary support for each provider surface", () => {
    expect(getProviderEndpointShape("mediastack")).toBe("default");
    expect(getProviderTimeBoundarySupport("mediastack")).toMatchObject({
      endKey: "dateTo",
      mode: "direct",
      precision: "date",
      startKey: "dateFrom",
    });

    expect(getProviderEndpointShape("newsdata", { endpoint: "archive" })).toBe("archive");
    expect(getProviderTimeBoundarySupport("newsdata", { endpoint: "archive" })).toMatchObject({
      endKey: "toDate",
      mode: "direct",
      precision: "date",
      startKey: "fromDate",
    });

    expect(getProviderEndpointShape("newsdata", { endpoint: "latest" })).toBe("latest");
    expect(getProviderTimeBoundarySupport("newsdata", { endpoint: "latest" })).toMatchObject({
      mode: "relative",
      timeframeKey: "timeframe",
    });

    expect(getProviderEndpointShape("newsapi", { endpoint: "everything" })).toBe("everything");
    expect(getProviderTimeBoundarySupport("newsapi", { endpoint: "everything" })).toMatchObject({
      endKey: "toDate",
      mode: "direct",
      precision: "datetime",
      startKey: "fromDate",
    });

    expect(getProviderEndpointShape("newsapi", { endpoint: "top-headlines" })).toBe("top-headlines");
    expect(getProviderTimeBoundarySupport("newsapi", { endpoint: "top-headlines" })).toMatchObject({
      mode: "local_only",
    });
  });

  it("marks provider-managed date fields with the correct admin input precision", () => {
    const definition = getProviderFormDefinition("newsapi", "stream", {
      endpoint: "everything",
    });
    const fromDateField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "fromDate");

    expect(fromDateField).toMatchObject({
      input: "date",
      precision: "datetime",
    });
  });

  it('uses the official NewsAPI "publishedAt" sort value and normalizes old saved defaults', () => {
    const definition = getProviderFormDefinition("newsapi", "provider", {
      endpoint: "everything",
    });
    const sortField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "sortBy");

    expect(sortField?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: "Published At",
          value: "publishedAt",
        }),
      ]),
    );
    expect(sanitizeProviderFieldValues("newsapi", {
      sortBy: "published_at",
    })).toMatchObject({
      sortBy: "publishedAt",
    });
  });

  it("labels NewsAPI Everything source suggestions as the Top Headlines source subset", () => {
    expect(getProviderSourceCatalogSupport("newsapi", {
      endpoint: "top-headlines",
    })).toMatchObject({
      available: true,
      endpoint: "top-headlines",
      scope: "top_headlines",
    });

    expect(getProviderSourceCatalogSupport("newsapi", {
      endpoint: "everything",
    })).toMatchObject({
      available: true,
      endpoint: "everything",
      scope: "top_headlines_subset",
      summary: expect.stringContaining("Top Headlines source subset"),
    });
  });

  it('flags NewsAPI "Everything" queries longer than 500 characters', () => {
    const issues = getProviderRequestValidationIssues("newsapi", {
      providerDefaults: {
        endpoint: "everything",
        q: "a".repeat(501),
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsapi_everything_query_too_long",
      },
    ]);
  });

  it('flags invalid NewsAPI "Everything" sort values before execution', () => {
    const issues = getProviderRequestValidationIssues("newsapi", {
      providerDefaults: {
        endpoint: "everything",
        q: "policy",
        sortBy: "published_at_desc",
      },
    });

    expect(issues).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "provider_newsapi_sort_by_invalid",
        }),
      ]),
    );
  });

  it("flags NewsData archive defaults without a complete date range", () => {
    const issues = getProviderRequestValidationIssues("newsdata", {
      providerDefaults: {
        endpoint: "archive",
        fromDate: "2026-04-01",
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsdata_archive_requires_date_range",
      },
    ]);
  });

  it("flags NewsData category and exclude-category filters when both are present", () => {
    const issues = getProviderRequestValidationIssues("newsdata", {
      providerDefaults: {
        category: ["politics"],
        excludeCategories: ["sports"],
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsdata_category_and_exclude_incompatible",
      },
    ]);
  });

  it('flags NewsAPI "Top Headlines" source filters when country or category is also set', () => {
    const issues = getProviderRequestValidationIssues("newsapi", {
      providerDefaults: {
        category: "business",
        endpoint: "top-headlines",
        sources: "bbc-news",
      },
      providerFilters: {
        country: "us",
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsapi_top_headlines_sources_incompatible",
      },
    ]);
  });

  it("flags NewsAPI source lists longer than the documented 20-source maximum", () => {
    const issues = getProviderRequestValidationIssues("newsapi", {
      providerDefaults: {
        endpoint: "everything",
        q: "policy",
        sources: Array.from({ length: 21 }, (_, index) => `source-${index + 1}`).join(","),
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsapi_sources_too_many",
      },
    ]);
  });

  it("flags malformed NewsAPI source identifiers before execution", () => {
    const issues = getProviderRequestValidationIssues("newsapi", {
      providerDefaults: {
        endpoint: "everything",
        q: "policy",
        sources: "bbc-news,not a source id",
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsapi_sources_invalid_format",
      },
    ]);
  });

  it("flags malformed NewsAPI domain filters before execution", () => {
    const issues = getProviderRequestValidationIssues("newsapi", {
      providerDefaults: {
        domains: "bbc.co.uk,not_a_domain",
        endpoint: "everything",
        q: "policy",
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsapi_domains_invalid_format",
      },
    ]);
  });

  it('flags NewsData "Latest" configurations that try to save explicit from/to dates', () => {
    const issues = getProviderRequestValidationIssues("newsdata", {
      providerDefaults: {
        endpoint: "latest",
        fromDate: "2026-04-01",
        toDate: "2026-04-05",
      },
    });

    expect(issues).toMatchObject([
      {
        code: "provider_newsdata_latest_uses_timeframe_only",
      },
    ]);
  });
});
