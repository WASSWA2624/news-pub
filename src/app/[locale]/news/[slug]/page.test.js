import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("story detail route", () => {
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

  it("prefers dedicated story SEO fields when building metadata", async () => {
    const { buildStoryPageMetadata } = await import("./page-metadata");

    const metadata = buildStoryPageMetadata({
      locale: "en",
      messages: {
        site: {
          tagline: "NewsPub tagline",
          title: "NewsPub",
        },
      },
      pageData: {
        article: {
          authors: ["NewsPub Editorial"],
          canonicalUrl: "https://example.com/en/news/breaking-story",
          image: {
            url: "https://cdn.example.com/story.jpg",
          },
          keywords: ["breaking", "technology"],
          metaDescription: "Breaking story meta description",
          metaTitle: "Breaking story meta title",
          noindex: true,
          openGraphDescription: "Breaking story open graph description",
          openGraphTitle: "Breaking story open graph title",
          publishedAt: "2026-04-03T08:00:00.000Z",
          seoImage: {
            url: "https://cdn.example.com/story-seo.jpg",
          },
          summary: "Breaking story summary",
          twitterDescription: "Breaking story twitter description",
          twitterTitle: "Breaking story twitter title",
          updatedAt: "2026-04-03T09:00:00.000Z",
        },
        relatedStories: [],
      },
      slug: "breaking-story",
    });

    expect(metadata).toMatchObject({
      alternates: {
        canonical: "https://example.com/en/news/breaking-story",
      },
      authors: [{ name: "NewsPub Editorial" }],
      keywords: ["breaking", "technology"],
      title: "Breaking story meta title",
    });
    expect(metadata.openGraph).toMatchObject({
      description: "Breaking story open graph description",
      images: [
        {
          url: "https://cdn.example.com/story-seo.jpg",
        },
      ],
      modifiedTime: "2026-04-03T09:00:00.000Z",
      publishedTime: "2026-04-03T08:00:00.000Z",
      title: "Breaking story open graph title",
      type: "article",
    });
    expect(metadata.twitter).toEqual({
      card: "summary_large_image",
      description: "Breaking story twitter description",
      images: ["https://cdn.example.com/story-seo.jpg"],
      title: "Breaking story twitter title",
    });
    expect(metadata.robots).toMatchObject({
      follow: true,
      index: false,
    });
  });
});
