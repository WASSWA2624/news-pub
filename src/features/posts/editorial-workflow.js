import { EditorialStage, PostStatus } from "@prisma/client";
import { z } from "zod";

import { defaultLocale } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";

import { emptyStructuredContent } from "./localized-content";
import {
  createPostPublicRevalidationSnapshot,
  loadPostPublicRevalidationSnapshot,
  revalidatePostPublicSnapshots,
} from "./public-revalidation";

const draftListStatuses = Object.freeze([PostStatus.DRAFT, PostStatus.SCHEDULED]);
const publishedListStatuses = Object.freeze([PostStatus.PUBLISHED]);
export const adminPostInventoryPageSize = 24;

export const editorialStageOrder = Object.freeze([
  EditorialStage.GENERATED,
  EditorialStage.REVIEWED,
  EditorialStage.EDITED,
  EditorialStage.APPROVED,
]);

export const postInventoryScopeValues = Object.freeze(["drafts", "published"]);

const statusTransitionMap = Object.freeze({
  [PostStatus.DRAFT]: new Set([
    PostStatus.DRAFT,
    PostStatus.SCHEDULED,
    PostStatus.PUBLISHED,
    PostStatus.ARCHIVED,
  ]),
  [PostStatus.SCHEDULED]: new Set([
    PostStatus.DRAFT,
    PostStatus.SCHEDULED,
    PostStatus.PUBLISHED,
    PostStatus.ARCHIVED,
  ]),
  [PostStatus.PUBLISHED]: new Set([PostStatus.PUBLISHED, PostStatus.ARCHIVED]),
  [PostStatus.ARCHIVED]: new Set([PostStatus.ARCHIVED]),
});

export const updatePostEditorialRecordSchema = z
  .object({
    categoryIds: z.array(z.string().trim().min(1)).optional(),
    editorialStage: z.nativeEnum(EditorialStage).optional(),
    scheduledPublishAt: z.union([z.string().trim().min(1), z.null()]).optional(),
    slug: z.string().trim().min(1).optional(),
    status: z.nativeEnum(PostStatus).optional(),
  })
  .strict();

export const publishPostRecordSchema = z
  .object({
    postId: z.string().trim().min(1),
    publishAt: z.string().trim().min(1).nullable().optional(),
  })
  .strict();

