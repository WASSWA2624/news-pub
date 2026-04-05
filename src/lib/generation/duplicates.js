import { PostStatus } from "@prisma/client";

import { createCanonicalEquipmentIdentity, normalizeDisplayText } from "@/lib/normalization";

const nonArchivedPostStatuses = Object.freeze([
  PostStatus.DRAFT,
  PostStatus.SCHEDULED,
  PostStatus.PUBLISHED,
]);

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function createEquipmentSnapshot(equipment) {
  if (!equipment) {
    return null;
  }

  return {
    id: equipment.id,
    name: equipment.name,
    normalizedName: equipment.normalizedName,
    slug: equipment.slug,
  };
}

function getStatusReplacementPriority(status) {
  if (status === PostStatus.PUBLISHED) {
    return 0;
  }

  if (status === PostStatus.SCHEDULED) {
    return 1;
  }

  return 2;
}

function compareReplacementCandidates(left, right, equipmentSlug) {
  const leftSlugPriority = left.slug === equipmentSlug ? 0 : 1;
  const rightSlugPriority = right.slug === equipmentSlug ? 0 : 1;

  if (leftSlugPriority !== rightSlugPriority) {
    return leftSlugPriority - rightSlugPriority;
  }

  const leftStatusPriority = getStatusReplacementPriority(left.status);
  const rightStatusPriority = getStatusReplacementPriority(right.status);

  if (leftStatusPriority !== rightStatusPriority) {
    return leftStatusPriority - rightStatusPriority;
  }

  const leftUpdatedAt = left.updatedAt instanceof Date ? left.updatedAt.getTime() : 0;
  const rightUpdatedAt = right.updatedAt instanceof Date ? right.updatedAt.getTime() : 0;

  if (leftUpdatedAt !== rightUpdatedAt) {
    return rightUpdatedAt - leftUpdatedAt;
  }

  const leftCreatedAt = left.createdAt instanceof Date ? left.createdAt.getTime() : 0;
  const rightCreatedAt = right.createdAt instanceof Date ? right.createdAt.getTime() : 0;

  if (leftCreatedAt !== rightCreatedAt) {
    return rightCreatedAt - leftCreatedAt;
  }

  return left.slug.localeCompare(right.slug, undefined, {
    sensitivity: "base",
  });
}

function createDuplicateMatchSnapshot(post, locale) {
  const translation = post.translations?.[0] || null;

  return {
    createdAt: serializeDate(post.createdAt),
    editorialStage: post.editorialStage,
    locale,
    postId: post.id,
    publishedAt: serializeDate(post.publishedAt),
    scheduledPublishAt: serializeDate(post.scheduledPublishAt),
    slug: post.slug,
    status: post.status,
    title: translation?.title || null,
    translationId: translation?.id || null,
    updatedAt: serializeDate(post.updatedAt),
  };
}

export async function detectDuplicateEquipmentPost(
  { equipmentId, equipmentName, locale },
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const canonicalEquipment = createCanonicalEquipmentIdentity(equipmentName);
  const resolvedLocale = normalizeDisplayText(locale);
  const equipmentLookup = equipmentId
    ? {
        id: equipmentId,
      }
    : canonicalEquipment.normalizedName
      ? {
          normalizedName: canonicalEquipment.normalizedName,
        }
      : null;

  if (!equipmentLookup || !resolvedLocale) {
    return {
      canonicalEquipment,
      duplicateDetected: false,
      duplicateMatch: null,
      equipment: null,
      locale: resolvedLocale || null,
      matchCount: 0,
    };
  }

  const equipment = await db.equipment.findUnique({
    where: equipmentLookup,
    select: {
      id: true,
      name: true,
      normalizedName: true,
      slug: true,
    },
  });

  if (!equipment) {
    return {
      canonicalEquipment,
      duplicateDetected: false,
      duplicateMatch: null,
      equipment: null,
      locale: resolvedLocale,
      matchCount: 0,
    };
  }

  const matches = await db.post.findMany({
    where: {
      equipmentId: equipment.id,
      status: {
        in: nonArchivedPostStatuses,
      },
      translations: {
        some: {
          locale: resolvedLocale,
        },
      },
    },
    orderBy: [{ updatedAt: "desc" }, { createdAt: "desc" }, { slug: "asc" }],
    select: {
      createdAt: true,
      editorialStage: true,
      id: true,
      publishedAt: true,
      scheduledPublishAt: true,
      slug: true,
      status: true,
      translations: {
        orderBy: {
          updatedAt: "desc",
        },
        select: {
          id: true,
          title: true,
        },
        take: 1,
        where: {
          locale: resolvedLocale,
        },
      },
      updatedAt: true,
    },
  });
  const replacementCandidate = [...matches].sort((left, right) =>
    compareReplacementCandidates(left, right, equipment.slug),
  )[0];

  return {
    canonicalEquipment,
    duplicateDetected: Boolean(replacementCandidate),
    duplicateMatch: replacementCandidate
      ? createDuplicateMatchSnapshot(replacementCandidate, resolvedLocale)
      : null,
    equipment: createEquipmentSnapshot(equipment),
    locale: resolvedLocale,
    matchCount: matches.length,
  };
}
