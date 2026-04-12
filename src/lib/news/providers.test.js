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

function createNewsApiArticles(count, page, { source_name = "Example Wire" } = {}) {
  return Array.from({ length: count }, (_, index) => ({
    author: `Reporter ${page}-${index + 1}`,
    content: `Story content ${page}-${index + 1}`,
    description: `Story description ${page}-${index + 1}`,
    publishedAt: `2026-04-${`${Math.min(page, 9)}`.padStart(2, "0")}T${`${index % 24}`.padStart(2, "0")}:00:00Z`,
    source: {
      name: source_name,
    },
    title: `Story ${page}-${index + 1}`,
    url: `https://example.com/newsapi/${page}-${index + 1}`,
    urlToImage: `https://example.com/newsapi/${page}-${index + 1}.jpg`,
  }));
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
          provider_key: "mediastack",
        }),
        expect.objectContaining({
          credentialEnv: "NEWSDATA_API_KEY",
          docsUrl: "https://newsdata.io/documentation",
          provider_key: "newsdata",
        }),
        expect.objectContaining({
          credentialEnv: "NEWSAPI_API_KEY",
          docsUrl: "https://newsapi.org/docs",
          provider_key: "newsapi",
        }),
      ]),
    );
  });

  it("loads NewsAPI source catalog options from the documented sources endpoint", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          sources: [
            {
              category: "technology",
              country: "us",
              id: "techcrunch",
              language: "en",
              name: "TechCrunch",
              url: "https://techcrunch.com",
            },
            {
              category: "general",
              country: "gb",
              id: "bbc-news",
              language: "en",
              name: "BBC News",
              url: "https://www.bbc.co.uk/news",
            },
          ],
        }),
      ),
    );

    const { fetchProviderSourceCatalog } = await import("./providers");
    const result = await fetchProviderSourceCatalog({
      provider_key: "newsapi",
      query: "tech",
      requestValues: {
        category: "technology",
        country: "us",
        endpoint: "top-headlines",
        language: "en",
      },
    });
    const requestedUrl = getRequestedUrl();
    const requestInit = fetch.mock.calls[0][1];

    expect(requestedUrl.pathname).toBe("/v2/top-headlines/sources");
    expect(requestedUrl.searchParams.get("category")).toBe("technology");
    expect(requestedUrl.searchParams.get("country")).toBe("us");
    expect(requestedUrl.searchParams.get("language")).toBe("en");
    expect(requestInit.headers["x-api-key"]).toBe("newsapi-key");
    expect(result).toMatchObject({
      options: [
        expect.objectContaining({
          label: "TechCrunch",
          value: "techcrunch",
        }),
      ],
      supported: true,
    });
  });

  it("loads Mediastack source catalog options only after a search query is present", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          data: [
            {
              category: "general",
              country: "gb",
              id: "bbc",
              language: "en",
              name: "BBC",
              url: "https://www.bbc.co.uk",
            },
          ],
        }),
      ),
    );

    const { fetchProviderSourceCatalog } = await import("./providers");

    await expect(
      fetchProviderSourceCatalog({
        provider_key: "mediastack",
      }),
    ).resolves.toMatchObject({
      options: [],
      requires_query: true,
      supported: true,
    });

    const result = await fetchProviderSourceCatalog({
      provider_key: "mediastack",
      query: "bbc",
      requestValues: {
        categories: ["general"],
        countries: ["gb"],
        languages: ["en"],
      },
    });
    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/v1/sources");
    expect(requestedUrl.searchParams.get("access_key")).toBe("mediastack-key");
    expect(requestedUrl.searchParams.get("search")).toBe("bbc");
    expect(requestedUrl.searchParams.get("categories")).toBe("general");
    expect(requestedUrl.searchParams.get("countries")).toBe("gb");
    expect(requestedUrl.searchParams.get("languages")).toBe("en");
    expect(result).toMatchObject({
      options: [
        expect.objectContaining({
          label: "BBC",
          value: "bbc",
        }),
      ],
      supported: true,
    });
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
      provider_key: "mediastack",
      stream: {
        activeProvider: {
          request_defaults_json: {
            categories: ["general"],
            countries: ["us"],
            languages: ["en"],
            sort: "published_desc",
          },
        },
        country_allowlist_json: ["ug"],
        language_allowlist_json: ["en"],
        locale: "en",
        max_posts_per_run: 2,
        settings_json: {
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
      fetched_count: 1,
    });
    expect(result.articles[0]).toMatchObject({
      language: "en",
      providerCategories: ["business"],
      providerCountries: ["ug"],
      provider_key: "mediastack",
      source_name: "Example Source",
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
      provider_key: "mediastack",
      stream: {
        activeProvider: {
          request_defaults_json: {
            categories: ["general"],
            countries: ["us"],
            languages: ["en"],
            sort: "published_desc",
          },
        },
        locale: "en",
        max_posts_per_run: 50,
        settings_json: {
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
      provider_key: "mediastack",
      stream: {
        activeProvider: {
          request_defaults_json: {
            countries: ["ug"],
            languages: ["en"],
          },
        },
        locale: "en",
        max_posts_per_run: 1,
        settings_json: {
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
      fetched_count: 26,
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
        cursor_json: "page_token_2",
      },
      now: new Date("2026-04-05T12:34:56.000Z"),
      provider_key: "newsdata",
      stream: {
        activeProvider: {
          request_defaults_json: {
            category: ["top"],
            country: ["us"],
            endpoint: "latest",
            language: ["en"],
            removeDuplicate: "1",
          },
        },
        country_allowlist_json: ["ug"],
        language_allowlist_json: ["en"],
        locale: "en",
        max_posts_per_run: 7,
        settings_json: {
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
      fetched_count: 1,
    });
    expect(result.articles[0]).toMatchObject({
      language: "en",
      providerCategories: ["technology"],
      providerCountries: ["ug"],
      provider_key: "newsdata",
      source_name: "bbc",
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
        last_successful_fetch_at: new Date("2026-04-03T06:00:00.000Z"),
      },
      now: new Date("2026-04-05T12:34:56.000Z"),
      provider_key: "newsapi",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "everything",
            language: "en",
            searchIn: ["title"],
            sortBy: "publishedAt",
          },
        },
        language_allowlist_json: ["fr"],
        locale: "en",
        max_posts_per_run: 3,
        settings_json: {
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
      fetched_count: 1,
    });
    expect(result.articles[0]).toMatchObject({
      language: "fr",
      metadata_provenance: {
        language: {
          inferred: true,
          source: "request_context",
        },
      },
      providerCategories: [],
      providerCountries: [],
      provider_key: "newsapi",
      published_at: "2026-04-05T00:00:00Z",
      raw_payload_json: {
        _newspub_normalization: {
          metadata_provenance: {
            language: {
              inferred: true,
              source: "request_context",
            },
          },
        },
      },
      source_name: "Example Wire",
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
      provider_key: "newsapi",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "top-headlines",
            sources: "bbc-news",
          },
        },
        locale: "en",
        max_posts_per_run: 1,
        settings_json: {
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
      fetched_count: 26,
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
      provider_key: "newsapi",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "everything",
            language: "en",
          },
        },
        locale: "en",
        max_posts_per_run: 1,
        settings_json: {
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

  it('sends the official NewsAPI "publishedAt" sortBy value', async () => {
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
      provider_key: "newsapi",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "everything",
            language: "en",
            sortBy: "publishedAt",
          },
        },
        locale: "en",
        max_posts_per_run: 1,
        settings_json: {
          providerFilters: {
            q: "markets",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.pathname).toBe("/v2/everything");
    expect(requestedUrl.searchParams.get("sortBy")).toBe("publishedAt");
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
      provider_key: "newsdata",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "latest",
            language: ["en"],
          },
        },
        locale: "en",
        max_posts_per_run: 1,
        settings_json: {
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
      provider_key: "newsdata",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "archive",
            language: ["en"],
          },
        },
        locale: "en",
        max_posts_per_run: 4,
        settings_json: {
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
        cursor_json: "cursor_1",
      },
      maxArticlesHint: 1,
      provider_key: "newsdata",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "latest",
            language: ["en"],
          },
        },
        locale: "en",
        max_posts_per_run: 1,
        settings_json: {
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
      fetched_count: 2,
    });
  });

  it("caps NewsData request size at the plan-safe runtime ceiling", async () => {
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
      provider_key: "newsdata",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "latest",
            language: ["en"],
          },
        },
        locale: "en",
        max_posts_per_run: 30,
        settings_json: {
          providerFilters: {
            q: "policy",
          },
        },
      },
    });

    const requestedUrl = getRequestedUrl();

    expect(requestedUrl.searchParams.get("size")).toBe("50");
  });

  it("reports explicit page-limit truncation when NewsAPI still has more pages after the local cap", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn((input) => {
        const url = new URL(`${input}`);
        const page = Number.parseInt(url.searchParams.get("page"), 10);

        return Promise.resolve(
          createJsonResponse({
            articles: createNewsApiArticles(100, page),
            totalResults: 1000,
          }),
        );
      }),
    );

    const { fetchProviderArticles } = await import("./providers");
    const result = await fetchProviderArticles({
      provider_key: "newsapi",
      stream: {
        activeProvider: {
          request_defaults_json: {
            endpoint: "everything",
            language: "en",
          },
        },
        locale: "en",
        max_posts_per_run: 40,
        settings_json: {
          providerFilters: {
            q: "markets",
          },
        },
      },
    });

    const requestedUrls = fetch.mock.calls.map((call) => new URL(`${call[0]}`));

    expect(requestedUrls).toHaveLength(5);
    expect(requestedUrls[0].searchParams.get("pageSize")).toBe("100");
    expect(result).toMatchObject({
      diagnostics: {
        pageCount: 5,
        provider_key: "newsapi",
        requestSizing: {
          cappedByProvider: true,
          providerBatchCap: 100,
          requestedBatchSize: 120,
          runtimeBatchSize: 100,
        },
        stopReason: "page_limit_reached",
        totalFetchedArticles: 500,
        truncatedByPageLimit: true,
      },
      fetched_count: 500,
    });
  });

  it("attaches invalid-response diagnostics when NewsData returns the wrong shape", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        createJsonResponse({
          nextPage: null,
          results: {
            unexpected: true,
          },
        }),
      ),
    );

    const { fetchProviderArticles } = await import("./providers");

    await expect(
      fetchProviderArticles({
        provider_key: "newsdata",
        stream: {
          activeProvider: {
            request_defaults_json: {
              endpoint: "latest",
              language: ["en"],
            },
          },
          locale: "en",
          max_posts_per_run: 1,
          settings_json: {
            providerFilters: {
              q: "policy",
            },
          },
        },
      }),
    ).rejects.toMatchObject({
      providerDiagnostics: {
        failure: {
          responseStatus: 200,
          type: "invalid_response",
        },
        stopReason: "invalid_response",
      },
      status: "provider_response_invalid",
    });
  });
});