export class EditorialWorkflowError extends Error {
  constructor(message, { status = "invalid_editorial_workflow", statusCode = 400 } = {}) {
    super(message);
    this.name = "EditorialWorkflowError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

function cloneJsonValue(value) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  return JSON.parse(JSON.stringify(value));
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function dedupeStrings(values) {
  return [...new Set((values || []).map((value) => `${value}`.trim()).filter(Boolean))];
}

function normalizePositiveInteger(value, fallback = 1, { max = 100 } = {}) {
  const parsedValue = Number.parseInt(`${value ?? ""}`.trim(), 10);

  if (Number.isNaN(parsedValue) || parsedValue < 1) {
    return fallback;
  }

  return Math.min(parsedValue, max);
}

function createPagination(totalItems, currentPage, pageSize) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const resolvedCurrentPage = Math.min(currentPage, totalPages);

  if (!totalItems) {
    return {
      currentPage: 1,
      endItem: 0,
      hasNextPage: false,
      hasPreviousPage: false,
      pageSize,
      startItem: 0,
      totalItems: 0,
      totalPages: 1,
    };
  }

  return {
    currentPage: resolvedCurrentPage,
    endItem: Math.min(totalItems, resolvedCurrentPage * pageSize),
    hasNextPage: resolvedCurrentPage < totalPages,
    hasPreviousPage: resolvedCurrentPage > 1,
    pageSize,
    startItem: (resolvedCurrentPage - 1) * pageSize + 1,
    totalItems,
    totalPages,
  };
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function parseScope(scope) {
  return scope === "published" ? "published" : "drafts";
}

function getListStatuses(scope) {
  return parseScope(scope) === "published" ? publishedListStatuses : draftListStatuses;
}

function compareDescendingDates(left, right) {
  return right - left;
}

function getDateValue(value) {
  return value ? new Date(value).getTime() : 0;
}

function sortInventoryPosts(scope, posts) {
  if (parseScope(scope) === "published") {
    return [...posts].sort((left, right) => {
      const publishedComparison = compareDescendingDates(
        getDateValue(left.publishedAt),
        getDateValue(right.publishedAt),
      );

      if (publishedComparison !== 0) {
        return publishedComparison;
      }

      const updatedComparison = compareDescendingDates(
        getDateValue(left.updatedAt),
        getDateValue(right.updatedAt),
      );

      if (updatedComparison !== 0) {
        return updatedComparison;
      }

      return left.slug.localeCompare(right.slug, undefined, {
        sensitivity: "base",
      });
    });
  }

  return [...posts].sort((left, right) => {
    const leftPriority = left.status === PostStatus.SCHEDULED ? 0 : 1;
    const rightPriority = right.status === PostStatus.SCHEDULED ? 0 : 1;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    if (left.status === PostStatus.SCHEDULED && right.status === PostStatus.SCHEDULED) {
      const scheduleComparison = getDateValue(left.scheduledPublishAt) - getDateValue(right.scheduledPublishAt);

      if (scheduleComparison !== 0) {
        return scheduleComparison;
      }
    }

    const updatedComparison = compareDescendingDates(
      getDateValue(left.updatedAt),
      getDateValue(right.updatedAt),
    );

    if (updatedComparison !== 0) {
      return updatedComparison;
    }

    return left.slug.localeCompare(right.slug, undefined, {
      sensitivity: "base",
    });
  });
}

function buildBlankTranslation(locale) {
  return {
    contentHtml: "",
    contentMd: "",
    disclaimer: "",
    excerpt: "",
    faqJson: cloneJsonValue([]),
    locale,
    structuredContentJson: cloneJsonValue(emptyStructuredContent),
    title: "",
    updatedAt: null,
  };
}

function buildTranslationSnapshot(translation, locale) {
  if (!translation) {
    return buildBlankTranslation(locale);
  }

  return {
    contentHtml: translation.contentHtml || "",
    contentMd: translation.contentMd || "",
    disclaimer: translation.disclaimer || "",
    excerpt: translation.excerpt || "",
    faqJson: cloneJsonValue(translation.faqJson) ?? cloneJsonValue([]),
    locale,
    structuredContentJson: cloneJsonValue(translation.structuredContentJson) ?? cloneJsonValue(emptyStructuredContent),
    title: translation.title || "",
    updatedAt: serializeDate(translation.updatedAt),
  };
}

function createInventoryPostSummary(post, locale) {
  const translation = post.translations?.[0] || null;

  return {
    categoryNames: post.categories.map(({ category }) => category.name),
    editorialStage: post.editorialStage,
    equipmentName: post.equipment.name,
    id: post.id,
    locale,
    publicPath: buildLocalizedPath(locale, publicRouteSegments.blogPost(post.slug)),
    publishedAt: serializeDate(post.publishedAt),
    scheduledPublishAt: serializeDate(post.scheduledPublishAt),
    slug: post.slug,
    status: post.status,
    title: translation?.title || post.equipment.name,
    updatedAt: serializeDate(post.updatedAt),
  };
}

function buildInventoryWhereClause({ locale, scope, search }) {
  const trimmedSearch = normalizeDisplayText(search);
  const where = {
    status: {
      in: getListStatuses(scope),
    },
  };

  if (!trimmedSearch) {
    return where;
  }

  return {
    ...where,
    OR: [
      {
        equipment: {
          name: {
            contains: trimmedSearch,
          },
        },
      },
      {
        slug: {
          contains: trimmedSearch,
        },
      },
      {
        translations: {
          some: {
            locale,
            OR: [
              {
                excerpt: {
                  contains: trimmedSearch,
                },
              },
              {
                title: {
                  contains: trimmedSearch,
                },
              },
            ],
          },
        },
      },
      {
        categories: {
          some: {
            category: {
              name: {
                contains: trimmedSearch,
              },
            },
          },
        },
      },
    ],
  };
}

function buildInventoryOrderBy(scope) {
  if (parseScope(scope) === "published") {
    return [{ publishedAt: "desc" }, { updatedAt: "desc" }, { slug: "asc" }];
  }

  return [{ status: "desc" }, { scheduledPublishAt: "asc" }, { updatedAt: "desc" }, { slug: "asc" }];
}

function getNextEditorialStage(currentStage) {
  const currentIndex = editorialStageOrder.indexOf(currentStage);

  if (currentIndex === -1 || currentIndex === editorialStageOrder.length - 1) {
    return null;
  }

  return editorialStageOrder[currentIndex + 1];
}

function assertValidEditorialStageTransition(currentStage, nextStage) {
  if (!nextStage || nextStage === currentStage) {
    return;
  }

  const currentIndex = editorialStageOrder.indexOf(currentStage);
  const nextIndex = editorialStageOrder.indexOf(nextStage);

  if (currentIndex === -1 || nextIndex === -1 || nextIndex !== currentIndex + 1) {
    throw new EditorialWorkflowError(
      `Editorial stage cannot move from "${currentStage}" to "${nextStage}".`,
      {
        status: "invalid_editorial_stage_transition",
        statusCode: 409,
      },
    );
  }
}

function assertValidStatusTransition(currentStatus, nextStatus) {
  if (!nextStatus) {
    return;
  }

  if (!statusTransitionMap[currentStatus]?.has(nextStatus)) {
    throw new EditorialWorkflowError(
      `Post status cannot move from "${currentStatus}" to "${nextStatus}".`,
      {
        status: "invalid_post_status_transition",
        statusCode: 409,
      },
    );
  }
}

function parseDateTime(value, fieldName) {
  if (value === undefined) {
    return undefined;
  }

  if (value === null) {
    return null;
  }

  const parsedDate = new Date(value);

  if (Number.isNaN(parsedDate.getTime())) {
    throw new EditorialWorkflowError(`${fieldName} must be a valid ISO date-time string.`, {
      status: "invalid_datetime",
      statusCode: 400,
    });
  }

  return parsedDate;
}

function buildWorkflowAuditEntries({
  currentPost,
  nextEditorialStage,
  nextStatus,
  nextScheduledPublishAt,
  nextPublishedAt,
}) {
  const auditEntries = [];
  const previousScheduleIso = serializeDate(currentPost.scheduledPublishAt);
  const nextScheduleIso = serializeDate(nextScheduledPublishAt);

  if (nextEditorialStage && nextEditorialStage !== currentPost.editorialStage) {
    auditEntries.push({
      action: "POST_EDITORIAL_STAGE_UPDATED",
      payloadJson: {
        fromEditorialStage: currentPost.editorialStage,
        toEditorialStage: nextEditorialStage,
      },
    });
  }

  if (nextStatus && nextStatus !== currentPost.status) {
    auditEntries.push({
      action: "POST_STATUS_CHANGED",
      payloadJson: {
        fromStatus: currentPost.status,
        previousPublishedAt: serializeDate(currentPost.publishedAt),
        previousScheduledPublishAt: previousScheduleIso,
        publishedAt: serializeDate(nextPublishedAt),
        scheduledPublishAt: nextScheduleIso,
        toStatus: nextStatus,
      },
    });
  }

  if (
    nextStatus === PostStatus.SCHEDULED &&
    (currentPost.status !== PostStatus.SCHEDULED || previousScheduleIso !== nextScheduleIso)
  ) {
    auditEntries.push({
      action: "POST_SCHEDULED",
      payloadJson: {
        fromStatus: currentPost.status,
        previousScheduledPublishAt: previousScheduleIso,
        scheduledPublishAt: nextScheduleIso,
      },
    });
  }

  if (nextStatus === PostStatus.PUBLISHED && currentPost.status !== PostStatus.PUBLISHED) {
    auditEntries.push({
      action: "POST_PUBLISHED",
      payloadJson: {
        clearedScheduledPublishAt: previousScheduleIso,
        fromStatus: currentPost.status,
        publishedAt: serializeDate(nextPublishedAt),
      },
    });
  }

  if (nextStatus === PostStatus.ARCHIVED && currentPost.status !== PostStatus.ARCHIVED) {
    auditEntries.push({
      action: "POST_ARCHIVED",
      payloadJson: {
        fromStatus: currentPost.status,
        previousPublishedAt: serializeDate(currentPost.publishedAt),
        previousScheduledPublishAt: previousScheduleIso,
      },
    });
  }

  return auditEntries;
}

function buildStatusUpdate(currentPost, { scheduledPublishAt, status }) {
  if (status === undefined && scheduledPublishAt === undefined) {
    return {
      auditEntries: [],
      nextPublishedAt: currentPost.publishedAt,
      nextScheduledPublishAt: currentPost.scheduledPublishAt,
      nextStatus: currentPost.status,
      updateData: {},
    };
  }

  const now = new Date();
  const requestedStatus = status ?? currentPost.status;
  const requestedSchedule = parseDateTime(scheduledPublishAt, "scheduledPublishAt");

  assertValidStatusTransition(currentPost.status, requestedStatus);

  let nextStatus = requestedStatus;
  let nextScheduledPublishAt = currentPost.scheduledPublishAt;
  let nextPublishedAt = currentPost.publishedAt;

  if (requestedStatus === PostStatus.SCHEDULED) {
    if (!requestedSchedule) {
      throw new EditorialWorkflowError("A future schedule time is required before scheduling a post.", {
        status: "missing_schedule_publish_at",
        statusCode: 400,
      });
    }

    if (requestedSchedule <= now) {
      throw new EditorialWorkflowError("scheduledPublishAt must be in the future when scheduling a post.", {
        status: "invalid_schedule_publish_at",
        statusCode: 400,
      });
    }

    nextScheduledPublishAt = requestedSchedule;
    nextPublishedAt = currentPost.publishedAt;
  } else if (requestedStatus === PostStatus.PUBLISHED) {
    nextPublishedAt = currentPost.status === PostStatus.PUBLISHED ? currentPost.publishedAt : now;
    nextScheduledPublishAt = null;
  } else if (requestedStatus === PostStatus.DRAFT) {
    if (scheduledPublishAt && currentPost.status !== PostStatus.SCHEDULED) {
      throw new EditorialWorkflowError("Draft posts cannot keep a future scheduled publish time.", {
        status: "invalid_schedule_publish_at",
        statusCode: 400,
      });
    }

    nextScheduledPublishAt = null;
  } else if (requestedStatus === PostStatus.ARCHIVED) {
    nextScheduledPublishAt = null;
  }

  if (status === undefined && scheduledPublishAt !== undefined) {
    if (currentPost.status !== PostStatus.SCHEDULED) {
      throw new EditorialWorkflowError("Only scheduled posts can change their scheduled publish time.", {
        status: "invalid_schedule_publish_at",
        statusCode: 409,
      });
    }

    nextStatus = currentPost.status;
    nextScheduledPublishAt = requestedSchedule;

    if (!nextScheduledPublishAt || nextScheduledPublishAt <= now) {
      throw new EditorialWorkflowError("scheduledPublishAt must stay in the future for scheduled posts.", {
        status: "invalid_schedule_publish_at",
        statusCode: 400,
      });
    }
  }

  const updateData = {};

  if (nextStatus !== currentPost.status) {
    updateData.status = nextStatus;
  }

  if (serializeDate(nextScheduledPublishAt) !== serializeDate(currentPost.scheduledPublishAt)) {
    updateData.scheduledPublishAt = nextScheduledPublishAt;
  }

  if (serializeDate(nextPublishedAt) !== serializeDate(currentPost.publishedAt)) {
    updateData.publishedAt = nextPublishedAt;
  }

  return {
    auditEntries: buildWorkflowAuditEntries({
      currentPost,
      nextPublishedAt,
      nextScheduledPublishAt,
      nextStatus,
    }),
    nextPublishedAt,
    nextScheduledPublishAt,
    nextStatus,
    updateData,
  };
}

async function buildUniquePostSlug(tx, baseSlug, postId) {
  const rootSlug = baseSlug || "draft";
  let slug = rootSlug;
  let suffix = 2;

  while (true) {
    const existingRecord = await tx.post.findFirst({
      where: {
        slug,
        ...(postId
          ? {
              NOT: {
                id: postId,
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

function haveCategorySelectionsChanged(currentCategoryIds, nextCategoryIds) {
  if (currentCategoryIds.length !== nextCategoryIds.length) {
    return true;
  }

  return currentCategoryIds.some((categoryId, index) => categoryId !== nextCategoryIds[index]);
}

async function syncPostCategories(tx, postId, categoryIds, actorId) {
  if (categoryIds === undefined) {
    return;
  }

  const normalizedCategoryIds = dedupeStrings(categoryIds).sort((left, right) =>
    left.localeCompare(right, undefined, {
      sensitivity: "base",
    }),
  );
  const existingCategories = await tx.postCategory.findMany({
    where: {
      postId,
    },
    select: {
      categoryId: true,
    },
  });
  const currentCategoryIds = existingCategories
    .map(({ categoryId }) => categoryId)
    .sort((left, right) =>
      left.localeCompare(right, undefined, {
        sensitivity: "base",
      }),
    );

  if (!haveCategorySelectionsChanged(currentCategoryIds, normalizedCategoryIds)) {
    return;
  }

  const categories = normalizedCategoryIds.length
    ? await tx.category.findMany({
        where: {
          id: {
            in: normalizedCategoryIds,
          },
        },
        select: {
          id: true,
          name: true,
          slug: true,
        },
      })
    : [];

  if (categories.length !== normalizedCategoryIds.length) {
    throw new EditorialWorkflowError("One or more selected categories were not found.", {
      status: "category_not_found",
      statusCode: 404,
    });
  }

  await tx.postCategory.deleteMany({
    where: {
      postId,
    },
  });

  if (normalizedCategoryIds.length) {
    await tx.postCategory.createMany({
      data: normalizedCategoryIds.map((categoryId) => ({
        categoryId,
        postId,
      })),
    });
  }

  if (actorId) {
    await tx.auditEvent.create({
      data: {
        action: "POST_CATEGORIES_UPDATED",
        actorId,
        entityId: postId,
        entityType: "post",
        payloadJson: {
          categoryIds: normalizedCategoryIds,
          categorySlugs: categories.map((category) => category.slug),
        },
      },
    });
  }
}

async function writeWorkflowAuditEntries(tx, actorId, postId, slug, auditEntries) {
  if (!actorId || !auditEntries.length) {
    return;
  }

  for (const auditEntry of auditEntries) {
    await tx.auditEvent.create({
      data: {
        action: auditEntry.action,
        actorId,
        entityId: postId,
        entityType: "post",
        payloadJson: {
          slug,
          ...auditEntry.payloadJson,
        },
      },
    });
  }
}

export async function getPostInventorySnapshot(
  { locale = defaultLocale, page = 1, pageSize = adminPostInventoryPageSize, scope = "drafts", search } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const resolvedScope = parseScope(scope);
  const resolvedLocale = normalizeDisplayText(locale) || defaultLocale;
  const requestedPage = normalizePositiveInteger(page);
  const resolvedPageSize = normalizePositiveInteger(pageSize, adminPostInventoryPageSize);
  const where = buildInventoryWhereClause({
    locale: resolvedLocale,
    scope: resolvedScope,
    search,
  });
  const [
    totalMatchingCount,
    draftCount,
    scheduledCount,
    publishedCount,
    archivedCount,
  ] = await Promise.all([
    db.post.count({
      where,
    }),
    db.post.count({
      where: {
        status: PostStatus.DRAFT,
      },
    }),
    db.post.count({
      where: {
        status: PostStatus.SCHEDULED,
      },
    }),
    db.post.count({
      where: {
        status: PostStatus.PUBLISHED,
      },
    }),
    db.post.count({
      where: {
        status: PostStatus.ARCHIVED,
      },
    }),
  ]);
  const pagination = createPagination(totalMatchingCount, requestedPage, resolvedPageSize);
  const posts = totalMatchingCount
    ? await db.post.findMany({
        orderBy: buildInventoryOrderBy(resolvedScope),
        select: {
          categories: {
            orderBy: {
              category: {
                name: "asc",
              },
            },
            select: {
              category: {
                select: {
                  name: true,
                },
              },
            },
          },
          editorialStage: true,
          equipment: {
            select: {
              name: true,
            },
          },
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
              title: true,
            },
            take: 1,
            where: {
              locale: resolvedLocale,
            },
          },
          updatedAt: true,
        },
        skip: (pagination.currentPage - 1) * pagination.pageSize,
        take: pagination.pageSize,
        where,
      })
    : [];

  return {
    filters: {
      locale: resolvedLocale,
      page: pagination.currentPage,
      scope: resolvedScope,
      search: normalizeDisplayText(search) || "",
    },
    pagination,
    posts: sortInventoryPosts(resolvedScope, posts.map((post) => createInventoryPostSummary(post, resolvedLocale))),
    summary: {
      archivedCount,
      draftCount,
      matchingCount: totalMatchingCount,
      publishedCount,
      scheduledCount,
    },
  };
}

export async function getPostEditorSnapshot({ locale = defaultLocale, postId }, prisma) {
  const db = await resolvePrismaClient(prisma);
  const resolvedLocale = normalizeDisplayText(locale) || defaultLocale;
  const [post, categories] = await Promise.all([
    db.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        _count: {
          select: {
            categories: true,
            faults: true,
            generationJobs: true,
            maintenanceTasks: true,
            sourceReferences: true,
          },
        },
        categories: {
          orderBy: {
            category: {
              name: "asc",
            },
          },
          select: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        createdAt: true,
        editorialStage: true,
        equipment: {
          select: {
            name: true,
            slug: true,
          },
        },
        id: true,
        publishedAt: true,
        scheduledPublishAt: true,
        slug: true,
        status: true,
        translations: {
          select: {
            contentHtml: true,
            contentMd: true,
            disclaimer: true,
            excerpt: true,
            faqJson: true,
            locale: true,
            seoRecord: {
              select: {
                canonicalUrl: true,
                metaDescription: true,
                metaTitle: true,
              },
            },
            structuredContentJson: true,
            title: true,
            updatedAt: true,
          },
          take: 1,
          where: {
            locale: resolvedLocale,
          },
        },
        updatedAt: true,
      },
    }),
    db.category.findMany({
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
    }),
  ]);

  if (!post) {
    throw new EditorialWorkflowError(`Post "${postId}" was not found.`, {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  const translation = post.translations[0] || null;
  const assignedCategoryIds = new Set(post.categories.map(({ category }) => category.id));

  return {
    categories: categories.map((category) => ({
      description: category.description || "",
      id: category.id,
      isAssigned: assignedCategoryIds.has(category.id),
      name: category.name,
      postCount: category._count.posts,
      slug: category.slug,
    })),
    lifecycle: {
      editorialStages: editorialStageOrder,
      nextEditorialStage: getNextEditorialStage(post.editorialStage),
      statusTargets: [...statusTransitionMap[post.status]],
    },
    post: {
      categoryCount: post._count.categories,
      createdAt: serializeDate(post.createdAt),
      editorialStage: post.editorialStage,
      equipmentName: post.equipment.name,
      equipmentPath: buildLocalizedPath(resolvedLocale, publicRouteSegments.equipment(post.equipment.slug)),
      faultCount: post._count.faults,
      generationJobCount: post._count.generationJobs,
      id: post.id,
      maintenanceTaskCount: post._count.maintenanceTasks,
      publicPath: buildLocalizedPath(resolvedLocale, publicRouteSegments.blogPost(post.slug)),
      publishedAt: serializeDate(post.publishedAt),
      scheduledPublishAt: serializeDate(post.scheduledPublishAt),
      slug: post.slug,
      sourceReferenceCount: post._count.sourceReferences,
      status: post.status,
      updatedAt: serializeDate(post.updatedAt),
    },
    selection: {
      locale: resolvedLocale,
      postId,
    },
    seo: {
      canonicalUrl: translation?.seoRecord?.canonicalUrl || null,
      metaDescription: translation?.seoRecord?.metaDescription || null,
      metaTitle: translation?.seoRecord?.metaTitle || null,
    },
    translation: buildTranslationSnapshot(translation, resolvedLocale),
  };
}

export async function updatePostEditorialRecord({ postId, ...input }, options = {}, prisma) {
  const parsedInput = updatePostEditorialRecordSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  let previousPublicSnapshot = null;

  await db.$transaction(async (tx) => {
    const currentPost = await tx.post.findUnique({
      where: {
        id: postId,
      },
      select: {
        categories: {
          select: {
            category: {
              select: {
                slug: true,
              },
            },
          },
        },
        editorialStage: true,
        equipment: {
          select: {
            slug: true,
          },
        },
        id: true,
        manufacturers: {
          select: {
            manufacturer: {
              select: {
                slug: true,
              },
            },
          },
        },
        publishedAt: true,
        scheduledPublishAt: true,
        slug: true,
        status: true,
      },
    });

    if (!currentPost) {
      throw new EditorialWorkflowError(`Post "${postId}" was not found.`, {
        status: "post_not_found",
        statusCode: 404,
      });
    }

    previousPublicSnapshot = createPostPublicRevalidationSnapshot(currentPost);

    const updateData = {};

    if (parsedInput.editorialStage !== undefined) {
      assertValidEditorialStageTransition(currentPost.editorialStage, parsedInput.editorialStage);

      if (parsedInput.editorialStage !== currentPost.editorialStage) {
        updateData.editorialStage = parsedInput.editorialStage;
      }
    }

    if (parsedInput.slug !== undefined) {
      const normalizedSlug = await buildUniquePostSlug(
        tx,
        createSlug(parsedInput.slug, "draft"),
        postId,
      );

      if (normalizedSlug !== currentPost.slug) {
        updateData.slug = normalizedSlug;
      }
    }

    const statusUpdate = buildStatusUpdate(currentPost, {
      scheduledPublishAt: parsedInput.scheduledPublishAt,
      status: parsedInput.status,
    });
    Object.assign(updateData, statusUpdate.updateData);

    if (Object.keys(updateData).length) {
      await tx.post.update({
        where: {
          id: postId,
        },
        data: updateData,
      });
    }

    await syncPostCategories(tx, postId, parsedInput.categoryIds, options.actorId);

    await writeWorkflowAuditEntries(
      tx,
      options.actorId,
      postId,
      updateData.slug || currentPost.slug,
      buildWorkflowAuditEntries({
        currentPost,
        nextEditorialStage: updateData.editorialStage || currentPost.editorialStage,
        nextPublishedAt:
          updateData.publishedAt === undefined ? currentPost.publishedAt : updateData.publishedAt,
        nextScheduledPublishAt:
          updateData.scheduledPublishAt === undefined
            ? currentPost.scheduledPublishAt
            : updateData.scheduledPublishAt,
        nextStatus: updateData.status || currentPost.status,
      }),
    );
  });
  const nextPublicSnapshot = await loadPostPublicRevalidationSnapshot(postId, db);
  const revalidation = await revalidatePostPublicSnapshots(
    {
      actorId: options.actorId || null,
      afterSnapshot: nextPublicSnapshot,
      beforeSnapshot: previousPublicSnapshot,
      trigger: "editorial_update",
    },
    {
      revalidate: options.revalidate,
    },
    db,
  );

  return {
    revalidation,
    snapshot: await getPostEditorSnapshot(
      {
        locale: defaultLocale,
        postId,
      },
      db,
    ),
  };
}

export async function publishPostRecord(input, options = {}, prisma) {
  const parsedInput = publishPostRecordSchema.parse(input);
  const publishAt = parsedInput.publishAt ? new Date(parsedInput.publishAt) : null;

  if (publishAt && Number.isNaN(publishAt.getTime())) {
    throw new EditorialWorkflowError("publishAt must be a valid ISO date-time string.", {
      status: "invalid_datetime",
      statusCode: 400,
    });
  }

  return updatePostEditorialRecord(
    {
      postId: parsedInput.postId,
      scheduledPublishAt: parsedInput.publishAt ?? null,
      status: parsedInput.publishAt ? PostStatus.SCHEDULED : PostStatus.PUBLISHED,
    },
    options,
    prisma,
  );
}

export function createEditorialWorkflowErrorPayload(error) {
  if (error instanceof EditorialWorkflowError) {
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
      message: "An unexpected editorial workflow error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}
