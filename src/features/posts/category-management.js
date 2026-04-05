import { z } from "zod";

import { createSlug, normalizeDisplayText } from "@/lib/normalization";

export const saveCategoryRecordSchema = z
  .object({
    categoryId: z.string().trim().min(1).optional(),
    description: z.string().trim().optional(),
    name: z.string().trim().min(1),
  })
  .strict();

export const deleteCategoryRecordSchema = z
  .object({
    categoryId: z.string().trim().min(1),
  })
  .strict();

export class CategoryManagementError extends Error {
  constructor(message, { status = "invalid_category_record", statusCode = 400 } = {}) {
    super(message);
    this.name = "CategoryManagementError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function serializeEditor(category) {
  if (!category) {
    return {
      category: {
        description: "",
        id: null,
        name: "",
        postCount: 0,
        slug: "",
      },
    };
  }

  return {
    category: {
      description: category.description || "",
      id: category.id,
      name: category.name,
      postCount: category._count.posts,
      slug: category.slug,
    },
  };
}

function serializeCategorySummary(category) {
  return {
    description: category.description || "",
    id: category.id,
    name: category.name,
    postCount: category._count.posts,
    slug: category.slug,
  };
}

async function buildUniqueCategorySlug(tx, baseSlug, categoryId) {
  const rootSlug = baseSlug || "category";
  let slug = rootSlug;
  let suffix = 2;

  while (true) {
    const existingRecord = await tx.category.findFirst({
      where: {
        slug,
        ...(categoryId
          ? {
              NOT: {
                id: categoryId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (!existingRecord) {
      return slug;
    }

    slug = `${rootSlug}-${suffix}`;
    suffix += 1;
  }
}

async function getSelectedCategory(db, categoryId) {
  if (!categoryId) {
    return null;
  }

  return db.category.findUnique({
    where: {
      id: categoryId,
    },
    select: {
      _count: {
        select: {
          posts: true,
        },
      },
      description: true,
      id: true,
      name: true,
      slug: true,
    },
  });
}

export async function getCategoryManagementSnapshot({ categoryId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const categories = await db.category.findMany({
    orderBy: {
      name: "asc",
    },
    select: {
      _count: {
        select: {
          posts: true,
        },
      },
      description: true,
      id: true,
      name: true,
      slug: true,
    },
  });
  const resolvedCategoryId =
    categories.find((category) => category.id === categoryId)?.id || categories[0]?.id || null;
  const editorCategory = await getSelectedCategory(db, resolvedCategoryId);

  return {
    categories: categories.map(serializeCategorySummary),
    editor: serializeEditor(editorCategory),
    selection: {
      categoryId: resolvedCategoryId,
    },
    summary: {
      assignedPostCount: categories.reduce((total, category) => total + category._count.posts, 0),
      categoryCount: categories.length,
    },
  };
}

export async function saveCategoryRecord(input, options = {}, prisma) {
  const parsedInput = saveCategoryRecordSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  const name = normalizeDisplayText(parsedInput.name);

  if (!name) {
    throw new CategoryManagementError("Category name is required.", {
      status: "missing_category_name",
      statusCode: 400,
    });
  }

  const description = normalizeDisplayText(parsedInput.description) || null;
  let savedCategoryId = parsedInput.categoryId || null;

  await db.$transaction(async (tx) => {
    const slug = await buildUniqueCategorySlug(
      tx,
      createSlug(name, "category"),
      parsedInput.categoryId,
    );
    const conflictingCategory = await tx.category.findFirst({
      where: {
        name,
        ...(parsedInput.categoryId
          ? {
              NOT: {
                id: parsedInput.categoryId,
              },
            }
          : {}),
      },
      select: {
        id: true,
      },
    });

    if (conflictingCategory) {
      throw new CategoryManagementError(`A category named "${name}" already exists.`, {
        status: "duplicate_category_name",
        statusCode: 409,
      });
    }

    const savedCategory = parsedInput.categoryId
      ? await tx.category.update({
          where: {
            id: parsedInput.categoryId,
          },
          data: {
            description,
            name,
            slug,
          },
          select: {
            id: true,
          },
        })
      : await tx.category.create({
          data: {
            description,
            name,
            slug,
          },
          select: {
            id: true,
          },
        });

    savedCategoryId = savedCategory.id;

    if (options.actorId) {
      await tx.auditEvent.create({
        data: {
          action: parsedInput.categoryId ? "CATEGORY_UPDATED" : "CATEGORY_CREATED",
          actorId: options.actorId,
          entityId: savedCategory.id,
          entityType: "category",
          payloadJson: {
            description,
            slug,
          },
        },
      });
    }
  });

  return {
    categoryId: savedCategoryId,
    snapshot: await getCategoryManagementSnapshot(
      {
        categoryId: savedCategoryId,
      },
      db,
    ),
  };
}

export async function deleteCategoryRecord(input, options = {}, prisma) {
  const parsedInput = deleteCategoryRecordSchema.parse(input);
  const db = await resolvePrismaClient(prisma);

  await db.$transaction(async (tx) => {
    const category = await tx.category.findUnique({
      where: {
        id: parsedInput.categoryId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
      },
    });

    if (!category) {
      throw new CategoryManagementError(`Category "${parsedInput.categoryId}" was not found.`, {
        status: "category_not_found",
        statusCode: 404,
      });
    }

    await tx.category.delete({
      where: {
        id: parsedInput.categoryId,
      },
    });

    if (options.actorId) {
      await tx.auditEvent.create({
        data: {
          action: "CATEGORY_DELETED",
          actorId: options.actorId,
          entityId: category.id,
          entityType: "category",
          payloadJson: {
            name: category.name,
            slug: category.slug,
          },
        },
      });
    }
  });

  return {
    snapshot: await getCategoryManagementSnapshot({}, db),
  };
}

export function createCategoryManagementErrorPayload(error) {
  if (error instanceof CategoryManagementError) {
    return {
      body: {
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  console.error(error);

  return {
    body: {
      message: "An unexpected category-management error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}
