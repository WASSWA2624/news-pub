import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createJsonResponse(payload, { ok = true, status = 200 } = {}) {
  return {
    ok,
    status,
    text: async () => JSON.stringify(payload),
  };
}

function getRequestedUrl() {
  return new URL(`${fetch.mock.calls[0][0]}`);
}

describe("news providers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv({
        MEDIASTACK_API_KEY: "mediastack-key",
        NEWSDATA_API_KEY: "newsdata-key",
        NEWSAPI_API_KEY: "newsapi-key",
        NODE_ENV: "development",
      }),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("lists the supported provider catalog with provider keys", async () => {
    const { listNewsProviders } = await import("./providers");
    const catalog = listNewsProviders();

    expect(catalog).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          credentialEnv: "MEDIASTACK_API_KEY",
          docsUrl: "https://mediastack.com/documentation",
          providerKey: "mediastack",
        }),
        expect.objectContaining({
          credentialEnv: "NEWSDATA_API_KEY",
          docsUrl: "https://newsdata.io/documentation",
          providerKey: "newsdata",
        }),
        expect.objectContaining({
          credentialEnv: "NEWSAPI_API_KEY",
          docsUrl: "https://newsapi.org/docs",
          providerKey: "newsapi",
        }),
      ]),
    );
  });

  it("builds Mediastack requests from seeded defaults, stream filters, and allowlists", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          data: [
            {
              category: "business",
              country: "ug",
              description: "Budget update",
              language: "en",
              published_at: "2026-04-05T00:00:00Z",
              source: "Example Source",
              title: "Budget update",
              url: "https://example.com/budget-update",
            },
          ],
          pagination: {
            limit: 2,
            offset: 0,
          },
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      providerKey: "mediastack",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            categories: ["general"],
            countries: ["us"],
            languages: ["en"],
            sort: "published_desc",
          },
        },
        countryAllowlistJson: ["ug"],
        languageAllowlistJson: ["en"],
        locale: "en",
        maxPostsPerRun: 2,
        settingsJson: {
          providerFilters: {
            categories: ["business"],
            dateFrom: "2026-04-01",
            dateTo: "2026-04-05",
            excludeCategories: ["sports"],
            excludeCountries: ["gb"],
            excludeLanguages: ["fr"],
            keywords: "budget,-rumor",
            sort: "popularity",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/v1/news");
    expect(requestedUrl.searchParams.get("access_key")).toBe("mediastack-key");
    expect(requestedUrl.searchParams.get("limit")).toBe("2");
    expect(requestedUrl.searchParams.get("countries")).toBe("ug,-gb");
    expect(requestedUrl.searchParams.get("languages")).toBe("en,-fr");
    expect(requestedUrl.searchParams.get("categories")).toBe("business,-sports");
    expect(requestedUrl.searchParams.get("sort")).toBe("popularity");
    expect(requestedUrl.searchParams.get("keywords")).toBe("budget,-rumor");
    expect(requestedUrl.searchParams.get("date")).toBe("2026-04-01,2026-04-05");
    expect(result).toMatchObject({
      cursor: {
        limit: 2,
        offset: 0,
      },
      fetchedCount: 1,
    });
    expect(result.articles[0]).toMatchObject({
      language: "en",
      providerCategories: ["business"],
      providerCountries: ["ug"],
      providerKey: "mediastack",
      sourceName: "Example Source",
      title: "Budget update",
    });
  });

  it("builds NewsData requests with official endpoint and advanced filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          nextPage: "next-token",
          results: [
            {
              article_id: "article_1",
              category: ["technology"],
              country: ["ug"],
              description: "Policy and regulation update",
              language: "en",
              link: "https://example.com/technology-policy",
              pubDate: "2026-04-05T00:00:00Z",
              source_id: "bbc",
              title: "Technology policy update",
            },
          ],
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      checkpoint: {
        cursorJson: "page_token_2",
      },
      providerKey: "newsdata",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            category: ["top"],
            country: ["us"],
            endpoint: "latest",
            language: ["en"],
            removeDuplicate: "1",
          },
        },
        countryAllowlistJson: ["ug"],
        languageAllowlistJson: ["en"],
        locale: "en",
        maxPostsPerRun: 7,
        settingsJson: {
          providerFilters: {
            category: ["technology"],
            datatype: ["news", "analysis"],
            excludeCountries: ["gb"],
            image: "1",
            prioritydomain: "top",
            q: "policy",
            timeframe: "24",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/api/1/latest");
    expect(requestedUrl.searchParams.get("apikey")).toBe("newsdata-key");
    expect(requestedUrl.searchParams.get("page")).toBe("page_token_2");
    expect(requestedUrl.searchParams.get("size")).toBe("7");
    expect(requestedUrl.searchParams.get("q")).toBe("policy");
    expect(requestedUrl.searchParams.get("language")).toBe("en");
    expect(requestedUrl.searchParams.get("country")).toBe("ug,-gb");
    expect(requestedUrl.searchParams.get("category")).toBe("technology");
    expect(requestedUrl.searchParams.get("datatype")).toBe("news,analysis");
    expect(requestedUrl.searchParams.get("prioritydomain")).toBe("top");
    expect(requestedUrl.searchParams.get("timeframe")).toBe("24");
    expect(requestedUrl.searchParams.get("image")).toBe("1");
    expect(requestedUrl.searchParams.get("removeduplicate")).toBe("1");
    expect(result).toMatchObject({
      cursor: "next-token",
      fetchedCount: 1,
    });
    expect(result.articles[0]).toMatchObject({
      language: "en",
      providerCategories: ["technology"],
      providerCountries: ["ug"],
      providerKey: "newsdata",
      sourceName: "bbc",
      title: "Technology policy update",
    });
  });

  it("builds NewsAPI Everything requests with searchable-select and checkbox-backed filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          articles: [
            {
              author: "Reporter",
              content: "A climate policy feature",
              description: "Climate policy feature",
              publishedAt: "2026-04-05T00:00:00Z",
              source: {
                name: "Example Wire",
              },
              title: "Climate policy feature",
              url: "https://example.com/climate-policy",
              urlToImage: "https://example.com/climate-policy.jpg",
            },
          ],
          totalResults: 1,
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      providerKey: "newsapi",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            endpoint: "everything",
            language: "en",
            searchIn: ["title"],
            sortBy: "publishedAt",
          },
        },
        languageAllowlistJson: ["fr"],
        locale: "en",
        maxPostsPerRun: 3,
        settingsJson: {
          providerFilters: {
            domains: "bbc.co.uk,techcrunch.com",
            excludeDomains: "example.com",
            fromDate: "2026-04-01",
            q: "climate",
            searchIn: ["title", "description"],
            sortBy: "popularity",
            toDate: "2026-04-05",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();
    const requestInit = fetch.mock.calls[0][1];

    expect(requestedUrl.pathname).toBe("/v2/everything");
    expect(requestedUrl.searchParams.get("pageSize")).toBe("3");
    expect(requestedUrl.searchParams.get("q")).toBe("climate");
    expect(requestedUrl.searchParams.get("language")).toBe("fr");
    expect(requestedUrl.searchParams.get("searchIn")).toBe("title,description");
    expect(requestedUrl.searchParams.get("domains")).toBe("bbc.co.uk,techcrunch.com");
    expect(requestedUrl.searchParams.get("excludeDomains")).toBe("example.com");
    expect(requestedUrl.searchParams.get("from")).toBe("2026-04-01");
    expect(requestedUrl.searchParams.get("to")).toBe("2026-04-05");
    expect(requestedUrl.searchParams.get("sortBy")).toBe("popularity");
    expect(requestInit.headers["x-api-key"]).toBe("newsapi-key");
    expect(result).toMatchObject({
      cursor: {
        endpoint: "everything",
        totalResults: 1,
      },
      fetchedCount: 1,
    });
    expect(result.articles[0]).toMatchObject({
      language: "fr",
      providerCategories: [],
      providerCountries: [],
      providerKey: "newsapi",
      sourceName: "Example Wire",
      title: "Climate policy feature",
    });
  });
});
