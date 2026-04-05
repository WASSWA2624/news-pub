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

const originalEnv = process.env;

describe("comments workflow", () => {
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

  it("submits guest comments into the moderation queue with an initial event", async () => {
    const prisma = {
      comment: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: "comment_1",
          parentId: null,
          status: "PENDING",
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      post: {
        findUnique: vi.fn().mockResolvedValue({
          id: "post_1",
          publishedAt: new Date("2026-04-03T08:00:00.000Z"),
          slug: "microscope-basics",
          status: "PUBLISHED",
          translations: [
            {
              locale: "en",
              title: "Microscope basics",
            },
          ],
        }),
      },
    };
    const { submitCommentRecord } = await import("./index");

    const result = await submitCommentRecord(
      {
        body: " Helpful summary. ",
        name: " Alice ",
        postId: "post_1",
      },
      {
        ipAddress: "203.0.113.12",
        now: new Date("2026-04-03T10:00:00.000Z"),
        userAgent: "Vitest",
      },
      prisma,
    );

    expect(result).toMatchObject({
      commentId: "comment_1",
    });
    expect(prisma.comment.create).toHaveBeenCalledTimes(1);
    expect(prisma.comment.create.mock.calls[0][0]).toMatchObject({
      data: {
        body: "Helpful summary.",
        moderationEvents: {
          create: [
            {
              action: "COMMENT_SUBMITTED",
              notes: null,
            },
          ],
        },
        name: "Alice",
        postId: "post_1",
        status: "PENDING",
        userAgent: "Vitest",
      },
    });
  });

  it("auto-flags obvious spam while keeping the public response path generic", async () => {
    const prisma = {
      comment: {
        count: vi.fn().mockResolvedValue(0),
        create: vi.fn().mockResolvedValue({
          id: "comment_spam",
          parentId: null,
          status: "SPAM",
        }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      post: {
        findUnique: vi.fn().mockResolvedValue({
          id: "post_1",
          publishedAt: new Date("2026-04-03T08:00:00.000Z"),
          slug: "microscope-basics",
          status: "PUBLISHED",
          translations: [],
        }),
      },
    };
    const { submitCommentRecord } = await import("./index");

    await submitCommentRecord(
      {
        body: "Visit https://spam.example one https://spam.example/two https://spam.example/three",
        email: "pitch@example.com",
        name: "Promo Team",
        postId: "post_1",
      },
      {
        ipAddress: "203.0.113.12",
        now: new Date("2026-04-03T10:00:00.000Z"),
      },
      prisma,
    );

    expect(prisma.comment.create.mock.calls[0][0].data.status).toBe("SPAM");
    expect(prisma.comment.create.mock.calls[0][0].data.moderationEvents.create).toEqual([
      {
        action: "COMMENT_SUBMITTED",
        notes: null,
      },
      {
        action: "COMMENT_AUTO_SPAMMED",
        notes: expect.stringContaining("Signals"),
      },
    ]);
  });

  it("records moderation decisions and revalidates the public post path when visibility changes", async () => {
    const update = vi.fn().mockResolvedValue({
      id: "comment_1",
      status: "APPROVED",
    });
    const createEvent = vi.fn().mockResolvedValue({
      id: "event_1",
    });
    const prisma = {
      $transaction: vi.fn(async (callback) =>
        callback({
          comment: {
            update,
          },
          commentModerationEvent: {
            create: createEvent,
          },
        }),
      ),
      comment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "comment_1",
          post: {
            slug: "microscope-basics",
          },
          status: "PENDING",
        }),
      },
    };
    const revalidate = vi.fn(async () => {});
    const { moderateCommentRecord } = await import("./index");

    const result = await moderateCommentRecord(
      "comment_1",
      {
        moderationStatus: "APPROVED",
        notes: "Verified by editor",
      },
      {
        actorId: "user_1",
        revalidate,
      },
      prisma,
    );

    expect(result).toEqual({
      commentId: "comment_1",
      moderationStatus: "APPROVED",
    });
    expect(update).toHaveBeenCalledWith({
      data: {
        status: "APPROVED",
      },
      where: {
        id: "comment_1",
      },
    });
    expect(createEvent).toHaveBeenCalledWith({
      data: {
        action: "COMMENT_APPROVED",
        actorId: "user_1",
        commentId: "comment_1",
        notes: "Verified by editor",
      },
    });
    expect(revalidate).toHaveBeenCalledWith("/en/blog/microscope-basics");
  });

  it("builds moderation snapshots with list metadata and event history", async () => {
    const prisma = {
      comment: {
        count: vi
          .fn()
          .mockResolvedValueOnce(4)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(2)
          .mockResolvedValueOnce(1)
          .mockResolvedValueOnce(0),
        findMany: vi.fn().mockResolvedValue([
          {
            _count: {
              replies: 1,
            },
            body: "Helpful note for the team.",
            createdAt: new Date("2026-04-03T10:00:00.000Z"),
            email: "reader@example.com",
            id: "comment_1",
            moderationEvents: [
              {
                action: "COMMENT_SUBMITTED",
                actor: null,
                createdAt: new Date("2026-04-03T10:00:00.000Z"),
                id: "event_1",
                notes: null,
              },
            ],
            name: "Amina",
            parent: null,
            parentId: null,
            post: {
              equipment: {
                name: "Microscope",
              },
              slug: "microscope-basics",
              translations: [
                {
                  title: "Microscope basics",
                },
              ],
            },
            status: "PENDING",
          },
        ]),
        findUnique: vi.fn().mockResolvedValue({
          body: "Helpful note for the team.",
          createdAt: new Date("2026-04-03T10:00:00.000Z"),
          email: "reader@example.com",
          id: "comment_1",
          moderationEvents: [
            {
              action: "COMMENT_SUBMITTED",
              actor: null,
              createdAt: new Date("2026-04-03T10:00:00.000Z"),
              id: "event_1",
              notes: null,
            },
          ],
          name: "Amina",
          parent: null,
          post: {
            equipment: {
              name: "Microscope",
            },
            publishedAt: new Date("2026-04-03T08:00:00.000Z"),
            slug: "microscope-basics",
            translations: [
              {
                title: "Microscope basics",
              },
            ],
          },
          replies: [
            {
              createdAt: new Date("2026-04-03T11:00:00.000Z"),
              id: "reply_1",
              name: "Editor",
              status: "APPROVED",
            },
          ],
          status: "PENDING",
          updatedAt: new Date("2026-04-03T10:30:00.000Z"),
          userAgent: "Vitest",
        }),
      },
    };
    const { getCommentModerationSnapshot } = await import("./index");

    const snapshot = await getCommentModerationSnapshot(
      {
        query: "Amina",
        status: "PENDING",
      },
      prisma,
    );

    expect(snapshot.summary).toEqual({
      approvedCount: 2,
      filteredCount: 1,
      pendingCount: 1,
      rejectedCount: 1,
      spamCount: 0,
      totalCount: 4,
    });
    expect(snapshot.comments[0]).toMatchObject({
      bodyPreview: "Helpful note for the team.",
      name: "Amina",
      post: {
        title: "Microscope basics",
      },
      repliesCount: 1,
      status: "PENDING",
    });
    expect(snapshot.editor.comment.moderationEvents[0]).toMatchObject({
      action: "COMMENT_SUBMITTED",
      actionLabel: "Submitted",
      actorName: "System",
    });
  });

  it("paginates moderation snapshots", async () => {
    const comments = Array.from({ length: 22 }, (_, index) => ({
      _count: {
        replies: 0,
      },
      body: `Helpful note ${index + 1}`,
      createdAt: new Date(`2026-04-${`${22 - index}`.padStart(2, "0")}T10:00:00.000Z`),
      email: null,
      id: `comment_${index + 1}`,
      moderationEvents: [],
      name: `Reader ${index + 1}`,
      parent: null,
      parentId: null,
      post: {
        equipment: {
          name: "Microscope",
        },
        slug: "microscope-basics",
        translations: [
          {
            title: "Microscope basics",
          },
        ],
      },
      status: "PENDING",
    }));
    const prisma = {
      comment: {
        count: vi
          .fn()
          .mockResolvedValueOnce(22)
          .mockResolvedValueOnce(22)
          .mockResolvedValueOnce(22)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0)
          .mockResolvedValueOnce(0),
        findMany: vi.fn(async ({ skip = 0, take } = {}) => comments.slice(skip, skip + take)),
        findUnique: vi.fn(async ({ where }) =>
          (() => {
            const comment = comments.find((entry) => entry.id === where.id);

            if (!comment) {
              return null;
            }

            return {
              ...comment,
              post: {
                ...comment.post,
                publishedAt: new Date("2026-04-03T08:00:00.000Z"),
              },
              replies: [],
              updatedAt: comment.createdAt,
              userAgent: "Vitest",
            };
          })(),
        ),
      },
    };
    const { getCommentModerationSnapshot } = await import("./index");

    const snapshot = await getCommentModerationSnapshot(
      {
        page: 2,
        status: "PENDING",
      },
      prisma,
    );

    expect(snapshot.pagination).toMatchObject({
      currentPage: 2,
      endItem: 22,
      hasNextPage: false,
      hasPreviousPage: true,
      pageSize: 20,
      startItem: 21,
      totalItems: 22,
      totalPages: 2,
    });
    expect(snapshot.comments).toHaveLength(2);
    expect(snapshot.comments[0].id).toBe("comment_21");
    expect(snapshot.summary.filteredCount).toBe(22);
  });
});
