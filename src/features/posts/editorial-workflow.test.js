import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

function createCategory(id, name, description = "") {
  return {
    description,
    id,
    name,
    slug: name.toLowerCase().replace(/\s+/g, "-"),
  };
}

function createPost({
  categories = [],
  editorialStage = "GENERATED",
  id = "post_1",
  publishedAt = null,
  scheduledPublishAt = null,
  slug = "microscope",
  status = "DRAFT",
  title = "Microscope draft",
} = {}) {
  return {
    categories: categories.map((category) => ({
      category: {
        ...category,
      },
      categoryId: category.id,
      postId: id,
    })),
    createdAt: new Date("2026-04-03T07:00:00.000Z"),
    editorialStage,
    equipment: {
      name: "Microscope",
      slug: "microscope",
    },
    faults: [],
    generationJobs: [],
    id,
    maintenanceTasks: [],
    publishedAt: publishedAt ? new Date(publishedAt) : null,
    scheduledPublishAt: scheduledPublishAt ? new Date(scheduledPublishAt) : null,
    slug,
    sourceReferences: [],
    status,
    translations: [
      {
        contentHtml: "<article><p>Microscope content.</p></article>",
        contentMd: "# Microscope",
        disclaimer: "Fixture disclaimer",
        excerpt: "Fixture excerpt",
        faqJson: [],
        locale: "en",
        seoRecord: {
          canonicalUrl: "https://example.com/en/blog/microscope",
          metaDescription: "Fixture meta description",
          metaTitle: title,
        },
        structuredContentJson: {
          sections: [],
        },
        title,
        updatedAt: new Date("2026-04-03T08:00:00.000Z"),
      },
    ],
    updatedAt: new Date("2026-04-03T08:00:00.000Z"),
  };
}

function matchesWhere(post, where) {
  if (!where) {
    return true;
  }

  if (where.OR) {
    return where.OR.some((entry) => matchesWhere(post, entry));
  }

  if (where.slug?.contains && !post.slug.includes(where.slug.contains)) {
    return false;
  }

  if (where.status?.in && !where.status.in.includes(post.status)) {
    return false;
  }

  if (typeof where.status === "string" && post.status !== where.status) {
    return false;
  }

  if (where.equipment?.name?.contains && !post.equipment.name.includes(where.equipment.name.contains)) {
    return false;
  }

  if (where.translations?.some) {
    const translationMatch = post.translations.some((translation) => {
      if (translation.locale !== where.translations.some.locale) {
        return false;
      }

      if (!where.translations.some.OR) {
        return true;
      }

      return where.translations.some.OR.some((entry) => {
        if (entry.title?.contains) {
          return translation.title.includes(entry.title.contains);
        }

        if (entry.excerpt?.contains) {
          return translation.excerpt.includes(entry.excerpt.contains);
        }

        return false;
      });
    });

    if (!translationMatch) {
      return false;
    }
  }

  if (where.categories?.some?.category?.name?.contains) {
    const categoryMatch = post.categories.some(({ category }) =>
      category.name.includes(where.categories.some.category.name.contains),
    );

    if (!categoryMatch) {
      return false;
    }
  }

  return true;
}

function decoratePost(post) {
  return {
    ...structuredClone(post),
    _count: {
      categories: post.categories.length,
      faults: post.faults.length,
      generationJobs: post.generationJobs.length,
      maintenanceTasks: post.maintenanceTasks.length,
      sourceReferences: post.sourceReferences.length,
    },
  };
}

function getPostOrderValue(post, fieldName) {
  if (fieldName === "status") {
    return {
      ARCHIVED: 4,
      PUBLISHED: 3,
      SCHEDULED: 2,
      DRAFT: 1,
    }[post.status] || 0;
  }

  const value = post[fieldName];

  if (value instanceof Date) {
    return value.getTime();
  }

  if (value === null || value === undefined) {
    return null;
  }

  return value;
}

function sortPosts(records, orderBy = []) {
  if (!Array.isArray(orderBy) || !orderBy.length) {
    return records;
  }

  return [...records].sort((left, right) => {
    for (const entry of orderBy) {
      const [fieldName, direction] = Object.entries(entry)[0];
      const leftValue = getPostOrderValue(left, fieldName);
      const rightValue = getPostOrderValue(right, fieldName);

      if (leftValue === rightValue) {
        continue;
      }

      if (leftValue === null) {
        return direction === "asc" ? -1 : 1;
      }

      if (rightValue === null) {
        return direction === "asc" ? 1 : -1;
      }

      if (leftValue > rightValue) {
        return direction === "asc" ? 1 : -1;
      }

      if (leftValue < rightValue) {
        return direction === "asc" ? -1 : 1;
      }
    }

    return 0;
  });
}

