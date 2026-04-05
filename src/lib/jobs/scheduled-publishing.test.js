import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

function createScheduledPost({
  categorySlugs = ["maintenance", "safety"],
  equipmentSlug = "microscope",
  id = "post_1",
  manufacturerSlugs = ["acme-medical"],
  publishedAt = null,
  scheduledPublishAt = "2026-04-03T08:55:00.000Z",
  slug = "microscope",
  status = "SCHEDULED",
} = {}) {
  return {
    categories: categorySlugs.map((categorySlug) => ({
      category: {
        slug: categorySlug,
      },
    })),
    equipment: {
      slug: equipmentSlug,
    },
    id,
    manufacturers: manufacturerSlugs.map((manufacturerSlug) => ({
      manufacturer: {
        slug: manufacturerSlug,
      },
    })),
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
    slug,
    status,
  };
}

function sortPostsBySchedule(posts) {
  return [...posts].sort((left, right) => {
    const leftTime = left.scheduledPublishAt ? left.scheduledPublishAt.getTime() : Number.MAX_SAFE_INTEGER;
    const rightTime = right.scheduledPublishAt ? right.scheduledPublishAt.getTime() : Number.MAX_SAFE_INTEGER;

    if (leftTime !== rightTime) {
      return leftTime - rightTime;
    }

    return left.id.localeCompare(right.id);
  });
}

function createMockPrisma({
  concurrentClaims = {},
  posts = [],
  updateFailures = {},
} = {}) {
  const state = {
    audits: [],
    concurrentClaims: Object.fromEntries(
      Object.entries(concurrentClaims).map(([postId, count]) => [postId, count]),
    ),
    posts: structuredClone(posts),
    updateFailures: Object.fromEntries(
      Object.entries(updateFailures).map(([postId, count]) => [postId, count]),
    ),
  };

  const prisma = {
    state,
    $transaction: async (callback) => callback(prisma),
    auditEvent: {
      create: vi.fn(async ({ data }) => {
        state.audits.push(structuredClone(data));
        return data;
      }),
    },
    post: {
      findMany: vi.fn(async ({ take, where }) => {
        const duePosts = sortPostsBySchedule(
          state.posts.filter((post) => {
            if (where?.status && post.status !== where.status) {
              return false;
            }

            if (where?.scheduledPublishAt?.lte) {
              if (!post.scheduledPublishAt) {
                return false;
              }

              if (post.scheduledPublishAt.getTime() > where.scheduledPublishAt.lte.getTime()) {
                return false;
              }
            }

            return true;
          }),
        );

        return structuredClone(duePosts.slice(0, take || duePosts.length));
      }),
      findUnique: vi.fn(async ({ where }) => {
        const post = state.posts.find((entry) => entry.id === where.id);

        return post ? structuredClone(post) : null;
      }),
      updateMany: vi.fn(async ({ data, where }) => {
        const failureCount = state.updateFailures[where.id] || 0;

        if (failureCount > 0) {
          state.updateFailures[where.id] = failureCount - 1;
          throw new Error("Temporary publishing failure");
        }

        const concurrentClaimCount = state.concurrentClaims[where.id] || 0;

        if (concurrentClaimCount > 0) {
          state.concurrentClaims[where.id] = concurrentClaimCount - 1;

          const claimedPost = state.posts.find((entry) => entry.id === where.id);

          if (claimedPost) {
            claimedPost.publishedAt = data.publishedAt;
            claimedPost.scheduledPublishAt = null;
            claimedPost.status = "PUBLISHED";
          }

          return {
            count: 0,
          };
        }

        const post = state.posts.find((entry) => entry.id === where.id);

        if (!post) {
          return {
            count: 0,
          };
        }

        if (post.status !== where.status) {
          return {
            count: 0,
          };
        }

        if (
          (post.scheduledPublishAt?.getTime() || 0) !==
          (where.scheduledPublishAt?.getTime() || 0)
        ) {
          return {
            count: 0,
          };
        }

        post.publishedAt = data.publishedAt;
        post.scheduledPublishAt = data.scheduledPublishAt;
        post.status = data.status;

        return {
          count: 1,
        };
      }),
    },
  };

  return prisma;
}

