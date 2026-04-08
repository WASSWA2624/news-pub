import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("seo helpers", () => {
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

  it("builds absolute metadata with default social images for a single-locale release", async () => {
    const { buildPageMetadata } = await import("./index");

    const metadata = buildPageMetadata({
      authors: ["NewsPub Editorial"],
      description: "Browse the published story library.",
      locale: "en",
      noindex: true,
      openGraphDescription: "Open graph description",
      openGraphTitle: "Open graph title",
      segments: ["news"],
      title: "Published stories",
      twitterDescription: "Twitter description",
      twitterTitle: "Twitter title",
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://example.com/en/news",
    });
    expect(metadata.openGraph.images).toEqual([
      {
        alt: "Published stories",
        url: "https://example.com/opengraph-image",
      },
    ]);
    expect(metadata.twitter.images).toEqual(["https://example.com/twitter-image"]);
    expect(metadata.authors).toEqual([{ name: "NewsPub Editorial" }]);
    expect(metadata.openGraph).toMatchObject({
      authors: ["NewsPub Editorial"],
      description: "Open graph description",
      title: "Open graph title",
    });
    expect(metadata.robots).toMatchObject({
      follow: true,
      index: false,
    });
    expect(metadata.twitter).toMatchObject({
      description: "Twitter description",
      title: "Twitter title",
    });
  });

  it("emits locale alternates and x-default when multiple locales are enabled", async () => {
    vi.resetModules();
    vi.doMock("@/features/i18n/config", () => ({
      defaultLocale: "en",
      isSupportedLocale: (locale) => ["en", "fr"].includes(locale),
      supportedLocales: ["en", "fr"],
    }));

    try {
      const { buildPageMetadata } = await import("./index");

      const metadata = buildPageMetadata({
        description: "About NewsPub.",
        locale: "en",
        locales: ["en", "fr"],
        segments: ["about"],
        title: "About",
      });

      expect(metadata.alternates).toEqual({
        canonical: "https://example.com/en/about",
        languages: {
          en: "https://example.com/en/about",
          fr: "https://example.com/fr/about",
          "x-default": "https://example.com/en/about",
        },
      });
    } finally {
      vi.doUnmock("@/features/i18n/config");
    }
  });

  it("builds structured data payloads for organization, breadcrumb, and article output", async () => {
    const {
      buildArticleJsonLd,
      buildBreadcrumbJsonLd,
      buildOrganizationJsonLd,
    } = await import("./index");

    const organization = buildOrganizationJsonLd({
      description: "Reuse-first news publishing.",
      locale: "en",
      name: "NewsPub",
    });
    const breadcrumb = buildBreadcrumbJsonLd([
      {
        href: "/en",
        label: "Home",
      },
      {
        href: "/en/news",
        label: "News",
      },
      {
        href: "/en/news/breaking-story",
        label: "Breaking story",
      },
    ]);
    const article = buildArticleJsonLd({
      article: {
        authors: ["NewsPub Editorial", "Jane Reporter"],
        canonicalUrl: "https://example.com/en/news/breaking-story",
        categories: [
          {
            name: "Technology",
          },
          {
            name: "AI",
          },
        ],
        contentHtml: "<p>Breaking story summary with enough words to count accurately.</p>",
        image: {
          url: "https://cdn.example.com/story.jpg",
        },
        keywords: ["breaking", "technology"],
        locale: "en",
        metaDescription: "Breaking story meta description.",
        metaTitle: "Breaking story meta title",
        publishedAt: "2026-04-03T08:00:00.000Z",
        seoImage: {
          url: "https://cdn.example.com/story-seo.jpg",
        },
        summary: "Breaking story summary.",
        title: "Breaking story",
        updatedAt: "2026-04-03T09:00:00.000Z",
      },
    });

    expect(organization).toMatchObject({
      "@type": "Organization",
      url: "https://example.com/en",
    });
    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(article).toMatchObject({
      "@type": "NewsArticle",
      articleSection: "Technology",
      alternativeHeadline: "Breaking story meta title",
      headline: "Breaking story",
      inLanguage: "en",
      keywords: "breaking, technology",
      thumbnailUrl: "https://cdn.example.com/story-seo.jpg",
      url: "https://example.com/en/news/breaking-story",
    });
    expect(article.author).toEqual([
      {
        "@type": "Organization",
        name: "NewsPub Editorial",
      },
      {
        "@type": "Person",
        name: "Jane Reporter",
      },
    ]);
    expect(article.about).toEqual([
      {
        "@type": "Thing",
        name: "Technology",
      },
      {
        "@type": "Thing",
        name: "AI",
      },
    ]);
    expect(article.image).toEqual(["https://cdn.example.com/story-seo.jpg"]);
    expect(article.wordCount).toBeGreaterThan(0);
  });
});
