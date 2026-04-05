import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseServerEnv() {
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

function createListPost(overrides = {}) {
  return {
    categories: [
      {
        category: {
          id: "category_1",
          name: "Maintenance",
          slug: "maintenance",
        },
      },
    ],
    equipment: {
      id: "equipment_1",
      name: "Microscope",
      slug: "microscope",
    },
    excerpt: "Base excerpt",
    featuredImage: {
      alt: "Microscope",
      attributionText: null,
      caption: "Bench microscope",
      licenseType: null,
      publicUrl: "https://cdn.example.com/microscope.jpg",
      sourceUrl: null,
    },
    id: "post_1",
    manufacturers: [
      {
        manufacturer: {
          id: "manufacturer_1",
          name: "Olympus",
          slug: "olympus",
        },
      },
    ],
    publishedAt: new Date("2026-04-03T08:00:00.000Z"),
    slug: "microscope-basics",
    tags: [
      {
        tag: {
          id: "tag_1",
          name: "Optics",
          slug: "optics",
        },
      },
    ],
    translations: [
      {
        contentHtml: "<p>Localized microscope body text.</p>",
        contentMd: "Localized microscope body text.",
        excerpt: "Localized excerpt",
        faqJson: [],
        locale: "en",
        structuredContentJson: {
          sections: [],
        },
        title: "Microscope basics",
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
      ...createBaseServerEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("lists published posts as public cards with pagination metadata", async () => {
    const prisma = {
      post: {
        count: vi.fn().mockResolvedValue(2),
        findMany: vi.fn().mockResolvedValue([
          createListPost(),
          createListPost({
            id: "post_2",
            slug: "centrifuge-guide",
            equipment: {
              name: "Centrifuge",
              slug: "centrifuge",
            },
            translations: [
              {
                excerpt: "Centrifuge excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Centrifuge guide",
              },
            ],
          }),
        ]),
      },
    };
    const { listPublishedPosts } = await import("./index");

    const snapshot = await listPublishedPosts(
      {
        locale: "en",
        page: "1",
      },
      prisma,
    );

    expect(prisma.post.count).toHaveBeenCalledTimes(1);
    expect(prisma.post.findMany).toHaveBeenCalledTimes(1);
    expect(snapshot.search).toBe("");
    expect(snapshot.pagination).toMatchObject({
      currentPage: 1,
      totalItems: 2,
      totalPages: 1,
    });
    expect(snapshot.posts[0]).toMatchObject({
      excerpt: "Localized excerpt",
      path: "/en/blog/microscope-basics",
      title: "Microscope basics",
      url: "https://example.com/en/blog/microscope-basics",
    });
    expect(snapshot.posts[0].categories[0]).toEqual({
      name: "Maintenance",
      path: "/en/category/maintenance",
      slug: "maintenance",
    });
  });

  it("searches published posts with title-first ranking across title, body text, tags, equipment, and manufacturers", async () => {
    const prisma = {
      post: {
        findMany: vi.fn().mockResolvedValue([
          createListPost({
            id: "post_exact",
            publishedAt: new Date("2026-04-01T08:00:00.000Z"),
            slug: "microscope",
            translations: [
              {
                contentHtml: "<p>Exact title match body.</p>",
                contentMd: "Exact title match body.",
                excerpt: "Exact title excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Microscope",
              },
            ],
          }),
          createListPost({
            id: "post_prefix",
            publishedAt: new Date("2026-04-02T08:00:00.000Z"),
            slug: "microscope-maintenance",
            translations: [
              {
                contentHtml: "<p>Prefix title match body.</p>",
                contentMd: "Prefix title match body.",
                excerpt: "Prefix title excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Microscope maintenance checklist",
              },
            ],
          }),
          createListPost({
            categories: [
              {
                category: {
                  id: "category_2",
                  name: "Calibration",
                  slug: "calibration",
                },
              },
            ],
            equipment: {
              id: "equipment_2",
              name: "Inspection rig",
              slug: "inspection-rig",
            },
            id: "post_weighted",
            manufacturers: [
              {
                manufacturer: {
                  id: "manufacturer_2",
                  name: "Acme Instruments",
                  slug: "acme-instruments",
                },
              },
            ],
            publishedAt: new Date("2026-04-03T08:00:00.000Z"),
            slug: "optics-workflow",
            tags: [
              {
                tag: {
                  id: "tag_2",
                  name: "Stage care",
                  slug: "microscope-stage",
                },
              },
            ],
            translations: [
              {
                contentHtml: "<p>Microscope stage calibration keeps image alignment reliable.</p>",
                contentMd: "Microscope stage calibration keeps image alignment reliable.",
                excerpt: "Optics workflow excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Optics workflow",
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
        search: " microscope ",
      },
      prisma,
    );

    expect(prisma.post.findMany).toHaveBeenCalledTimes(1);
    expect(snapshot.search).toBe("microscope");
    expect(snapshot.posts.map((post) => post.slug)).toEqual([
      "microscope",
      "microscope-maintenance",
      "optics-workflow",
    ]);

    const where = prisma.post.findMany.mock.calls[0][0].where;
    const translationSearch = where.OR.find((entry) => entry.translations?.some);

    expect(where.OR.some((entry) => entry.equipment?.name)).toBe(true);
    expect(where.OR.some((entry) => entry.manufacturers?.some)).toBe(true);
    expect(where.OR.some((entry) => entry.tags?.some)).toBe(true);
    expect(where.OR.some((entry) => entry.categories)).toBe(false);
    expect(where.OR.some((entry) => entry.slug)).toBe(false);
    expect(translationSearch.translations.some.OR.some((entry) => entry.title)).toBe(true);
    expect(translationSearch.translations.some.OR.some((entry) => entry.excerpt)).toBe(true);
    expect(translationSearch.translations.some.OR.some((entry) => entry.contentMd)).toBe(true);
    expect(translationSearch.translations.some.OR.some((entry) => entry.contentHtml)).toBe(true);
  });

  it("builds a public post page with ordered sections, fallback content, related posts, and approved comments", async () => {
    const postRecord = {
      author: {
        name: "Equip Blog Editorial",
      },
      categories: [
        {
          category: {
            id: "category_1",
            name: "Maintenance",
            slug: "maintenance",
          },
        },
      ],
      equipment: {
        description: "Optical inspection equipment",
        id: "equipment_1",
        name: "microscope",
        slug: "microscope",
      },
      excerpt: "Fallback excerpt",
      featuredImage: {
        alt: "Microscope",
        attributionText: null,
        caption: "Primary microscope image",
        isAiGenerated: true,
        licenseType: null,
        localPath: "public/uploads/media/microscope-primary.png",
        publicUrl: "/uploads/media/microscope-primary.png",
        sourceUrl: null,
        storageDriver: "local",
        storageKey: "media/microscope-primary.png",
      },
      id: "post_1",
      manufacturers: [
        {
          manufacturer: {
            id: "manufacturer_1",
            name: "Olympus",
            slug: "olympus",
          },
        },
      ],
      tags: [
        {
          tag: {
            id: "tag_1",
            name: "Optics",
            slug: "optics",
          },
        },
      ],
      publishedAt: new Date("2026-04-03T08:00:00.000Z"),
      slug: "microscope-basics",
      sourceReferences: [
        {
          accessStatus: "available",
          fileType: "PDF",
          id: "ref_manual_1",
          language: "English",
          lastCheckedAt: new Date("2026-04-02T08:00:00.000Z"),
          notes: "Official maintenance manual with cleaning and inspection guidance.",
          sourceType: "OFFICIAL_MANUAL",
          title: "Microscope service manual",
          url: "https://example.com/manual.pdf",
        },
        {
          accessStatus: "available",
          fileType: null,
          id: "ref_definition_1",
          language: "English",
          lastCheckedAt: new Date("2026-04-01T08:00:00.000Z"),
          notes: "Trusted biomedical reference for microscope fundamentals.",
          sourceType: "TRUSTED_BIOMEDICAL_REFERENCE",
          title: "Microscope fundamentals",
          url: "https://example.com/microscope-fundamentals",
        },
      ],
      status: "PUBLISHED",
      translations: [
        {
          disclaimer: "English disclaimer",
          excerpt: "Localized excerpt",
          faqJson: [
            {
              answer: "It magnifies specimens.",
              question: "What is a microscope used for?",
            },
          ],
          locale: "en",
          seoRecord: {
            authorsJson: ["Equip Blog Editorial"],
            canonicalUrl: "https://example.com/en/blog/microscope-basics",
            keywordsJson: ["Microscope", "Maintenance"],
            metaDescription: "Microscope meta description",
            metaTitle: "microscope meta title",
            noindex: false,
            ogDescription: "Microscope meta description",
            ogImage: null,
            ogTitle: "microscope meta title",
            twitterDescription: "Microscope meta description",
            twitterTitle: "microscope meta title",
          },
          structuredContentJson: {
            sections: [
              {
                id: "featured_image",
                images: [
                  {
                    alt: "Secondary microscope image",
                    caption: "Secondary view",
                    url: "https://cdn.example.com/microscope-secondary.jpg",
                  },
                ],
                kind: "image_gallery",
                title: "Featured image",
              },
              {
                id: "definition_and_overview",
                kind: "text",
                paragraphs: ["Microscopes magnify small structures for inspection."],
                sourceReferenceIds: ["ref_definition_1"],
                title: "Definition and overview",
              },
              {
                id: "components_visual_guide",
                images: [
                  {
                    alt: "Microscope focus controls",
                    caption: "Focus controls and stage arrangement",
                    sourceUrl: "https://cdn.example.com/microscope-controls.jpg",
                  },
                ],
                kind: "image_gallery",
                title: "Components visual guide",
              },
              {
                groups: [
                  {
                    manufacturer: "Northfield Optics",
                    models: [
                      {
                        images: [
                          {
                            alt: "CompoundLab 200 microscope",
                            sourceUrl: "https://cdn.example.com/compoundlab-200.jpg",
                          },
                        ],
                        latestKnownYear: 2025,
                        name: "CompoundLab 200",
                        summary: "Entry-level teaching microscope.",
                      },
                    ],
                  },
                ],
                id: "commonly_encountered_models",
                kind: "models_by_manufacturer",
                title: "Commonly encountered models by manufacturer",
              },
              {
                id: "uses_and_applications",
                items: [
                  {
                    details: "Supports routine laboratory bench inspection and teaching workflows.",
                    images: [
                      {
                        alt: "Microscope on laboratory bench",
                        sourceUrl: "https://cdn.example.com/microscope-bench-inline.jpg",
                      },
                    ],
                    label: "Bench inspection",
                  },
                ],
                kind: "checklist",
                title: "Uses and applications",
              },
              {
                id: "manuals_and_technical_documents",
                items: [
                  {
                    sourceReferenceIds: ["ref_manual_1"],
                    title: "Microscope service manual",
                    url: "https://example.com/manual.pdf",
                  },
                ],
                kind: "manuals",
                title: "Manuals and technical documents",
              },
            ],
          },
          title: "microscope basics",
          updatedAt: new Date("2026-04-03T09:30:00.000Z"),
        },
      ],
      updatedAt: new Date("2026-04-03T09:45:00.000Z"),
    };
    const prisma = {
      comment: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([
          {
            body: "Very helpful summary.",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            id: "comment_1",
            name: "Amina",
            replies: [
              {
                body: "Thanks for reading.",
                createdAt: new Date("2026-04-03T10:30:00.000Z"),
                id: "reply_1",
                name: "Editor",
              },
            ],
          },
        ]),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([
          createListPost({
            categories: postRecord.categories,
            equipment: postRecord.equipment,
            featuredImage: postRecord.featuredImage,
            id: "post_2",
            manufacturers: postRecord.manufacturers,
            publishedAt: new Date("2026-04-02T08:00:00.000Z"),
            slug: "microscope-maintenance",
            tags: postRecord.tags,
            translations: [
              {
                contentHtml: "<p>Maintenance body text.</p>",
                contentMd: "Maintenance body text.",
                excerpt: "Maintenance post excerpt",
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "microscope maintenance",
              },
            ],
          }),
        ]),
        findUnique: vi.fn().mockResolvedValue(postRecord),
      },
    };
    const { getPublishedPostPageData } = await import("./index");

    const pageData = await getPublishedPostPageData(
      {
        commentsPage: "1",
        locale: "en",
        slug: "microscope-basics",
      },
      prisma,
    );

    expect(pageData.article.metadata).toMatchObject({
      authors: ["Equip Blog Editorial"],
      description: "Microscope meta description",
      keywords: ["Microscope", "Maintenance"],
      noindex: false,
      ogDescription: "Microscope meta description",
      ogImage: null,
      ogTitle: "Microscope meta title",
      title: "Microscope meta title",
      twitterDescription: "Microscope meta description",
      twitterTitle: "Microscope meta title",
    });
    expect(pageData.article.equipment.name).toBe("Microscope");
    expect(pageData.article.title).toBe("Microscope basics");
    expect(pageData.article.heroImages).toHaveLength(2);
    expect(pageData.article.heroImages[0]).toMatchObject({
      href: "/uploads/media/microscope-primary.png",
      renderInline: true,
      url: "/uploads/media/microscope-primary.png",
    });
    expect(pageData.article.heroImages[1]).toMatchObject({
      href: "https://cdn.example.com/microscope-secondary.jpg",
      renderInline: true,
      url: "https://cdn.example.com/microscope-secondary.jpg",
    });
    expect(pageData.article.bodySections.map((section) => section.id)).toEqual([
      "definition_and_overview",
      "components_visual_guide",
      "uses_and_applications",
      "commonly_encountered_models",
      "manuals_and_technical_documents",
      "faq",
      "references",
      "disclaimer",
    ]);
    expect(pageData.article.bodySections.find((section) => section.id === "components_visual_guide"))
      .toMatchObject({
        images: [
          expect.objectContaining({
            caption: "Focus controls and stage arrangement",
            href: "https://cdn.example.com/microscope-controls.jpg",
            renderInline: true,
            url: "https://cdn.example.com/microscope-controls.jpg",
          }),
        ],
      });
    expect(pageData.article.bodySections.find((section) => section.id === "definition_and_overview"))
      .toMatchObject({
        sourceReferenceIds: ["ref_definition_1"],
        sourceReferences: [
          {
            id: "ref_definition_1",
            title: "Microscope fundamentals",
          },
        ],
      });
    expect(pageData.article.bodySections.find((section) => section.id === "uses_and_applications"))
      .toMatchObject({
        items: [
          {
            description: "Supports routine laboratory bench inspection and teaching workflows.",
            images: [
              expect.objectContaining({
                href: "https://cdn.example.com/microscope-bench-inline.jpg",
                renderInline: true,
                url: "https://cdn.example.com/microscope-bench-inline.jpg",
              }),
            ],
            title: "Bench inspection",
          },
        ],
        kind: "list",
      });
    expect(pageData.article.bodySections.find((section) => section.id === "commonly_encountered_models"))
      .toMatchObject({
        groups: [
          expect.objectContaining({
            models: [
              expect.objectContaining({
                images: [
                  expect.objectContaining({
                    href: "https://cdn.example.com/compoundlab-200.jpg",
                    renderInline: true,
                    url: "https://cdn.example.com/compoundlab-200.jpg",
                  }),
                ],
              }),
            ],
          }),
        ],
        title: "Commonly encountered models",
      });
    expect(
      pageData.article.bodySections.find((section) => section.id === "manuals_and_technical_documents")
        ?.items[0],
    ).toMatchObject({
      accessStatus: "available",
      lastCheckedAt: "2026-04-02T08:00:00.000Z",
      notes: "Official maintenance manual with cleaning and inspection guidance.",
      sourceReferenceIds: ["ref_manual_1"],
      title: "Microscope service manual",
    });
    expect(pageData.article.comments.items[0]).toMatchObject({
      body: "Very helpful summary.",
      name: "Amina",
      replies: [
        {
          body: "Thanks for reading.",
          name: "Editor",
        },
      ],
    });
    expect(pageData.article.relatedPosts[0]).toMatchObject({
      path: "/en/blog/microscope-maintenance",
      title: "Microscope maintenance",
    });
  });

  it("orders related posts by overlap count after respecting the active locale", async () => {
    const currentPost = createListPost({
      id: "post_current",
    });
    const prisma = {
      post: {
        findMany: vi.fn().mockResolvedValue([
          createListPost({
            id: "post_high_overlap",
            publishedAt: new Date("2026-04-01T08:00:00.000Z"),
            slug: "microscope-optics-deep-dive",
            tags: [
              {
                tag: {
                  id: "tag_1",
                  name: "Optics",
                  slug: "optics",
                },
              },
            ],
            translations: [
              {
                contentHtml: "<p>High overlap body.</p>",
                contentMd: "High overlap body.",
                excerpt: "High overlap excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Microscope optics deep dive",
              },
            ],
          }),
          createListPost({
            categories: [
              {
                category: {
                  id: "category_2",
                  name: "Calibration",
                  slug: "calibration",
                },
              },
            ],
            id: "post_low_overlap",
            manufacturers: [
              {
                manufacturer: {
                  id: "manufacturer_2",
                  name: "Acme Instruments",
                  slug: "acme-instruments",
                },
              },
            ],
            publishedAt: new Date("2026-04-03T08:00:00.000Z"),
            slug: "microscope-cleaning-notes",
            tags: [
              {
                tag: {
                  id: "tag_2",
                  name: "Cleaning",
                  slug: "cleaning",
                },
              },
            ],
            translations: [
              {
                contentHtml: "<p>Low overlap body.</p>",
                contentMd: "Low overlap body.",
                excerpt: "Low overlap excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Microscope cleaning notes",
              },
            ],
          }),
          createListPost({
            id: "post_mid_overlap",
            manufacturers: [
              {
                manufacturer: {
                  id: "manufacturer_1",
                  name: "Olympus",
                  slug: "olympus",
                },
              },
            ],
            publishedAt: new Date("2026-04-02T08:00:00.000Z"),
            slug: "microscope-olympus-workflow",
            tags: [
              {
                tag: {
                  id: "tag_2",
                  name: "Calibration",
                  slug: "calibration",
                },
              },
            ],
            translations: [
              {
                contentHtml: "<p>Mid overlap body.</p>",
                contentMd: "Mid overlap body.",
                excerpt: "Mid overlap excerpt",
                faqJson: [],
                locale: "en",
                structuredContentJson: {
                  sections: [],
                },
                title: "Microscope Olympus workflow",
              },
            ],
          }),
        ]),
      },
    };
    const { listRelatedPublishedPosts } = await import("./index");

    const relatedPosts = await listRelatedPublishedPosts(
      {
        limit: 3,
        locale: "en",
        post: currentPost,
      },
      prisma,
    );

    expect(prisma.post.findMany).toHaveBeenCalledTimes(1);
    expect(relatedPosts.map((post) => post.slug)).toEqual([
      "microscope-optics-deep-dive",
      "microscope-olympus-workflow",
      "microscope-cleaning-notes",
    ]);
  });

  it("builds manufacturer landing pages from published post relationships", async () => {
    const prisma = {
      manufacturer: {
        findUnique: vi.fn().mockResolvedValue({
          branchCountriesJson: ["Japan", "Germany"],
          headquartersCountry: "Japan",
          id: "manufacturer_1",
          name: "Olympus",
          primaryDomain: "olympus.example",
          slug: "olympus",
        }),
      },
      post: {
        count: vi.fn().mockResolvedValue(1),
        findMany: vi.fn().mockResolvedValue([createListPost()]),
      },
    };
    const { getPublishedLandingPageData } = await import("./index");

    const pageData = await getPublishedLandingPageData(
      {
        entityKind: "manufacturer",
        locale: "en",
        slug: "olympus",
      },
      prisma,
    );

    expect(pageData.entity).toEqual({
      branchCountries: ["Japan", "Germany"],
      description: "olympus.example",
      headquartersCountry: "Japan",
      name: "Olympus",
      path: "/en/manufacturer/olympus",
      primaryDomain: "olympus.example",
      slug: "olympus",
      summary: "olympus.example",
      type: "manufacturer",
    });
    expect(pageData.discoverySections.map((section) => section.kind)).toEqual([
      "category",
      "equipment",
    ]);
    expect(pageData.posts[0].path).toBe("/en/blog/microscope-basics");
  });
});