function createMockPrisma({ categories = [], posts = [] } = {}) {
  const state = {
    audits: [],
    categories: structuredClone(categories),
    posts: structuredClone(posts),
  };

  const prisma = {
    state,
    $transaction: async (callback) => callback(prisma),
    auditEvent: {
      create: vi.fn(async ({ data }) => {
        state.audits.push(data);
        return data;
      }),
    },
    category: {
      findMany: vi.fn(async ({ where } = {}) => {
        const records = where?.id?.in
          ? state.categories.filter((category) => where.id.in.includes(category.id))
          : state.categories;

        return records.map((category) => ({
          ...structuredClone(category),
          _count: {
            posts: state.posts.filter((post) =>
              post.categories.some((entry) => entry.categoryId === category.id),
            ).length,
          },
        }));
      }),
    },
    post: {
      count: vi.fn(async ({ where } = {}) => state.posts.filter((post) => matchesWhere(post, where)).length),
      findFirst: vi.fn(async ({ where }) => {
        return (
          state.posts.find((post) => {
            if (where.slug && post.slug !== where.slug) {
              return false;
            }

            if (where.NOT?.id && post.id === where.NOT.id) {
              return false;
            }

            return true;
          }) || null
        );
      }),
      findMany: vi.fn(async ({ orderBy, skip = 0, take, where } = {}) =>
        sortPosts(state.posts.filter((post) => matchesWhere(post, where)), orderBy)
          .slice(skip, take === undefined ? undefined : skip + take)
          .map((post) => decoratePost(post)),
      ),
      findUnique: vi.fn(async ({ where }) => {
        const post = state.posts.find((entry) => entry.id === where.id);

        return post ? decoratePost(post) : null;
      }),
      update: vi.fn(async ({ data, where }) => {
        const post = state.posts.find((entry) => entry.id === where.id);

        Object.assign(post, data, {
          updatedAt: new Date(),
        });

        return decoratePost(post);
      }),
    },
    postCategory: {
      createMany: vi.fn(async ({ data }) => {
        const post = state.posts.find((entry) => entry.id === data[0].postId);

        for (const record of data) {
          const category = state.categories.find((entry) => entry.id === record.categoryId);

          post.categories.push({
            category: structuredClone(category),
            categoryId: category.id,
            postId: post.id,
          });
        }

        return {
          count: data.length,
        };
      }),
      deleteMany: vi.fn(async ({ where }) => {
        const post = state.posts.find((entry) => entry.id === where.postId);

        post.categories = [];

        return {
          count: 1,
        };
      }),
      findMany: vi.fn(async ({ where }) => {
        const post = state.posts.find((entry) => entry.id === where.postId);

        return post ? post.categories.map((category) => ({ categoryId: category.categoryId })) : [];
      }),
    },
  };

  return prisma;
}

