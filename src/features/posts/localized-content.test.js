import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DEFAULT_LOCALE: "en",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    SUPPORTED_LOCALES: "en",
  };
}

const originalEnv = process.env;

describe("localized content persistence", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.doUnmock("@/features/i18n/get-messages");
  });

  it("seeds the editor from the stored english translation when no locale-specific draft exists", async () => {
    vi.doMock("@/features/i18n/get-messages", () => ({
      getMessages: vi.fn(async () => ({
        post: {
          defaultDisclaimer: "English disclaimer",
        },
      })),
    }));

    const prisma = {
      locale: {
        upsert: vi.fn().mockResolvedValue(null),
      },
      post: {
        findUnique: vi.fn().mockResolvedValue({
          equipment: {
            name: "Microscope",
          },
          id: "post_1",
          publishedAt: null,
          slug: "microscope",
          status: "DRAFT",
          translations: [
            {
              contentHtml: "<p>Stored html</p>",
              contentMd: "Stored markdown",
              disclaimer: "Stored disclaimer",
              excerpt: "Stored excerpt",
              faqJson: [{ answer: "A", question: "Q" }],
              id: "translation_1",
              isAutoTranslated: false,
              locale: "en",
              structuredContentJson: { sections: ["overview"] },
              title: "Microscope",
              updatedAt: new Date("2026-04-03T08:00:00.000Z"),
            },
          ],
          updatedAt: new Date("2026-04-03T08:00:00.000Z"),
        }),
      },
    };
    const { getPostLocalizationEditor } = await import("./localized-content");

    const editor = await getPostLocalizationEditor({ locale: "en", postId: "post_1" }, prisma);

    expect(editor.translationSource).toBe("stored");
    expect(editor.translation).toMatchObject({
      contentHtml: "<p>Stored html</p>",
      contentMd: "Stored markdown",
      disclaimer: "Stored disclaimer",
      excerpt: "Stored excerpt",
      locale: "en",
      title: "Microscope",
    });
  });

  it("upserts a single english translation record and preserves markdown/html artifacts", async () => {
    vi.doMock("@/features/i18n/get-messages", () => ({
      getMessages: vi.fn(async () => ({
        post: {
          defaultDisclaimer: "English disclaimer",
        },
      })),
    }));

    const localeRecord = {
      code: "en",
      isActive: true,
      isDefault: true,
      name: "English",
    };
    const persistedTranslation = {
      contentHtml: "<p>Updated html</p>",
      contentMd: "# Updated markdown",
      disclaimer: "English disclaimer",
      excerpt: "Updated excerpt",
      faqJson: [],
      id: "translation_1",
      isAutoTranslated: false,
      locale: "en",
      structuredContentJson: { sections: ["overview"] },
      title: "Updated microscope",
      updatedAt: new Date("2026-04-03T09:00:00.000Z"),
    };
    const prisma = {
      $transaction: vi.fn(async (callback) =>
        callback({
          auditEvent: {
            create: vi.fn().mockResolvedValue(null),
          },
          post: {
            update: vi.fn().mockResolvedValue(null),
          },
          postTranslation: {
            upsert: vi.fn().mockResolvedValue(persistedTranslation),
          },
        }),
      ),
      locale: {
        findMany: vi.fn().mockResolvedValue([localeRecord]),
        upsert: vi.fn().mockResolvedValue(null),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([
          {
            equipment: {
              name: "Microscope",
            },
            id: "post_1",
            slug: "microscope",
            status: "DRAFT",
            translations: [
              {
                locale: "en",
                title: "Updated microscope",
                updatedAt: new Date("2026-04-03T09:00:00.000Z"),
              },
            ],
            updatedAt: new Date("2026-04-03T09:00:00.000Z"),
          },
        ]),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            equipment: {
              name: "Microscope",
            },
            id: "post_1",
            publishedAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [],
            updatedAt: new Date("2026-04-03T08:00:00.000Z"),
          })
          .mockResolvedValueOnce({
            equipment: {
              name: "Microscope",
              slug: "microscope",
            },
            id: "post_1",
            publishedAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [persistedTranslation],
            updatedAt: new Date("2026-04-03T09:00:00.000Z"),
          })
          .mockResolvedValueOnce({
            equipment: {
              name: "Microscope",
            },
            id: "post_1",
            publishedAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [persistedTranslation],
            updatedAt: new Date("2026-04-03T09:00:00.000Z"),
          }),
      },
    };
    const { savePostLocaleContent } = await import("./localized-content");

    const result = await savePostLocaleContent(
      {
        contentHtml: "<p>Updated html</p>",
        contentMd: "# Updated markdown",
        excerpt: "Updated excerpt",
        locale: "en",
        postId: "post_1",
        structuredContentJson: { sections: ["overview"] },
        title: "Updated microscope",
      },
      {},
      prisma,
    );

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(result.translation).toMatchObject({
      contentHtml: "<p>Updated html</p>",
      contentMd: "# Updated markdown",
      excerpt: "Updated excerpt",
      locale: "en",
      title: "Updated microscope",
    });
    expect(result.snapshot.editor.translationSource).toBe("stored");
  });

  it("sanitizes saved HTML previews and structured-content URLs", async () => {
    vi.doMock("@/features/i18n/get-messages", () => ({
      getMessages: vi.fn(async () => ({
        post: {
          defaultDisclaimer: "English disclaimer",
        },
      })),
    }));

    let persistedRecord = null;
    const localeRecord = {
      code: "en",
      isActive: true,
      isDefault: true,
      name: "English",
    };
    const prisma = {
      $transaction: vi.fn(async (callback) =>
        callback({
          auditEvent: {
            create: vi.fn().mockResolvedValue(null),
          },
          post: {
            update: vi.fn().mockResolvedValue(null),
          },
          postTranslation: {
            upsert: vi.fn(async ({ create, update }) => {
              persistedRecord = create || update;

              return {
                ...persistedRecord,
                id: "translation_1",
                isAutoTranslated: false,
                locale: "en",
                updatedAt: new Date("2026-04-03T09:00:00.000Z"),
              };
            }),
          },
        }),
      ),
      locale: {
        findMany: vi.fn().mockResolvedValue([localeRecord]),
        upsert: vi.fn().mockResolvedValue(null),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([
          {
            equipment: {
              name: "Microscope",
            },
            id: "post_1",
            slug: "microscope",
            status: "DRAFT",
            translations: [
              {
                locale: "en",
                title: "Microscope",
                updatedAt: new Date("2026-04-03T09:00:00.000Z"),
              },
            ],
            updatedAt: new Date("2026-04-03T09:00:00.000Z"),
          },
        ]),
        findUnique: vi
          .fn()
          .mockResolvedValueOnce({
            equipment: {
              name: "Microscope",
            },
            id: "post_1",
            publishedAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [],
            updatedAt: new Date("2026-04-03T08:00:00.000Z"),
          })
          .mockResolvedValueOnce({
            equipment: {
              name: "Microscope",
              slug: "microscope",
            },
            id: "post_1",
            publishedAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [
              {
                ...persistedRecord,
                id: "translation_1",
                isAutoTranslated: false,
                locale: "en",
                updatedAt: new Date("2026-04-03T09:00:00.000Z"),
              },
            ],
            updatedAt: new Date("2026-04-03T09:00:00.000Z"),
          })
          .mockResolvedValueOnce({
            equipment: {
              name: "Microscope",
            },
            id: "post_1",
            publishedAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [
              {
                ...persistedRecord,
                id: "translation_1",
                isAutoTranslated: false,
                locale: "en",
                updatedAt: new Date("2026-04-03T09:00:00.000Z"),
              },
            ],
            updatedAt: new Date("2026-04-03T09:00:00.000Z"),
          }),
      },
    };
    const { savePostLocaleContent } = await import("./localized-content");

    const result = await savePostLocaleContent(
      {
        contentHtml:
          '<article><p>Safe body</p><script>alert("xss")</script><a href="javascript:alert(1)">Bad</a></article>',
        contentMd: "# Updated markdown",
        excerpt: "Updated excerpt",
        locale: "en",
        postId: "post_1",
        structuredContentJson: {
          sections: [
            {
              id: "references",
              items: [
                {
                  title: "Unsafe reference",
                  url: "javascript:alert(1)",
                },
              ],
              kind: "references",
              title: "References",
            },
          ],
        },
        title: "Updated microscope",
      },
      {},
      prisma,
    );

    expect(result.translation.contentHtml).not.toContain("<script");
    expect(result.translation.contentHtml).not.toContain("javascript:");
    expect(result.translation.structuredContentJson.sections[0].items[0].url).toBeNull();
  });
});
