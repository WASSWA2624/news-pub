import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

function createPublishedPost(overrides = {}) {
  return {
    categories: [
      {
        category: {
          description: "Technology news",
          id: "category_1",
          name: "Technology",
          slug: "technology",
        },
      },
    ],
    featuredImage: {
      alt: "Breaking story image",
      caption: "Story image",
      height: 900,
      public_url: "https://cdn.example.com/story.jpg",
      source_url: null,
      width: 1600,
    },
    id: "post_1",
    provider_key: "mediastack",
    publishAttempts: [
      {
        platform: "WEBSITE",
        status: "SUCCEEDED",
      },
    ],
    published_at: new Date("2026-04-03T08:00:00.000Z"),
    slug: "breaking-story",
    sourceArticle: {
      author: "Casey Reporter",
      image_url: null,
    },
    source_name: "Example Source",
    source_url: "https://example.com/story",
    status: "PUBLISHED",
    translations: [
      {
        content_html: "<p>Breaking story body.</p>",
        content_md: "Breaking story body.",
        locale: "en",
        seoRecord: {
          authors_json: ["NewsPub Editorial"],
          canonical_url: "https://example.com/en/news/breaking-story",
          keywords_json: ["breaking", "technology"],
          meta_description: "Breaking story meta description",
          meta_title: "Breaking story meta title",
          noindex: false,
          og_description: "Breaking story open graph description",
          ogImage: {
            alt: "Breaking story SEO image",
            caption: "SEO image",
            height: 630,
            public_url: "https://cdn.example.com/story-seo.jpg",
            source_url: null,
            width: 1200,
          },
          og_title: "Breaking story open graph title",
          twitter_description: "Breaking story twitter description",
          twitter_title: "Breaking story twitter title",
        },
        source_attribution: "Source: Example Source - https://example.com/story",
        structured_content_json: {
          sections: [],
        },
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    ],
    updated_at: new Date("2026-04-03T09:00:00.000Z"),
    ...overrides,
  };
}

const originalEnv = process.env;

describe("public site data", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds the home page payload with a featured story and ranked categories", async () => {
    const posts = [
      createPublishedPost(),
      createPublishedPost({
        id: "post_2",
        published_at: new Date("2026-04-02T08:00:00.000Z"),
        slug: "follow-up-story",
        translations: [
          {
            content_html: "<p>Follow-up body.</p>",
            content_md: "Follow-up body.",
            locale: "en",
            seoRecord: null,
            source_attribution: "Source: Example Source - https://example.com/story",
            structured_content_json: {
              sections: [],
            },
            summary: "Follow-up summary",
            title: "Follow-up story",
          },
        ],
      }),
    ];
    const prisma = {
      category: {
        findMany: vi.fn().mockResolvedValue([
          {
            description: "Technology news",
            id: "category_1",
            name: "Technology",
            slug: "technology",
          },
        ]),
      },
      post: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue(posts),
      },
      postCategory: {
        groupBy: vi.fn().mockResolvedValue([
          {
            category_id: "category_1",
            _count: {
              _all: 2,
            },
          },
        ]),
      },
    };
    const { getPublishedHomePageData } = await import("./index");

    const pageData = await getPublishedHomePageData({ locale: "en" }, prisma);

    expect(pageData.featuredStory).toMatchObject({
      path: "/en/news/breaking-story",
      title: "Breaking story",
    });
    expect(pageData.latestStories[0]).toMatchObject({
      path: "/en/news/follow-up-story",
      title: "Follow-up story",
    });
    expect(pageData.hasMoreLatestStories).toBe(false);
    expect(pageData.summary.latestStoryCount).toBe(1);
    expect(pageData.topCategories[0]).toMatchObject({
      count: 2,
      path: "/en/category/technology",
      slug: "technology",
    });
    expect(prisma.postCategory.groupBy).toHaveBeenCalledWith(
      expect.objectContaining({
        by: ["category_id"],
      }),
    );
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.not.objectContaining({
        include: expect.anything(),
      }),
    );
  });

  it("loads the first five latest stories after the featured item", async () => {
    const posts = Array.from({ length: 12 }, (_value, index) =>
      createPublishedPost({
        id: `post_${index + 1}`,
        published_at: new Date(`2026-04-${String(12 - index).padStart(2, "0")}T08:00:00.000Z`),
        slug: `story-${index + 1}`,
        translations: [
          {
            content_html: `<p>Story ${index + 1} body.</p>`,
            content_md: `Story ${index + 1} body.`,
            locale: "en",
            seoRecord: null,
            source_attribution: "Source: Example Source - https://example.com/story",
            structured_content_json: {
              sections: [],
            },
            summary: `Story ${index + 1} summary`,
            title: `Story ${index + 1}`,
          },
        ],
      }),
    );
    const prisma = {
      category: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      post: {
        count: vi.fn().mockResolvedValue(12),
        findMany: vi.fn().mockResolvedValue(posts),
      },
      postCategory: {
        groupBy: vi.fn().mockResolvedValue([]),
      },
    };
    const { getPublishedHomePageData } = await import("./index");

    const pageData = await getPublishedHomePageData({ locale: "en" }, prisma);

    expect(pageData.featuredStory?.title).toBe("Story 1");
    expect(pageData.latestStories).toHaveLength(5);
    expect(pageData.hasMoreLatestStories).toBe(true);
    expect(pageData.summary.latestStoryCount).toBe(11);
    expect(pageData.latestStories.at(-1)).toMatchObject({
      title: "Story 6",
    });
  });

  it("returns additional home latest stories in batches of five", async () => {
    const posts = Array.from({ length: 12 }, (_value, index) =>
      createPublishedPost({
        id: `post_${index + 1}`,
        published_at: new Date(`2026-04-${String(12 - index).padStart(2, "0")}T08:00:00.000Z`),
        slug: `story-${index + 1}`,
        translations: [
          {
            content_html: `<p>Story ${index + 1} body.</p>`,
            content_md: `Story ${index + 1} body.`,
            locale: "en",
            seoRecord: null,
            source_attribution: "Source: Example Source - https://example.com/story",
            structured_content_json: {
              sections: [],
            },
            summary: `Story ${index + 1} summary`,
            title: `Story ${index + 1}`,
          },
        ],
      }),
    );
    const prisma = {
      post: {
        findMany: vi.fn().mockResolvedValue(posts.slice(6, 12)),
      },
    };
    const { getPublishedHomeLatestStoriesData } = await import("./index");

    const batch = await getPublishedHomeLatestStoriesData(
      {
        locale: "en",
        skip: 6,
        take: 5,
      },
      prisma,
    );

    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        skip: 6,
        take: 6,
      }),
    );
    expect(batch.items).toHaveLength(5);
    expect(batch.items[0]).toMatchObject({
      title: "Story 7",
    });
    expect(batch.items.at(-1)).toMatchObject({
      title: "Story 11",
    });
    expect(batch.hasMore).toBe(true);
  });

  it("searches published stories and preserves pagination metadata", async () => {
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([createPublishedPost()]),
      },
    };
    const { searchPublishedPosts } = await import("./index");

    const snapshot = await searchPublishedPosts(
      {
        locale: "en",
        page: "1",
        search: " breaking ",
      },
      prisma,
    );

    expect(snapshot.query).toBe("breaking");
    expect(snapshot.pagination).toMatchObject({
      currentPage: 1,
      totalItems: 1,
    });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          translations: expect.any(Object),
        }),
      }),
    );
    expect(snapshot.items[0]).toMatchObject({
      path: "/en/news/breaking-story",
      source_name: "Example Source",
      title: "Breaking story",
    });
  });

  it("applies the optional country filter when searching published stories", async () => {
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([createPublishedPost()]),
      },
    };
    const { searchPublishedPosts } = await import("./index");

    const snapshot = await searchPublishedPosts(
      {
        country: " US ",
        locale: "en",
        page: "1",
        search: "health",
      },
      prisma,
    );

    expect(snapshot.country).toBe("us");
    expect(prisma.post.count).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          AND: expect.arrayContaining([
            expect.objectContaining({
              sourceArticle: {
                is: {
                  provider_countries_json: {
                    array_contains: "us",
                  },
                },
              },
            }),
          ]),
        }),
      }),
    );
  });

  it("ranks title, category, and source matches ahead of weaker body-only matches", async () => {
    const posts = [
      createPublishedPost({
        id: "post_body",
        published_at: new Date("2026-04-07T08:00:00.000Z"),
        slug: "weekly-briefing",
        source_name: "Daily Ledger",
        translations: [
          {
            content_md: "This weekly briefing focuses on climate policy funding and implementation details.",
            locale: "en",
            seoRecord: null,
            structured_content_json: {
              sections: [],
            },
            summary: "Editorial roundup",
            title: "Weekly briefing",
          },
        ],
      }),
      createPublishedPost({
        id: "post_source",
        published_at: new Date("2026-04-06T08:00:00.000Z"),
        slug: "market-wrap",
        source_name: "Climate Policy Daily",
        translations: [
          {
            content_md: "Global markets and regulation roundup.",
            locale: "en",
            seoRecord: null,
            structured_content_json: {
              sections: [],
            },
            summary: "Market updates",
            title: "Market wrap",
          },
        ],
      }),
      createPublishedPost({
        categories: [
          {
            category: {
              description: "Climate policy coverage",
              id: "category_2",
              name: "Climate Policy",
              slug: "climate-policy",
            },
          },
        ],
        id: "post_category",
        published_at: new Date("2026-04-05T08:00:00.000Z"),
        slug: "global-outlook",
        source_name: "World Desk",
        translations: [
          {
            content_md: "International reporting and analysis.",
            locale: "en",
            seoRecord: null,
            structured_content_json: {
              sections: [],
            },
            summary: "Broader context",
            title: "Global outlook",
          },
        ],
      }),
      createPublishedPost({
        id: "post_title",
        published_at: new Date("2026-04-04T08:00:00.000Z"),
        slug: "climate-policy-briefing",
        source_name: "Wire Desk",
        translations: [
          {
            content_md: "Policy background and timeline.",
            locale: "en",
            seoRecord: null,
            structured_content_json: {
              sections: [],
            },
            summary: "The latest climate policy changes",
            title: "Climate policy briefing",
          },
        ],
      }),
    ];
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(posts.length),
        findMany: vi.fn().mockResolvedValue(posts),
      },
    };
    const { searchPublishedPosts } = await import("./index");

    const snapshot = await searchPublishedPosts(
      {
        locale: "en",
        page: "1",
        search: "  climate   policy  ",
      },
      prisma,
    );

    expect(snapshot.query).toBe("climate policy");
    expect(snapshot.items.map((item) => item.id)).toEqual([
      "post_title",
      "post_category",
      "post_source",
      "post_body",
    ]);
    expect(snapshot.items[0].searchMeta).toMatchObject({
      primaryReason: "title",
    });
    expect(snapshot.items.at(-1).searchMeta).toMatchObject({
      primaryReason: "body",
    });
  });

  it("keeps ranked search pagination stable across pages", async () => {
    const titleMatches = Array.from({ length: 12 }, (_value, index) =>
      createPublishedPost({
        id: `post_title_${index + 1}`,
        published_at: new Date(`2026-03-${String(20 - index).padStart(2, "0")}T08:00:00.000Z`),
        slug: `election-brief-${index + 1}`,
        source_name: `Desk ${index + 1}`,
        translations: [
          {
            content_md: `Election body ${index + 1}.`,
            locale: "en",
            seoRecord: null,
            structured_content_json: {
              sections: [],
            },
            summary: `Election summary ${index + 1}`,
            title: `Election brief ${index + 1}`,
          },
        ],
      }),
    );
    const posts = [
      createPublishedPost({
        id: "post_body_only",
        published_at: new Date("2026-04-08T08:00:00.000Z"),
        slug: "most-recent-analysis",
        source_name: "Metro Desk",
        translations: [
          {
            content_md: "This long analysis includes election context but not in the title.",
            locale: "en",
            seoRecord: null,
            structured_content_json: {
              sections: [],
            },
            summary: "Analysis overview",
            title: "Metro analysis",
          },
        ],
      }),
      ...titleMatches,
    ];
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(posts.length),
        findMany: vi.fn().mockResolvedValue(posts),
      },
    };
    const { searchPublishedPosts } = await import("./index");

    const pageOne = await searchPublishedPosts(
      {
        locale: "en",
        page: "1",
        search: "election",
      },
      prisma,
    );
    const pageTwo = await searchPublishedPosts(
      {
        locale: "en",
        page: "2",
        search: "election",
      },
      prisma,
    );

    expect(pageOne.items).toHaveLength(12);
    expect(pageOne.items.every((item) => item.searchMeta?.primaryReason === "title")).toBe(true);
    expect(pageTwo.pagination).toMatchObject({
      currentPage: 2,
      totalItems: 13,
    });
    expect(pageTwo.items).toHaveLength(1);
    expect(pageTwo.items[0]).toMatchObject({
      id: "post_body_only",
      searchMeta: {
        primaryReason: "body",
      },
    });
  });

  it("stays stable when optional search card fields are missing", async () => {
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          createPublishedPost({
            categories: [],
            excerpt: "",
            featuredImage: null,
            sourceArticle: {
              image_url: null,
            },
            source_name: "",
            translations: [
              {
                content_md: "Health policy coverage without a summary or image still needs a readable fallback.",
                locale: "en",
                seoRecord: null,
                structured_content_json: {
                  sections: [],
                },
                summary: "",
                title: "Coverage update",
              },
            ],
          }),
        ]),
      },
    };
    const { searchPublishedPosts } = await import("./index");

    const snapshot = await searchPublishedPosts(
      {
        locale: "en",
        page: "1",
        search: "health policy",
      },
      prisma,
    );

    expect(snapshot.items[0]).toMatchObject({
      categories: [],
      source_name: "",
      title: "Coverage update",
    });
    expect(snapshot.items[0].summary).toContain("Health policy coverage without a summary");
    expect(snapshot.items[0].searchMeta.primaryReason).toBe("summary");
  });

  it("builds published country filter options from available website stories", async () => {
    const prisma = {
      fetchedArticle: {
        findMany: vi.fn().mockResolvedValue([
          {
            provider_countries_json: ["us", "gb"],
          },
          {
            provider_countries_json: ["us"],
          },
        ]),
      },
    };
    const { getPublishedSearchFilterData } = await import("./index");

    const snapshot = await getPublishedSearchFilterData({ locale: "en" }, prisma);

    expect(snapshot.countries).toEqual([
      expect.objectContaining({
        count: 2,
        label: "United States",
        value: "us",
      }),
      expect.objectContaining({
        count: 1,
        label: "United Kingdom",
        value: "gb",
      }),
    ]);
  });

  it("returns empty public navigation, filters, and listing data when build-time database access is unavailable", async () => {
    const databaseError = {
      cause: {
        message: "Access denied for user 'news_pub'@'localhost' (using password: YES)",
      },
      message: "pool timeout: failed to retrieve a connection from pool after 10012ms",
      name: "DriverAdapterError",
    };
    const prisma = {
      category: {
        findMany: vi.fn().mockRejectedValue(databaseError),
      },
      fetchedArticle: {
        findMany: vi.fn().mockRejectedValue(databaseError),
      },
      post: {
        count: vi.fn().mockRejectedValue(databaseError),
        findMany: vi.fn().mockRejectedValue(databaseError),
      },
      postCategory: {
        groupBy: vi.fn().mockRejectedValue(databaseError),
      },
    };
    const {
      getPublishedCategoryNavigationData,
      getPublishedNewsIndexData,
      getPublishedSearchFilterData,
    } = await import("./index");

    await expect(getPublishedCategoryNavigationData({ locale: "en" }, prisma)).resolves.toEqual([]);
    await expect(getPublishedSearchFilterData({ locale: "en" }, prisma)).resolves.toEqual({
      countries: [],
    });
    await expect(getPublishedNewsIndexData({ locale: "en", page: "2" }, prisma)).resolves.toMatchObject({
      items: [],
      pagination: {
        currentPage: 1,
        totalItems: 0,
      },
    });
  });

  it("returns empty public data when the deployed database schema has not been initialized", async () => {
    const schemaError = {
      code: "P2021",
      message: "The table `Category` does not exist in the current database.",
      meta: {
        driverAdapterError: {
          name: "DriverAdapterError",
          message: "TableDoesNotExist",
        },
        modelName: "Category",
      },
      name: "PrismaClientKnownRequestError",
    };
    const prisma = {
      category: {
        findMany: vi.fn().mockRejectedValue(schemaError),
      },
      fetchedArticle: {
        findMany: vi.fn().mockRejectedValue(schemaError),
      },
      post: {
        count: vi.fn().mockRejectedValue(schemaError),
        findMany: vi.fn().mockRejectedValue(schemaError),
      },
      postCategory: {
        groupBy: vi.fn().mockRejectedValue(schemaError),
      },
    };
    const {
      getPublishedCategoryNavigationData,
      getPublishedHomePageData,
      getPublishedNewsIndexData,
      getPublishedSearchFilterData,
    } = await import("./index");

    await expect(getPublishedHomePageData({ locale: "en" }, prisma)).resolves.toMatchObject({
      featuredStory: null,
      latestStories: [],
      summary: {
        categoryCount: 0,
        latestStoryCount: 0,
        publishedStoryCount: 0,
      },
      topCategories: [],
    });
    await expect(getPublishedCategoryNavigationData({ locale: "en" }, prisma)).resolves.toEqual([]);
    await expect(getPublishedSearchFilterData({ locale: "en" }, prisma)).resolves.toEqual({
      countries: [],
    });
    await expect(getPublishedNewsIndexData({ locale: "en", page: "2" }, prisma)).resolves.toMatchObject({
      items: [],
      pagination: {
        currentPage: 1,
        totalItems: 0,
      },
    });
  });

  it("builds a story page with source attribution and related stories", async () => {
    const prisma = {
      post: {
        findFirst: vi.fn().mockResolvedValue(createPublishedPost()),
        findMany: vi.fn().mockResolvedValue([
          createPublishedPost({
            id: "post_2",
            published_at: new Date("2026-04-02T08:00:00.000Z"),
            slug: "related-story",
            translations: [
              {
                content_html: "<p>Related body.</p>",
                content_md: "Related body.",
                locale: "en",
                seoRecord: null,
                source_attribution: "Source: Example Source - https://example.com/story",
                structured_content_json: {
                  sections: [],
                },
                summary: "Related summary",
                title: "Related story",
              },
            ],
          }),
        ]),
      },
    };
    const { getPublishedStoryPageData } = await import("./index");

    const pageData = await getPublishedStoryPageData(
      {
        locale: "en",
        slug: "breaking-story",
      },
      prisma,
    );

    expect(pageData.article).toMatchObject({
      authors: ["NewsPub Editorial"],
      canonical_url: "https://example.com/en/news/breaking-story",
      openGraphDescription: "Breaking story open graph description",
      openGraphTitle: "Breaking story open graph title",
      path: "/en/news/breaking-story",
      seoImage: {
        url: "/api/media/proxy?url=https%3A%2F%2Fcdn.example.com%2Fstory-seo.jpg",
      },
      source_attribution: "Source: Example Source - https://example.com/story",
      source_name: "Example Source",
      title: "Breaking story",
      twitter_description: "Breaking story twitter description",
      twitter_title: "Breaking story twitter title",
    });
    expect(pageData.relatedStories[0]).toMatchObject({
      path: "/en/news/related-story",
      title: "Related story",
    });
  });

  it("falls back to source-article authors and keeps dedicated SEO image metadata", async () => {
    const prisma = {
      post: {
        findFirst: vi.fn().mockResolvedValue(createPublishedPost({
          translations: [
            {
              content_html: "<p>Breaking story body.</p>",
              content_md: "Breaking story body.",
              locale: "en",
              seoRecord: {
                authors_json: [],
                canonical_url: "https://example.com/en/news/breaking-story",
                keywords_json: ["breaking", "technology"],
                meta_description: "Breaking story meta description",
                meta_title: "Breaking story meta title",
                noindex: true,
                og_description: "Breaking story open graph description",
                ogImage: {
                  alt: "Breaking story SEO image",
                  caption: "SEO image",
                  height: 630,
                  public_url: "https://cdn.example.com/story-seo.jpg",
                  source_url: null,
                  width: 1200,
                },
                og_title: "Breaking story open graph title",
                twitter_description: "Breaking story twitter description",
                twitter_title: "Breaking story twitter title",
              },
              source_attribution: "Source: Example Source - https://example.com/story",
              structured_content_json: {
                sections: [],
              },
              summary: "Breaking story summary",
              title: "Breaking story",
            },
          ],
        })),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { getPublishedStoryPageData } = await import("./index");

    const pageData = await getPublishedStoryPageData(
      {
        locale: "en",
        slug: "breaking-story",
      },
      prisma,
    );

    expect(pageData.article.authors).toEqual(["Casey Reporter"]);
    expect(pageData.article.noindex).toBe(true);
    expect(pageData.article.seoImage).toMatchObject({
      url: "/api/media/proxy?url=https%3A%2F%2Fcdn.example.com%2Fstory-seo.jpg",
    });
  });

  it("maps source media from structured content and source-image fallbacks", async () => {
    const prisma = {
      post: {
        findFirst: vi.fn().mockResolvedValue(createPublishedPost({
          featuredImage: null,
          sourceArticle: {
            image_url: "https://cdn.example.com/source-fallback.jpg",
          },
          translations: [
            {
              content_html: "<p>Story body with media.</p>",
              content_md: "Story body with media.",
              locale: "en",
              seoRecord: null,
              source_attribution: "Source: Example Source - https://example.com/story",
              structured_content_json: {
                sections: [
                  {
                    images: [
                      {
                        alt: "Gallery image",
                        source_url: "https://cdn.example.com/gallery-image.jpg",
                      },
                    ],
                    kind: "image_gallery",
                    title: "Gallery",
                    videos: [
                      {
                        mime_type: "video/mp4",
                        posterUrl: "https://cdn.example.com/video-poster.jpg",
                        source_url: "https://cdn.example.com/story-video.mp4",
                        title: "Story video",
                      },
                    ],
                  },
                ],
              },
              summary: "Breaking story summary",
              title: "Breaking story",
            },
          ],
        })),
        findMany: vi.fn().mockResolvedValue([]),
      },
    };
    const { getPublishedStoryPageData, getPublishedNewsIndexData } = await import("./index");

    const storyPageData = await getPublishedStoryPageData(
      {
        locale: "en",
        slug: "breaking-story",
      },
      prisma,
    );
    const listingData = await getPublishedNewsIndexData({ locale: "en" }, {
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          createPublishedPost({
            featuredImage: null,
            sourceArticle: {
              image_url: "https://cdn.example.com/source-fallback.jpg",
            },
            translations: [
              {
                content_html: "<p>Story body with media.</p>",
                content_md: "Story body with media.",
                locale: "en",
                seoRecord: null,
                source_attribution: "Source: Example Source - https://example.com/story",
                structured_content_json: {
                  sections: [
                    {
                      kind: "image_gallery",
                      title: "Gallery",
                      videos: [
                        {
                          mime_type: "video/mp4",
                          source_url: "https://cdn.example.com/story-video.mp4",
                          title: "Story video",
                        },
                      ],
                    },
                  ],
                },
                summary: "Breaking story summary",
                title: "Breaking story",
              },
            ],
          }),
        ]),
      },
    });

    expect(storyPageData.article.image).toMatchObject({
      url: "/api/media/proxy?url=https%3A%2F%2Fcdn.example.com%2Fsource-fallback.jpg",
    });
    expect(storyPageData.article.media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "image",
          url: "/api/media/proxy?url=https%3A%2F%2Fcdn.example.com%2Fgallery-image.jpg",
        }),
        expect.objectContaining({
          kind: "video",
          url: "https://cdn.example.com/story-video.mp4",
        }),
      ]),
    );
    expect(storyPageData.article.primaryMedia).toMatchObject({
      kind: "image",
      url: "/api/media/proxy?url=https%3A%2F%2Fcdn.example.com%2Fgallery-image.jpg",
    });
    expect(listingData.items[0].primaryMedia).toMatchObject({
      kind: "video",
      url: "https://cdn.example.com/story-video.mp4",
    });
  });

  it("creates placeholder primary media when a published story has no usable image", async () => {
    const imagelessPost = createPublishedPost({
      featuredImage: null,
      sourceArticle: {
        image_url: null,
      },
      translations: [
        {
          content_html: "<p>Imageless story body.</p>",
          content_md: "Imageless story body.",
          locale: "en",
          seoRecord: null,
          source_attribution: "Source: Example Source - https://example.com/story",
          structured_content_json: {
            sections: [],
          },
          summary: "Imageless story summary",
          title: "Imageless story",
        },
      ],
    });
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(1),
        findFirst: vi.fn().mockResolvedValue(imagelessPost),
        findMany: vi.fn().mockResolvedValue([imagelessPost]),
      },
    };
    const { getPublishedNewsIndexData, getPublishedStoryPageData } = await import("./index");

    const [listingData, storyPageData] = await Promise.all([
      getPublishedNewsIndexData({ locale: "en" }, prisma),
      getPublishedStoryPageData(
        {
          locale: "en",
          slug: "breaking-story",
        },
        prisma,
      ),
    ]);

    expect(listingData.items[0].image).toBeNull();
    expect(listingData.items[0].primaryMedia).toMatchObject({
      kind: "image",
    });
    expect(listingData.items[0].primaryMedia.url).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
    expect(storyPageData.article.image).toBeNull();
    expect(storyPageData.article.primaryMedia).toMatchObject({
      kind: "image",
    });
    expect(storyPageData.article.primaryMedia.url).toMatch(/^data:image\/svg\+xml;charset=UTF-8,/);
  });
});
