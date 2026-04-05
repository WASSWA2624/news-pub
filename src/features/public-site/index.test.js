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
    sourceName: "Example Source",
    sourceUrl: "https://example.com/story",
    status: "PUBLISHED",
    translations: [
      {
        contentHtml: "<p>Breaking story body.</p>",
        contentMd: "Breaking story body.",
        locale: "en",
        seoRecord: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          keywordsJson: ["breaking", "technology"],
          metaDescription: "Breaking story meta description",
          metaTitle: "Breaking story meta title",
          ogImage: null,
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
    expect(pageData.topCategories[0]).toMatchObject({
      count: 2,
      path: "/en/category/technology",
      slug: "technology",
    });
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
    expect(snapshot.items[0]).toMatchObject({
      path: "/en/news/breaking-story",
      sourceName: "Example Source",
      title: "Breaking story",
    });
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
      canonicalUrl: "https://example.com/en/news/breaking-story",
      path: "/en/news/breaking-story",
      sourceAttribution: "Source: Example Source - https://example.com/story",
      sourceName: "Example Source",
      title: "Breaking story",
    });
    expect(pageData.relatedStories[0]).toMatchObject({
      path: "/en/news/related-story",
      title: "Related story",
    });
  });
});
