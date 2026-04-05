import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

function createMockPrisma({ categories = [], postsByCategoryId = {} } = {}) {
  const state = {
    audits: [],
    categories: structuredClone(categories),
    postsByCategoryId: structuredClone(postsByCategoryId),
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
      create: vi.fn(async ({ data }) => {
        const record = {
          id: `category_${state.categories.length + 1}`,
          ...data,
        };

        state.categories.push(record);
        state.postsByCategoryId[record.id] = 0;

        return {
          id: record.id,
        };
      }),
      delete: vi.fn(async ({ where }) => {
        state.categories = state.categories.filter((category) => category.id !== where.id);
        delete state.postsByCategoryId[where.id];

        return {
          id: where.id,
        };
      }),
      findFirst: vi.fn(async ({ where }) => {
        return (
          state.categories.find((category) => {
            if (where.slug && category.slug !== where.slug) {
              return false;
            }

            if (where.name && category.name !== where.name) {
              return false;
            }

            if (where.NOT?.id && category.id === where.NOT.id) {
              return false;
            }

            return true;
          }) || null
        );
      }),
      findMany: vi.fn(async () =>
        state.categories
          .slice()
          .sort((left, right) => left.name.localeCompare(right.name))
          .map((category) => ({
            ...structuredClone(category),
            _count: {
              posts: state.postsByCategoryId[category.id] || 0,
            },
          })),
      ),
      findUnique: vi.fn(async ({ where }) => {
        const category = state.categories.find((entry) => entry.id === where.id);

        if (!category) {
          return null;
        }

        return {
          ...structuredClone(category),
          _count: {
            posts: state.postsByCategoryId[category.id] || 0,
          },
        };
      }),
      update: vi.fn(async ({ data, where }) => {
        const category = state.categories.find((entry) => entry.id === where.id);

        Object.assign(category, data);

        return {
          id: category.id,
        };
      }),
    },
  };

  return prisma;
}

describe("category management", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "mysql://user:password@localhost:3306/med_blog",
      DEFAULT_LOCALE: "en",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      SUPPORTED_LOCALES: "en",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("creates a category, normalizes its slug, and records an audit event", async () => {
    const prisma = createMockPrisma({
      categories: [
        {
          description: "",
          id: "category_1",
          name: "Maintenance",
          slug: "maintenance",
        },
      ],
      postsByCategoryId: {
        category_1: 2,
      },
    });
    const { saveCategoryRecord } = await import("./category-management");

    const result = await saveCategoryRecord(
      {
        description: "Safety-related content.",
        name: "Safety & Alerts",
      },
      {
        actorId: "user_1",
      },
      prisma,
    );

    expect(result.snapshot.summary).toMatchObject({
      assignedPostCount: 2,
      categoryCount: 2,
    });
    expect(result.snapshot.categories.map((category) => category.slug)).toEqual([
      "maintenance",
      "safety-and-alerts",
    ]);
    expect(prisma.state.audits[0]).toMatchObject({
      action: "CATEGORY_CREATED",
      entityType: "category",
    });
  });

  it("deletes a category and refreshes the management snapshot", async () => {
    const prisma = createMockPrisma({
      categories: [
        {
          description: "",
          id: "category_1",
          name: "Maintenance",
          slug: "maintenance",
        },
      ],
      postsByCategoryId: {
        category_1: 1,
      },
    });
    const { deleteCategoryRecord } = await import("./category-management");

    const result = await deleteCategoryRecord(
      {
        categoryId: "category_1",
      },
      {
        actorId: "user_1",
      },
      prisma,
    );

    expect(result.snapshot.summary).toEqual({
      assignedPostCount: 0,
      categoryCount: 0,
    });
    expect(prisma.state.audits[0]).toMatchObject({
      action: "CATEGORY_DELETED",
      entityType: "category",
    });
  });
});
