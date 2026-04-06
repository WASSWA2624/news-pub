import { createAuditEventRecord } from "@/lib/analytics";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import {
  getSuggestedCategorySlug,
  getSupportedCategoryPresetRecords,
} from "@/lib/news/category-presets";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";

async function ensureSupportedCategoryPresets(db) {
  const existingCategories = await db.category.findMany({
    select: {
      slug: true,
    },
  });
  const existingSlugs = new Set(existingCategories.map((category) => category.slug));
  const missingCategories = getSupportedCategoryPresetRecords().filter(
    (category) => !existingSlugs.has(category.slug),
  );

  if (!missingCategories.length) {
    return;
  }

  await db.category.createMany({
    data: missingCategories,
    skipDuplicates: true,
  });
}

async function createUniqueCategorySlug(db, rawSlug, currentCategoryId = null) {
  const baseSlug = createSlug(rawSlug, "category");
  const existingCategories = await db.category.findMany({
    select: {
      id: true,
      slug: true,
    },
    where: {
      slug: {
        startsWith: baseSlug,
      },
    },
  });
  const existingSlugs = new Set(
    existingCategories
      .filter((category) => category.id !== currentCategoryId)
      .map((category) => category.slug),
  );

  if (!existingSlugs.has(baseSlug)) {
    return baseSlug;
  }

  let suffix = 2;
  let candidateSlug = `${baseSlug}-${suffix}`;

  while (existingSlugs.has(candidateSlug)) {
    suffix += 1;
    candidateSlug = `${baseSlug}-${suffix}`;
  }

  return candidateSlug;
}

export async function getCategoryManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  await ensureSupportedCategoryPresets(db);
  const categories = await db.category.findMany({
    include: {
      posts: true,
      streamAssignments: true,
    },
    orderBy: [{ name: "asc" }],
  });

  return {
    categories: categories.map((category) => ({
      ...category,
      postCount: category.posts.length,
      streamCount: category.streamAssignments.length,
    })),
    summary: {
      totalAssignments: categories.reduce((total, category) => total + category.posts.length, 0),
      totalCount: categories.length,
      totalStreamAssignments: categories.reduce(
        (total, category) => total + category.streamAssignments.length,
        0,
      ),
    },
  };
}

export async function saveCategoryRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const name = normalizeDisplayText(input.name);

  if (!name) {
    throw new NewsPubError("Category name is required.", {
      status: "category_validation_failed",
      statusCode: 400,
    });
  }

  const requestedSlug = trimText(input.slug);
  const suggestedSlug = getSuggestedCategorySlug(name, "category");
  const slug = await createUniqueCategorySlug(
    db,
    requestedSlug || suggestedSlug,
    input.id || null,
  );
  const category = input.id
    ? await db.category.update({
        where: { id: input.id },
        data: {
          description: trimText(input.description) || null,
          name,
          slug,
        },
      })
    : await db.category.create({
        data: {
          description: trimText(input.description) || null,
          name,
          slug,
        },
      });

  await createAuditEventRecord(
    {
      action: "CATEGORY_SAVED",
      actorId,
      entityId: category.id,
      entityType: "category",
      payloadJson: {
        slug: category.slug,
      },
    },
    db,
  );

  return category;
}

export async function deleteCategoryRecord(id, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const category = await db.category.delete({
    where: { id },
  });

  await createAuditEventRecord(
    {
      action: "CATEGORY_DELETED",
      actorId,
      entityId: category.id,
      entityType: "category",
      payloadJson: {
        slug: category.slug,
      },
    },
    db,
  );

  return category;
}
