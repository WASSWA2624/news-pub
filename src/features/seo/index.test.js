import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

function createPublishedPost() {
  return {
    excerpt: "Story excerpt",
    publishAttempts: [
      {
        platform: "WEBSITE",
        status: "SUCCEEDED",
      },
    ],
    publishedAt: new Date("2026-04-03T08:00:00.000Z"),
    slug: "breaking-story",
    translations: [
      {
        locale: "en",
        seoRecord: {
          canonicalUrl: "https://example.com/en/news/breaking-story",
          metaDescription: "Breaking story meta description",
          metaTitle: "Breaking story meta title",
        },
        title: "Breaking story",
      },
    ],
    updatedAt: new Date("2026-04-03T09:00:00.000Z"),
  };
}

const originalEnv = process.env;

describe("seo feature inventory", () => {
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

  it("builds robots metadata for the current deployment url", async () => {
    const { getRobotsConfiguration } = await import("./index");

    expect(getRobotsConfiguration()).toEqual({
      host: "https://example.com",
      rules: [
        {
          allow: "/",
          disallow: ["/admin", "/api"],
          userAgent: "*",
        },
      ],
      sitemap: "https://example.com/sitemap.xml",
    });
  });

  it("builds sitemap entries for static, story, and category pages", async () => {
    const prisma = {
      category: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            name: "Technology",
            posts: [
              {
                post: {
                  publishAttempts: [
                    {
                      platform: "WEBSITE",
                      status: "SUCCEEDED",
                    },
                  ],
                  status: "PUBLISHED",
                },
              },
            ],
            slug: "technology",
            updatedAt: new Date("2026-04-03T09:30:00.000Z"),
          },
        ]),
      },
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([createPublishedPost()]),
      },
      postTranslation: {
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const { getSitemapEntries } = await import("./index");

    const entries = await getSitemapEntries(prisma);
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://example.com/en");
    expect(urls).toContain("https://example.com/en/news");
    expect(urls).toContain("https://example.com/en/about");
    expect(urls).toContain("https://example.com/en/news/breaking-story");
    expect(urls).toContain("https://example.com/en/category/technology");
    expect(urls).not.toContain("https://example.com/en/search");
  });

  it("falls back to static sitemap entries when published-content queries cannot reach the database", async () => {
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
      post: {
        findMany: vi.fn().mockRejectedValue(databaseError),
      },
    };
    const { getSitemapEntries } = await import("./index");

    const entries = await getSitemapEntries(prisma);
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://example.com/en");
    expect(urls).toContain("https://example.com/en/about");
    expect(urls).toContain("https://example.com/en/news");
    expect(urls).not.toContain("https://example.com/en/search");
    expect(urls).not.toContain("https://example.com/en/news/breaking-story");
  });

  it("builds an admin seo snapshot from published website metadata", async () => {
    const prisma = {
      category: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            name: "Technology",
            posts: [
              {
                post: {
                  publishAttempts: [
                    {
                      platform: "WEBSITE",
                      status: "SUCCEEDED",
                    },
                  ],
                  status: "PUBLISHED",
                },
              },
            ],
          },
        ]),
      },
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([createPublishedPost()]),
      },
      postTranslation: {
        count: vi.fn().mockResolvedValue(1),
      },
    };
    const { getSeoManagementSnapshot } = await import("./index");

    const snapshot = await getSeoManagementSnapshot(prisma);

    expect(snapshot.summary).toMatchObject({
      categoryPageCount: 1,
      publishedStoryCount: 1,
      searchRouteIndexed: false,
      storyLocalesCount: 1,
    });
    expect(snapshot.stories[0]).toMatchObject({
      canonicalUrl: "https://example.com/en/news/breaking-story",
      metaTitle: "Breaking story meta title",
      slug: "breaking-story",
    });
  });
});
