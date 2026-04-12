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

  it("builds Mediastack requests from seeded defaults, stream filters, allowlists, and an automatic date window", async () => {
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
      now: new Date("2026-04-05T12:34:56.000Z"),
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
    expect(requestedUrl.searchParams.get("limit")).toBe("25");
    expect(requestedUrl.searchParams.get("countries")).toBe("ug,-gb");
    expect(requestedUrl.searchParams.get("languages")).toBe("en,-fr");
    expect(requestedUrl.searchParams.get("categories")).toBe("business,-sports");
    expect(requestedUrl.searchParams.get("sort")).toBe("popularity");
    expect(requestedUrl.searchParams.get("keywords")).toBe("budget,-rumor");
    expect(requestedUrl.searchParams.get("date")).toBe("2026-04-04,2026-04-05");
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

  it("caps Mediastack request limits at the provider maximum", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          data: [],
          pagination: {
            limit: 100,
            offset: 0,
          },
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");

    await fetchProviderArticles({
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
        locale: "en",
        maxPostsPerRun: 50,
        settingsJson: {
          providerFilters: {
            categories: ["general", "business"],
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.searchParams.get("limit")).toBe("100");
  });

  it("paginates Mediastack with offset progression and source filtering", async () => {
    const firstPageItems = Array.from({ length: 25 }, (_, index) => ({
      category: "business",
      country: "ug",
      description: `First page result ${index + 1}`,
      language: "en",
      published_at: `2026-04-05T${`${index}`.padStart(2, "0")}:00:00Z`,
      source: "Example Source",
      title: `First page result ${index + 1}`,
      url: `https://example.com/first-page-result-${index + 1}`,
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            data: firstPageItems,
            pagination: {
              limit: 25,
              offset: 0,
              total: 26,
            },
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            data: [
              {
                category: "business",
                country: "ug",
                description: "Second page result",
                language: "en",
                published_at: "2026-04-05T01:00:00Z",
                source: "Example Source",
                title: "Second page result",
                url: "https://example.com/second-page-result",
              },
            ],
            pagination: {
              limit: 25,
              offset: 25,
              total: 26,
            },
          }),
        ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      maxArticlesHint: 1,
      providerKey: "mediastack",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            countries: ["ug"],
            languages: ["en"],
          },
        },
        locale: "en",
        maxPostsPerRun: 1,
        settingsJson: {
          providerFilters: {
            sources: "cnn,bbc",
          },
        },
      },
    });

    const requestedUrls = fetch.mock.calls.map((call) => new URL(`${call[0]}`));

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0].searchParams.get("offset")).toBe("0");
    expect(requestedUrls[0].searchParams.get("sources")).toBe("cnn,bbc");
    expect(requestedUrls[1].searchParams.get("offset")).toBe("25");
    expect(result).toMatchObject({
      cursor: {
        offset: 25,
        total: 26,
      },
      diagnostics: {
        pageCount: 2,
        stopReason: "provider_exhausted",
      },
      fetchedCount: 26,
    });
  });

  it("builds NewsData requests with official endpoint and advanced filters", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
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
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            nextPage: null,
            results: [],
          }),
        ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      checkpoint: {
        cursorJson: "page_token_2",
      },
      now: new Date("2026-04-05T12:34:56.000Z"),
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
    expect(requestedUrl.searchParams.get("size")).toBe("25");
    expect(requestedUrl.searchParams.get("q")).toBe("policy");
    expect(requestedUrl.searchParams.get("language")).toBe("en");
    expect(requestedUrl.searchParams.get("country")).toBe("ug,-gb");
    expect(requestedUrl.searchParams.get("category")).toBe("technology");
    expect(requestedUrl.searchParams.get("datatype")).toBe("news,analysis");
    expect(requestedUrl.searchParams.get("prioritydomain")).toBe("top");
    expect(requestedUrl.searchParams.get("timeframe")).toBe("25");
    expect(requestedUrl.searchParams.get("image")).toBe("1");
    expect(requestedUrl.searchParams.get("removeduplicate")).toBe("1");
    expect(result).toMatchObject({
      cursor: null,
      diagnostics: {
        pageCount: 2,
        stopReason: "empty_page",
      },
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

  it("builds NewsAPI Everything requests with searchable-select filters and runtime datetime windows", async () => {
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
      checkpoint: {
        lastSuccessfulFetchAt: new Date("2026-04-03T06:00:00.000Z"),
      },
      now: new Date("2026-04-05T12:34:56.000Z"),
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
    expect(requestedUrl.searchParams.get("pageSize")).toBe("25");
    expect(requestedUrl.searchParams.get("q")).toBe("climate");
    expect(requestedUrl.searchParams.get("language")).toBe("fr");
    expect(requestedUrl.searchParams.get("searchIn")).toBe("title,description");
    expect(requestedUrl.searchParams.get("domains")).toBe("bbc.co.uk,techcrunch.com");
    expect(requestedUrl.searchParams.get("excludeDomains")).toBe("example.com");
    expect(requestedUrl.searchParams.get("from")).toBe("2026-04-03T06:00:00.000Z");
    expect(requestedUrl.searchParams.get("to")).toBe("2026-04-05T13:04:56.000Z");
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

  it("paginates NewsAPI Top Headlines with documented sources support", async () => {
    const firstPageArticles = Array.from({ length: 25 }, (_, index) => ({
      description: `First page headline ${index + 1}`,
      publishedAt: `2026-04-05T${`${index}`.padStart(2, "0")}:00:00Z`,
      source: {
        name: "BBC News",
      },
      title: `First page headline ${index + 1}`,
      url: `https://example.com/headline-${index + 1}`,
    }));

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            articles: firstPageArticles,
            totalResults: 26,
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            articles: [
              {
                description: "Second page headline",
                publishedAt: "2026-04-05T01:00:00Z",
                source: {
                  name: "BBC News",
                },
                title: "Second page headline",
                url: "https://example.com/headline-2",
              },
            ],
            totalResults: 26,
          }),
        ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      maxArticlesHint: 1,
      providerKey: "newsapi",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            endpoint: "top-headlines",
            sources: "bbc-news",
          },
        },
        locale: "en",
        maxPostsPerRun: 1,
        settingsJson: {
          providerFilters: {
            q: "economy",
            sources: "bbc-news",
          },
        },
      },
    });

    const requestedUrls = fetch.mock.calls.map((call) => new URL(`${call[0]}`));

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0].searchParams.get("page")).toBe("1");
    expect(requestedUrls[0].searchParams.get("sources")).toBe("bbc-news");
    expect(requestedUrls[1].searchParams.get("page")).toBe("2");
    expect(result).toMatchObject({
      cursor: {
        endpoint: "top-headlines",
        page: 2,
      },
      diagnostics: {
        pageCount: 2,
        stopReason: "provider_exhausted",
      },
      fetchedCount: 26,
    });
  });

  it("applies explicit bounded windows directly to NewsAPI Everything requests", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          articles: [],
          totalResults: 0,
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");

    await fetchProviderArticles({
      fetchWindow: {
        end: new Date("2026-04-02T06:00:00.000Z"),
        start: new Date("2026-04-01T00:00:00.000Z"),
        usesExplicitBoundaries: true,
        usesProviderCheckpoint: false,
        writeCheckpointOnSuccess: false,
      },
      now: new Date("2026-04-02T06:00:00.000Z"),
      providerKey: "newsapi",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            endpoint: "everything",
            language: "en",
          },
        },
        locale: "en",
        maxPostsPerRun: 1,
        settingsJson: {
          providerFilters: {
            q: "markets",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/v2/everything");
    expect(requestedUrl.searchParams.get("from")).toBe("2026-04-01T00:00:00.000Z");
    expect(requestedUrl.searchParams.get("to")).toBe("2026-04-02T06:00:00.000Z");
  });

  it("translates normalized fetch windows into relative timeframe requests for NewsData Latest", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          nextPage: null,
          results: [],
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");

    await fetchProviderArticles({
      fetchWindow: {
        end: new Date("2026-04-02T06:00:00.000Z"),
        start: new Date("2026-04-01T00:00:00.000Z"),
        usesExplicitBoundaries: true,
        usesProviderCheckpoint: false,
        writeCheckpointOnSuccess: false,
      },
      now: new Date("2026-04-02T06:00:00.000Z"),
      providerKey: "newsdata",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            endpoint: "latest",
            language: ["en"],
          },
        },
        locale: "en",
        maxPostsPerRun: 1,
        settingsJson: {
          providerFilters: {
            q: "policy",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/api/1/latest");
    expect(requestedUrl.searchParams.get("timeframe")).toBe("30");
  });

  it("uses NewsData archive exclusion params without minus-prefixed categories", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          nextPage: null,
          results: [],
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");

    await fetchProviderArticles({
      fetchWindow: {
        end: new Date("2026-04-05T23:59:59.000Z"),
        start: new Date("2026-04-01T00:00:00.000Z"),
        usesExplicitBoundaries: true,
        usesProviderCheckpoint: false,
        writeCheckpointOnSuccess: false,
      },
      now: new Date("2026-04-05T23:59:59.000Z"),
      providerKey: "newsdata",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            endpoint: "archive",
            language: ["en"],
          },
        },
        locale: "en",
        maxPostsPerRun: 4,
        settingsJson: {
          providerFilters: {
            excludeCategories: ["sports"],
            fromDate: "2026-04-01",
            q: "policy",
            toDate: "2026-04-05",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/api/1/archive");
    expect(requestedUrl.searchParams.get("category")).toBeNull();
    expect(requestedUrl.searchParams.get("excludecategory")).toBe("sports");
    expect(requestedUrl.searchParams.get("from_date")).toBe("2026-04-01");
    expect(requestedUrl.searchParams.get("to_date")).toBe("2026-04-05");
  });

  it("paginates NewsData using nextPage cursors until the provider is exhausted", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce(
          createJsonResponse({
            nextPage: "cursor_2",
            results: [
              {
                article_id: "article_1",
                category: ["technology"],
                country: ["ug"],
                description: "First page policy result",
                language: "en",
                link: "https://example.com/newsdata-1",
                pubDate: "2026-04-05T00:00:00Z",
                source_id: "bbc",
                title: "First page policy result",
              },
            ],
          }),
        )
        .mockResolvedValueOnce(
          createJsonResponse({
            nextPage: null,
            results: [
              {
                article_id: "article_2",
                category: ["technology"],
                country: ["ug"],
                description: "Second page policy result",
                language: "en",
                link: "https://example.com/newsdata-2",
                pubDate: "2026-04-05T01:00:00Z",
                source_id: "bbc",
                title: "Second page policy result",
              },
            ],
          }),
        ),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      checkpoint: {
        cursorJson: "cursor_1",
      },
      maxArticlesHint: 1,
      providerKey: "newsdata",
      stream: {
        activeProvider: {
          requestDefaultsJson: {
            endpoint: "latest",
            language: ["en"],
          },
        },
        locale: "en",
        maxPostsPerRun: 1,
        settingsJson: {
          providerFilters: {
            q: "policy",
          },
        },
      },
    });

    const requestedUrls = fetch.mock.calls.map((call) => new URL(`${call[0]}`));

    expect(requestedUrls).toHaveLength(2);
    expect(requestedUrls[0].searchParams.get("page")).toBe("cursor_1");
    expect(requestedUrls[1].searchParams.get("page")).toBe("cursor_2");
    expect(result).toMatchObject({
      cursor: null,
      diagnostics: {
        pageCount: 2,
        stopReason: "provider_exhausted",
      },
      fetchedCount: 2,
    });
  });
});
