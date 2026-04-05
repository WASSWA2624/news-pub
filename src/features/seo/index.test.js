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

function createPublishedPost() {
  return {
    categories: [
      {
        category: {
          name: "Maintenance",
          slug: "maintenance",
        },
      },
    ],
    equipment: {
      name: "Microscope",
      slug: "microscope",
      updatedAt: new Date("2026-04-03T09:30:00.000Z"),
    },
    featuredImage: {
      alt: "Microscope",
      caption: "Bench microscope",
      publicUrl: "https://cdn.example.com/microscope.jpg",
      sourceUrl: null,
    },
    id: "post_1",
    manufacturers: [
      {
        manufacturer: {
          name: "Olympus",
          slug: "olympus",
          updatedAt: new Date("2026-04-02T12:00:00.000Z"),
        },
      },
    ],
    publishedAt: new Date("2026-04-03T08:00:00.000Z"),
    slug: "microscope-basics",
    translations: [
      {
        excerpt: "Microscope excerpt",
        faqJson: [
          {
            answer: "It magnifies small specimens.",
            question: "What is a microscope used for?",
          },
        ],
        locale: "en",
        seoRecord: {
          authorsJson: ["Equip Blog Editorial"],
          canonicalUrl: "https://example.com/en/blog/microscope-basics",
          keywordsJson: ["Microscope", "Maintenance"],
          metaDescription: "Microscope meta description",
          metaTitle: "Microscope meta title",
          noindex: false,
          ogDescription: "Microscope meta description",
          ogImage: null,
          ogTitle: "Microscope meta title",
          twitterDescription: "Microscope meta description",
          twitterTitle: "Microscope meta title",
        },
        structuredContentJson: {
          sections: [],
        },
        title: "Microscope basics",
        updatedAt: new Date("2026-04-03T09:45:00.000Z"),
      },
    ],
    updatedAt: new Date("2026-04-03T10:00:00.000Z"),
  };
}

const originalEnv = process.env;

describe("seo feature inventory", () => {
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

  it("builds sitemap entries for static, post, and discovery pages", async () => {
    const prisma = {
      post: {
        findMany: vi.fn().mockResolvedValue([createPublishedPost()]),
      },
    };
    const { getSitemapEntries } = await import("./index");

    const entries = await getSitemapEntries(prisma);
    const urls = entries.map((entry) => entry.url);

    expect(urls).toContain("https://example.com/en");
    expect(urls).toContain("https://example.com/en/blog");
    expect(urls).toContain("https://example.com/en/blog/microscope-basics");
    expect(urls).toContain("https://example.com/en/category/maintenance");
    expect(urls).toContain("https://example.com/en/manufacturer/olympus");
    expect(urls).toContain("https://example.com/en/equipment/microscope");
    expect(urls).not.toContain("https://example.com/en/search");
  });

  it("builds an admin seo snapshot from published metadata", async () => {
    const prisma = {
      post: {
        findMany: vi.fn().mockResolvedValue([createPublishedPost()]),
      },
    };
    const { getSeoManagementSnapshot } = await import("./index");

    const snapshot = await getSeoManagementSnapshot(prisma);

    expect(snapshot.summary).toMatchObject({
      categoryPageCount: 1,
      equipmentPageCount: 1,
      faqPageCount: 1,
      manufacturerPageCount: 1,
      postPageCount: 1,
      publishedPostCount: 1,
      searchableStaticPageCount: 6,
      seoRecordCount: 1,
    });
    expect(snapshot.posts[0]).toMatchObject({
      canonicalUrl: "https://example.com/en/blog/microscope-basics",
      metaTitle: "Microscope meta title",
      path: "/en/blog/microscope-basics",
      schemaTypes: ["Organization", "BreadcrumbList", "Article", "FAQPage"],
      slug: "microscope-basics",
      title: "Microscope basics",
      twitterCard: "summary_large_image",
    });
    expect(snapshot.routes.indexableStaticRoutes.map((route) => route.key)).not.toContain("search");
  });
});
