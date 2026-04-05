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
      description: "Browse the published story library.",
      locale: "en",
      noindex: true,
      segments: ["news"],
      title: "Published stories",
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
    expect(metadata.robots).toMatchObject({
      follow: true,
      index: false,
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
        canonicalUrl: "https://example.com/en/news/breaking-story",
        image: {
          url: "https://cdn.example.com/story.jpg",
        },
        locale: "en",
        publishedAt: "2026-04-03T08:00:00.000Z",
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
      headline: "Breaking story",
      inLanguage: "en",
      url: "https://example.com/en/news/breaking-story",
    });
  });
});
