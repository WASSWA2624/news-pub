import { createAuditEventRecord } from "@/lib/analytics";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";

export async function getCategoryManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
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

  const slug = trimText(input.slug) || createSlug(name, "category");
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
