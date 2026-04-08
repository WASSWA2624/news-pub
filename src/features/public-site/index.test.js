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
      publicUrl: "https://cdn.example.com/story.jpg",
      sourceUrl: null,
      width: 1600,
    },
    id: "post_1",
    providerKey: "mediastack",
    publishAttempts: [
      {
        platform: "WEBSITE",
        status: "SUCCEEDED",
      },
    ],
    publishedAt: new Date("2026-04-03T08:00:00.000Z"),
    slug: "breaking-story",
    sourceArticle: {
      author: "Casey Reporter",
      imageUrl: null,
    },
    sourceName: "Example Source",
    sourceUrl: "https://example.com/story",
    status: "PUBLISHED",
    translations: [
      {
        contentHtml: "<p>Breaking story body.</p>",
        contentMd: "Breaking story body.",
        locale: "en",
        seoRecord: {
          authorsJson: ["NewsPub Editorial"],
          canonicalUrl: "https://example.com/en/news/breaking-story",
          keywordsJson: ["breaking", "technology"],
          metaDescription: "Breaking story meta description",
          metaTitle: "Breaking story meta title",
          noindex: false,
          ogDescription: "Breaking story open graph description",
          ogImage: {
            alt: "Breaking story SEO image",
            caption: "SEO image",
            height: 630,
            publicUrl: "https://cdn.example.com/story-seo.jpg",
            sourceUrl: null,
            width: 1200,
          },
          ogTitle: "Breaking story open graph title",
          twitterDescription: "Breaking story twitter description",
          twitterTitle: "Breaking story twitter title",
        },
        sourceAttribution: "Source: Example Source - https://example.com/story",
        structuredContentJson: {
          sections: [],
        },
        summary: "Breaking story summary",
        title: "Breaking story",
      },
    ],
    updatedAt: new Date("2026-04-03T09:00:00.000Z"),
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
        publishedAt: new Date("2026-04-02T08:00:00.000Z"),
        slug: "follow-up-story",
        translations: [
          {
            contentHtml: "<p>Follow-up body.</p>",
            contentMd: "Follow-up body.",
            locale: "en",
            seoRecord: null,
            sourceAttribution: "Source: Example Source - https://example.com/story",
            structuredContentJson: {
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
            name: "Technology",
            posts: [
              {
                post: posts[0],
              },
              {
                post: posts[1],
              },
            ],
            slug: "technology",
          },
        ]),
      },
      post: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue(posts),
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
    expect(prisma.category.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        select: expect.objectContaining({
          posts: expect.any(Object),
        }),
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
        publishedAt: new Date(`2026-04-${String(12 - index).padStart(2, "0")}T08:00:00.000Z`),
        slug: `story-${index + 1}`,
        translations: [
          {
            contentHtml: `<p>Story ${index + 1} body.</p>`,
            contentMd: `Story ${index + 1} body.`,
            locale: "en",
            seoRecord: null,
            sourceAttribution: "Source: Example Source - https://example.com/story",
            structuredContentJson: {
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
        publishedAt: new Date(`2026-04-${String(12 - index).padStart(2, "0")}T08:00:00.000Z`),
        slug: `story-${index + 1}`,
        translations: [
          {
            contentHtml: `<p>Story ${index + 1} body.</p>`,
            contentMd: `Story ${index + 1} body.`,
            locale: "en",
            seoRecord: null,
            sourceAttribution: "Source: Example Source - https://example.com/story",
            structuredContentJson: {
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
      sourceName: "Example Source",
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
                  providerCountriesJson: {
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
        publishedAt: new Date("2026-04-07T08:00:00.000Z"),
        slug: "weekly-briefing",
        sourceName: "Daily Ledger",
        translations: [
          {
            contentMd: "This weekly briefing focuses on climate policy funding and implementation details.",
            locale: "en",
            seoRecord: null,
            structuredContentJson: {
              sections: [],
            },
            summary: "Editorial roundup",
            title: "Weekly briefing",
          },
        ],
      }),
      createPublishedPost({
        id: "post_source",
        publishedAt: new Date("2026-04-06T08:00:00.000Z"),
        slug: "market-wrap",
        sourceName: "Climate Policy Daily",
        translations: [
          {
            contentMd: "Global markets and regulation roundup.",
            locale: "en",
            seoRecord: null,
            structuredContentJson: {
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
        publishedAt: new Date("2026-04-05T08:00:00.000Z"),
        slug: "global-outlook",
        sourceName: "World Desk",
        translations: [
          {
            contentMd: "International reporting and analysis.",
            locale: "en",
            seoRecord: null,
            structuredContentJson: {
              sections: [],
            },
            summary: "Broader context",
            title: "Global outlook",
          },
        ],
      }),
      createPublishedPost({
        id: "post_title",
        publishedAt: new Date("2026-04-04T08:00:00.000Z"),
        slug: "climate-policy-briefing",
        sourceName: "Wire Desk",
        translations: [
          {
            contentMd: "Policy background and timeline.",
            locale: "en",
            seoRecord: null,
            structuredContentJson: {
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
        publishedAt: new Date(`2026-03-${String(20 - index).padStart(2, "0")}T08:00:00.000Z`),
        slug: `election-brief-${index + 1}`,
        sourceName: `Desk ${index + 1}`,
        translations: [
          {
            contentMd: `Election body ${index + 1}.`,
            locale: "en",
            seoRecord: null,
            structuredContentJson: {
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
        publishedAt: new Date("2026-04-08T08:00:00.000Z"),
        slug: "most-recent-analysis",
        sourceName: "Metro Desk",
        translations: [
          {
            contentMd: "This long analysis includes election context but not in the title.",
            locale: "en",
            seoRecord: null,
            structuredContentJson: {
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
              imageUrl: null,
            },
            sourceName: "",
            translations: [
              {
                contentMd: "Health policy coverage without a summary or image still needs a readable fallback.",
                locale: "en",
                seoRecord: null,
                structuredContentJson: {
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
      sourceName: "",
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
            providerCountriesJson: ["us", "gb"],
          },
          {
            providerCountriesJson: ["us"],
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

  it("builds a story page with source attribution and related stories", async () => {
    const prisma = {
      post: {
        findFirst: vi.fn().mockResolvedValue(createPublishedPost()),
        findMany: vi.fn().mockResolvedValue([
          createPublishedPost({
            id: "post_2",
            publishedAt: new Date("2026-04-02T08:00:00.000Z"),
            slug: "related-story",
            translations: [
              {
                contentHtml: "<p>Related body.</p>",
                contentMd: "Related body.",
                locale: "en",
                seoRecord: null,
                sourceAttribution: "Source: Example Source - https://example.com/story",
                structuredContentJson: {
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
      canonicalUrl: "https://example.com/en/news/breaking-story",
      openGraphDescription: "Breaking story open graph description",
      openGraphTitle: "Breaking story open graph title",
      path: "/en/news/breaking-story",
      seoImage: {
        url: "https://cdn.example.com/story-seo.jpg",
      },
      sourceAttribution: "Source: Example Source - https://example.com/story",
      sourceName: "Example Source",
      title: "Breaking story",
      twitterDescription: "Breaking story twitter description",
      twitterTitle: "Breaking story twitter title",
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
              contentHtml: "<p>Breaking story body.</p>",
              contentMd: "Breaking story body.",
              locale: "en",
              seoRecord: {
                authorsJson: [],
                canonicalUrl: "https://example.com/en/news/breaking-story",
                keywordsJson: ["breaking", "technology"],
                metaDescription: "Breaking story meta description",
                metaTitle: "Breaking story meta title",
                noindex: true,
                ogDescription: "Breaking story open graph description",
                ogImage: {
                  alt: "Breaking story SEO image",
                  caption: "SEO image",
                  height: 630,
                  publicUrl: "https://cdn.example.com/story-seo.jpg",
                  sourceUrl: null,
                  width: 1200,
                },
                ogTitle: "Breaking story open graph title",
                twitterDescription: "Breaking story twitter description",
                twitterTitle: "Breaking story twitter title",
              },
              sourceAttribution: "Source: Example Source - https://example.com/story",
              structuredContentJson: {
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
      url: "https://cdn.example.com/story-seo.jpg",
    });
  });

  it("maps source media from structured content and source-image fallbacks", async () => {
    const prisma = {
      post: {
        findFirst: vi.fn().mockResolvedValue(createPublishedPost({
          featuredImage: null,
          sourceArticle: {
            imageUrl: "https://cdn.example.com/source-fallback.jpg",
          },
          translations: [
            {
              contentHtml: "<p>Story body with media.</p>",
              contentMd: "Story body with media.",
              locale: "en",
              seoRecord: null,
              sourceAttribution: "Source: Example Source - https://example.com/story",
              structuredContentJson: {
                sections: [
                  {
                    images: [
                      {
                        alt: "Gallery image",
                        sourceUrl: "https://cdn.example.com/gallery-image.jpg",
                      },
                    ],
                    kind: "image_gallery",
                    title: "Gallery",
                    videos: [
                      {
                        mimeType: "video/mp4",
                        posterUrl: "https://cdn.example.com/video-poster.jpg",
                        sourceUrl: "https://cdn.example.com/story-video.mp4",
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
              imageUrl: "https://cdn.example.com/source-fallback.jpg",
            },
            translations: [
              {
                contentHtml: "<p>Story body with media.</p>",
                contentMd: "Story body with media.",
                locale: "en",
                seoRecord: null,
                sourceAttribution: "Source: Example Source - https://example.com/story",
                structuredContentJson: {
                  sections: [
                    {
                      kind: "image_gallery",
                      title: "Gallery",
                      videos: [
                        {
                          mimeType: "video/mp4",
                          sourceUrl: "https://cdn.example.com/story-video.mp4",
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
      url: "https://cdn.example.com/source-fallback.jpg",
    });
    expect(storyPageData.article.media).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: "image",
          url: "https://cdn.example.com/gallery-image.jpg",
        }),
        expect.objectContaining({
          kind: "video",
          url: "https://cdn.example.com/story-video.mp4",
        }),
      ]),
    );
    expect(storyPageData.article.primaryMedia).toMatchObject({
      kind: "image",
      url: "https://cdn.example.com/gallery-image.jpg",
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
        imageUrl: null,
      },
      translations: [
        {
          contentHtml: "<p>Imageless story body.</p>",
          contentMd: "Imageless story body.",
          locale: "en",
          seoRecord: null,
          sourceAttribution: "Source: Example Source - https://example.com/story",
          structuredContentJson: {
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
