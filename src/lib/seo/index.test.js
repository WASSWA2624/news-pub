import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    ADMIN_SEED_EMAIL: "admin@example.com",
    ADMIN_SEED_PASSWORD: "password123",
    AI_MODEL_DEFAULT: "gpt-5.4",
    AI_MODEL_FALLBACK: "gpt-5.4-mini",
    AI_PROVIDER_DEFAULT: "openai",
    AI_PROVIDER_FALLBACK: "openai",
    COMMENT_CAPTCHA_ENABLED: "false",
    COMMENT_RATE_LIMIT_MAX: "5",
    COMMENT_RATE_LIMIT_WINDOW_MS: "60000",
    CRON_SECRET: "cron-secret",
    DATABASE_URL: "mysql://user:pass@localhost:3306/equip_blog",
    DEFAULT_LOCALE: "en",
    LOCAL_MEDIA_BASE_PATH: "d:/coding/apps/equip-blog/public/uploads",
    LOCAL_MEDIA_BASE_URL: "/uploads",
    MEDIA_DRIVER: "local",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    OPENAI_API_KEY: "test-openai-key",
    REVALIDATE_SECRET: "revalidate-secret",
    SESSION_MAX_AGE_SECONDS: "3600",
    SESSION_SECRET: "session-secret",
    SUPPORTED_LOCALES: "en",
    UPLOAD_ALLOWED_MIME_TYPES: "image/png,image/jpeg",
  };
}

const originalEnv = process.env;

describe("seo helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds absolute metadata with default social images for a single locale release", async () => {
    const { buildPageMetadata } = await import("./index");

    const metadata = buildPageMetadata({
      description: "Browse the published library.",
      locale: "en",
      noindex: true,
      segments: ["blog"],
      title: "Published blog",
    });

    expect(metadata.alternates).toEqual({
      canonical: "https://example.com/en/blog",
    });
    expect(metadata.openGraph.images).toEqual([
      {
        alt: "Published blog",
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
        description: "About the project.",
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

  it("builds structured data payloads for article, breadcrumb, and faq output", async () => {
    const {
      buildArticleJsonLd,
      buildBreadcrumbJsonLd,
      buildFaqJsonLd,
      extractFaqItemsFromSections,
    } = await import("./index");
    const bodySections = [
      {
        id: "definition_and_overview",
        kind: "text",
        paragraphs: ["Microscopes magnify small structures for inspection."],
        title: "Definition and overview",
      },
      {
        id: "faq",
        items: [
          {
            answer: "It magnifies small specimens.",
            question: "What is a microscope used for?",
          },
        ],
        kind: "faq",
        title: "FAQ",
      },
    ];
    const faqItems = extractFaqItemsFromSections(bodySections);
    const breadcrumb = buildBreadcrumbJsonLd([
      {
        href: "/en",
        label: "Home",
      },
      {
        href: "/en/blog",
        label: "Blog",
      },
      {
        href: "/en/blog/microscope-basics",
        label: "Microscope basics",
      },
    ]);
    const article = buildArticleJsonLd({
      article: {
        authorName: "Equip Blog Editorial",
        bodySections,
        categories: [{ name: "Maintenance" }],
        equipment: { name: "Microscope" },
        excerpt: "Microscope overview.",
        heroImages: [{ alt: "Microscope", url: "https://cdn.example.com/microscope.jpg" }],
        manufacturers: [{ name: "Olympus" }],
        metadata: {
          description: "Microscope meta description",
          keywords: ["Microscope", "Maintenance"],
          title: "Microscope meta title",
        },
        publishedAt: "2026-04-03T08:00:00.000Z",
        title: "Microscope basics",
        updatedAt: "2026-04-03T09:00:00.000Z",
        url: "https://example.com/en/blog/microscope-basics",
      },
      locale: "en",
    });
    const faq = buildFaqJsonLd(faqItems);

    expect(breadcrumb.itemListElement).toHaveLength(3);
    expect(article).toMatchObject({
      "@type": "Article",
      headline: "Microscope meta title",
      inLanguage: "en",
      url: "https://example.com/en/blog/microscope-basics",
    });
    expect(faq).toMatchObject({
      "@type": "FAQPage",
    });
    expect(faq.mainEntity[0]).toMatchObject({
      name: "What is a microscope used for?",
    });
  });
});