describe("scheduled publishing worker", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "mysql://user:password@localhost:3306/equip_blog",
      DEFAULT_LOCALE: "en",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      SUPPORTED_LOCALES: "en",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("publishes each due scheduled post once and revalidates the related public paths", async () => {
    const prisma = createMockPrisma({
      posts: [
        createScheduledPost(),
        createScheduledPost({
          id: "post_2",
          scheduledPublishAt: "2026-04-03T09:05:00.000Z",
          slug: "future-post",
        }),
      ],
    });
    const revalidate = vi.fn(async () => {});
    const { runScheduledPublishingWorker } = await import("./scheduled-publishing");

    const result = await runScheduledPublishingWorker(
      {
        now: "2026-04-03T09:00:00.000Z",
        revalidate,
        retryDelayMs: 0,
        runId: "run_1",
      },
      prisma,
    );

    expect(result).toMatchObject({
      dueCount: 1,
      failedCount: 0,
      processedCount: 1,
      publishedCount: 1,
      revalidationFailureCount: 0,
      runId: "run_1",
      skippedCount: 0,
    });
    expect(result.results[0]).toMatchObject({
      attemptCount: 1,
      post: {
        publishedAt: "2026-04-03T09:00:00.000Z",
        scheduledPublishAt: null,
        status: "PUBLISHED",
      },
      revalidatedPaths: [
        "/sitemap.xml",
        "/en/blog",
        "/en/blog/microscope",
        "/en/equipment/microscope",
        "/en/category/maintenance",
        "/en/category/safety",
        "/en/manufacturer/acme-medical",
      ],
      revalidationStatus: "revalidated",
      status: "published",
    });
    expect(prisma.state.posts[0]).toMatchObject({
      publishedAt: new Date("2026-04-03T09:00:00.000Z"),
      scheduledPublishAt: null,
      status: "PUBLISHED",
    });
    expect(prisma.state.posts[1]).toMatchObject({
      scheduledPublishAt: new Date("2026-04-03T09:05:00.000Z"),
      status: "SCHEDULED",
    });
    expect(revalidate.mock.calls).toEqual([
      ["/sitemap.xml"],
      ["/en/blog"],
      ["/en/blog/microscope"],
      ["/en/equipment/microscope"],
      ["/en/category/maintenance"],
      ["/en/category/safety"],
      ["/en/manufacturer/acme-medical"],
    ]);
    expect(prisma.state.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining([
        "SCHEDULED_PUBLISH_RUN_STARTED",
        "POST_STATUS_CHANGED",
        "POST_PUBLISHED",
        "POST_SCHEDULED_PUBLISH_SUCCEEDED",
        "POST_PUBLISH_REVALIDATED",
        "SCHEDULED_PUBLISH_RUN_COMPLETED",
      ]),
    );
  });

  it("retries transient publish failures and logs the failed attempt before succeeding", async () => {
    const prisma = createMockPrisma({
      posts: [createScheduledPost()],
      updateFailures: {
        post_1: 1,
      },
    });
    const wait = vi.fn(async () => {});
    const revalidate = vi.fn(async () => {});
    const { runScheduledPublishingWorker } = await import("./scheduled-publishing");

    const result = await runScheduledPublishingWorker(
      {
        maxAttempts: 3,
        now: "2026-04-03T09:00:00.000Z",
        revalidate,
        retryDelayMs: 50,
        runId: "run_retry",
        wait,
      },
      prisma,
    );

    expect(result).toMatchObject({
      failedCount: 0,
      processedCount: 1,
      publishedCount: 1,
      skippedCount: 0,
    });
    expect(result.results[0]).toMatchObject({
      attemptCount: 2,
      revalidationStatus: "revalidated",
      status: "published",
    });
    expect(wait).toHaveBeenCalledWith(50);
    expect(prisma.state.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining([
        "POST_SCHEDULED_PUBLISH_FAILED",
        "POST_SCHEDULED_PUBLISH_SUCCEEDED",
      ]),
    );
    expect(prisma.state.posts[0]).toMatchObject({
      publishedAt: new Date("2026-04-03T09:00:00.000Z"),
      scheduledPublishAt: null,
      status: "PUBLISHED",
    });
  });

  it("skips duplicate publish claims so the same scheduled post cannot publish twice", async () => {
    const prisma = createMockPrisma({
      concurrentClaims: {
        post_1: 1,
      },
      posts: [createScheduledPost()],
    });
    const revalidate = vi.fn(async () => {});
    const { runScheduledPublishingWorker } = await import("./scheduled-publishing");

    const result = await runScheduledPublishingWorker(
      {
        now: "2026-04-03T09:00:00.000Z",
        revalidate,
        retryDelayMs: 0,
        runId: "run_skip",
      },
      prisma,
    );

    expect(result).toMatchObject({
      failedCount: 0,
      processedCount: 1,
      publishedCount: 0,
      skippedCount: 1,
    });
    expect(result.results[0]).toMatchObject({
      reason: "already_processed",
      revalidationStatus: "skipped",
      status: "skipped",
    });
    expect(revalidate).not.toHaveBeenCalled();
    expect(prisma.state.audits.map((audit) => audit.action)).not.toContain("POST_PUBLISHED");
  });
});
