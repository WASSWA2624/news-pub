import { PostStatus } from "@prisma/client";

import { buildPublishedPostRevalidationPaths, revalidatePaths } from "@/lib/revalidation";

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeSlugList(entries = [], relationKey) {
  return [...new Set(
    entries
      .map((entry) => entry?.[relationKey]?.slug)
      .filter((slug) => typeof slug === "string" && slug.trim()),
  )];
}

export function createPostPublicRevalidationSnapshot(post) {
  if (!post?.id || !post?.slug) {
    return null;
  }

  return {
    categorySlugs: normalizeSlugList(post.categories, "category"),
    equipmentSlug: post.equipment?.slug || null,
    id: post.id,
    manufacturerSlugs: normalizeSlugList(post.manufacturers, "manufacturer"),
    publishedAt: serializeDate(post.publishedAt),
    slug: post.slug,
    status: post.status,
  };
}

export function isVisiblePublishedSnapshot(snapshot) {
  return snapshot?.status === PostStatus.PUBLISHED && Boolean(snapshot?.publishedAt) && Boolean(snapshot?.slug);
}

export async function loadPostPublicRevalidationSnapshot(postId, db) {
  const post = await db.post.findUnique({
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
      slug: true,
      status: true,
    },
    where: {
      id: postId,
    },
  });

  return createPostPublicRevalidationSnapshot(post);
}

async function writeRevalidationAuditEvent(db, { action, actorId = null, payloadJson, postId }) {
  if (typeof db.auditEvent?.create !== "function") {
    return;
  }

  await db.auditEvent.create({
    data: {
      action,
      actorId,
      entityId: postId,
      entityType: "post",
      payloadJson,
    },
  });
}

export async function revalidatePostPublicSnapshots(
  { actorId = null, afterSnapshot, beforeSnapshot, trigger = "post_update" },
  options = {},
  db,
) {
  const candidatePaths = [
    ...(isVisiblePublishedSnapshot(beforeSnapshot) ? buildPublishedPostRevalidationPaths(beforeSnapshot) : []),
    ...(isVisiblePublishedSnapshot(afterSnapshot) ? buildPublishedPostRevalidationPaths(afterSnapshot) : []),
  ];

  if (!candidatePaths.length) {
    return {
      paths: [],
      status: "skipped",
    };
  }

  const auditTarget = afterSnapshot || beforeSnapshot;

  try {
    const paths = await revalidatePaths(candidatePaths, options.revalidate);

    await writeRevalidationAuditEvent(db, {
      action: "POST_PUBLISH_REVALIDATED",
      actorId,
      payloadJson: {
        paths,
        previousPublishedAt: beforeSnapshot?.publishedAt || null,
        previousSlug: beforeSnapshot?.slug || null,
        publishedAt: afterSnapshot?.publishedAt || null,
        slug: afterSnapshot?.slug || beforeSnapshot?.slug || null,
        status: afterSnapshot?.status || beforeSnapshot?.status || null,
        trigger,
      },
      postId: auditTarget?.id,
    }).catch(() => null);

    return {
      paths,
      status: "revalidated",
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : `${error}`;

    await writeRevalidationAuditEvent(db, {
      action: "POST_PUBLISH_REVALIDATION_FAILED",
      actorId,
      payloadJson: {
        errorMessage,
        paths: candidatePaths,
        previousPublishedAt: beforeSnapshot?.publishedAt || null,
        previousSlug: beforeSnapshot?.slug || null,
        publishedAt: afterSnapshot?.publishedAt || null,
        slug: afterSnapshot?.slug || beforeSnapshot?.slug || null,
        status: afterSnapshot?.status || beforeSnapshot?.status || null,
        trigger,
      },
      postId: auditTarget?.id,
    }).catch(() => null);

    return {
      errorMessage,
      paths: candidatePaths,
      status: "failed",
    };
  }
}