describe("editorial workflow", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-04-03T09:00:00.000Z"));
    process.env = {
      ...originalEnv,
      DATABASE_URL: "mysql://user:password@localhost:3306/med_blog",
      DEFAULT_LOCALE: "en",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      SUPPORTED_LOCALES: "en",
    };
  });

  afterEach(() => {
    vi.useRealTimers();
    process.env = originalEnv;
  });

  it("moves a draft to reviewed and scheduled state while recording audit events", async () => {
    const categories = [createCategory("cat_1", "Maintenance"), createCategory("cat_2", "Safety")];
    const prisma = createMockPrisma({
      categories,
      posts: [createPost()],
    });
    const { updatePostEditorialRecord } = await import("./editorial-workflow");

    const result = await updatePostEditorialRecord(
      {
        postId: "post_1",
        categoryIds: ["cat_1", "cat_2"],
        editorialStage: "REVIEWED",
        scheduledPublishAt: "2026-04-05T10:00:00.000Z",
        slug: "Microscope Review",
        status: "SCHEDULED",
      },
      {
        actorId: "user_1",
      },
      prisma,
    );

    expect(result.snapshot.post).toMatchObject({
      editorialStage: "REVIEWED",
      slug: "microscope-review",
      status: "SCHEDULED",
    });
    expect(result.snapshot.categories.filter((category) => category.isAssigned).map((category) => category.id)).toEqual([
      "cat_1",
      "cat_2",
    ]);
    expect(prisma.state.posts[0].scheduledPublishAt.toISOString()).toBe("2026-04-05T10:00:00.000Z");
    expect(prisma.state.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining([
        "POST_CATEGORIES_UPDATED",
        "POST_EDITORIAL_STAGE_UPDATED",
        "POST_SCHEDULED",
        "POST_STATUS_CHANGED",
      ]),
    );
  });

  it("publishes a scheduled post exactly once and clears its future schedule", async () => {
    const prisma = createMockPrisma({
      posts: [
        createPost({
          editorialStage: "APPROVED",
          publishedAt: null,
          scheduledPublishAt: "2026-04-05T10:00:00.000Z",
          status: "SCHEDULED",
        }),
      ],
    });
    const { publishPostRecord } = await import("./editorial-workflow");
    const revalidate = vi.fn(async () => {});

    const result = await publishPostRecord(
      {
        postId: "post_1",
        publishAt: null,
      },
      {
        actorId: "user_1",
        revalidate,
      },
      prisma,
    );

    expect(result.snapshot.post).toMatchObject({
      publishedAt: "2026-04-03T09:00:00.000Z",
      scheduledPublishAt: null,
      status: "PUBLISHED",
    });
    expect(result.revalidation).toMatchObject({
      status: "revalidated",
    });
    expect(revalidate).toHaveBeenCalled();
    expect(prisma.state.audits.map((audit) => audit.action)).toEqual(
      expect.arrayContaining(["POST_PUBLISHED", "POST_PUBLISH_REVALIDATED", "POST_STATUS_CHANGED"]),
    );
  });

  it("fails predictably on an invalid published-to-draft transition", async () => {
    const prisma = createMockPrisma({
      posts: [
        createPost({
          editorialStage: "APPROVED",
          publishedAt: "2026-04-03T08:30:00.000Z",
          status: "PUBLISHED",
        }),
      ],
    });
    const { updatePostEditorialRecord } = await import("./editorial-workflow");

    await expect(
      updatePostEditorialRecord(
        {
          postId: "post_1",
          status: "DRAFT",
        },
        {
          actorId: "user_1",
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "invalid_post_status_transition",
      statusCode: 409,
    });
    expect(prisma.state.posts[0].status).toBe("PUBLISHED");
    expect(prisma.state.audits).toHaveLength(0);
  });

  it("builds separate draft and published inventory snapshots", async () => {
    const prisma = createMockPrisma({
      posts: [
        createPost({ id: "post_draft", slug: "microscope-draft", status: "DRAFT" }),
        createPost({
          id: "post_scheduled",
          scheduledPublishAt: "2026-04-04T09:00:00.000Z",
          slug: "microscope-scheduled",
          status: "SCHEDULED",
          title: "Microscope scheduled",
        }),
        createPost({
          id: "post_published",
          publishedAt: "2026-04-03T08:30:00.000Z",
          slug: "microscope-published",
          status: "PUBLISHED",
          title: "Microscope published",
        }),
        createPost({
          id: "post_archived",
          slug: "microscope-archived",
          status: "ARCHIVED",
          title: "Microscope archived",
        }),
      ],
    });
    const { getPostInventorySnapshot } = await import("./editorial-workflow");

    const draftSnapshot = await getPostInventorySnapshot({ scope: "drafts" }, prisma);
    const publishedSnapshot = await getPostInventorySnapshot({ scope: "published" }, prisma);

    expect(draftSnapshot.posts.map((post) => post.id)).toEqual(["post_scheduled", "post_draft"]);
    expect(publishedSnapshot.posts.map((post) => post.id)).toEqual(["post_published"]);
    expect(draftSnapshot.summary).toMatchObject({
      archivedCount: 1,
      draftCount: 1,
      publishedCount: 1,
      scheduledCount: 1,
    });
  });

  it("paginates published inventory snapshots", async () => {
    const prisma = createMockPrisma({
      posts: Array.from({ length: 30 }, (_, index) =>
        createPost({
          id: `post_${index + 1}`,
          publishedAt: `2026-04-${`${30 - index}`.padStart(2, "0")}T08:30:00.000Z`,
          slug: `microscope-published-${index + 1}`,
          status: "PUBLISHED",
          title: `Microscope published ${index + 1}`,
        }),
      ),
    });
    const { getPostInventorySnapshot } = await import("./editorial-workflow");

    const snapshot = await getPostInventorySnapshot(
      {
        page: 2,
        scope: "published",
      },
      prisma,
    );

    expect(snapshot.pagination).toMatchObject({
      currentPage: 2,
      endItem: 30,
      hasNextPage: false,
      hasPreviousPage: true,
      pageSize: 24,
      startItem: 25,
      totalItems: 30,
      totalPages: 2,
    });
    expect(snapshot.summary.matchingCount).toBe(30);
    expect(snapshot.posts).toHaveLength(6);
    expect(snapshot.posts[0].id).toBe("post_25");
  });
});
