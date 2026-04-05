import crypto from "node:crypto";

import { PostStatus } from "@prisma/client";

import { revalidatePublishedPostPaths } from "@/lib/revalidation";

const DEFAULT_BATCH_SIZE = 25;
const DEFAULT_MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_DELAY_MS = 250;

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeInteger(value, fallbackValue, { max = Number.MAX_SAFE_INTEGER, min = 0 } = {}) {
  if (value === undefined || value === null || value === "") {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(`${value}`, 10);

  if (!Number.isInteger(parsedValue)) {
    return fallbackValue;
  }

  return Math.min(Math.max(parsedValue, min), max);
}

function getExecutionKey(postId, scheduledPublishAt) {
  return `${postId}:${serializeDate(scheduledPublishAt) || "unscheduled"}`;
}

function getErrorMessage(error) {
  return error instanceof Error ? error.message : `${error}`;
}

function waitForDelay(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

async function createAuditEvent(db, data) {
  return db.auditEvent.create({
    data,
  });
}

function buildExecutionPayload(post, extraPayload = {}) {
  return {
    executionKey: getExecutionKey(post.id, post.scheduledPublishAt),
    scheduledPublishAt: serializeDate(post.scheduledPublishAt),
    slug: post.slug,
    ...extraPayload,
  };
}

function mapCandidateToPostContext(post) {
  return {
    categorySlugs: post.categories.map(({ category }) => category.slug),
    equipmentSlug: post.equipment?.slug || null,
    id: post.id,
    manufacturerSlugs: post.manufacturers.map(({ manufacturer }) => manufacturer.slug),
    publishedAt: serializeDate(post.publishedAt),
    scheduledPublishAt: serializeDate(post.scheduledPublishAt),
    slug: post.slug,
    status: post.status,
  };
}

function buildStatusChangedAudit(post, publishedAt) {
  return {
    action: "POST_STATUS_CHANGED",
    actorId: null,
    entityId: post.id,
    entityType: "post",
    payloadJson: {
      fromStatus: post.status,
      previousPublishedAt: serializeDate(post.publishedAt),
      previousScheduledPublishAt: serializeDate(post.scheduledPublishAt),
      publishedAt: serializeDate(publishedAt),
      scheduledPublishAt: null,
      slug: post.slug,
      toStatus: PostStatus.PUBLISHED,
    },
  };
}

function buildPublishedAudit(post, publishedAt) {
  return {
    action: "POST_PUBLISHED",
    actorId: null,
    entityId: post.id,
    entityType: "post",
    payloadJson: {
      clearedScheduledPublishAt: serializeDate(post.scheduledPublishAt),
      fromStatus: post.status,
      publishedAt: serializeDate(publishedAt),
      slug: post.slug,
    },
  };
}

async function getDueScheduledPosts({ batchSize, now }, db) {
  return db.post.findMany({
    orderBy: [{ scheduledPublishAt: "asc" }, { id: "asc" }],
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
      scheduledPublishAt: true,
      slug: true,
      status: true,
    },
    take: batchSize,
    where: {
      scheduledPublishAt: {
        lte: now,
      },
      status: PostStatus.SCHEDULED,
    },
  });
}

async function loadScheduledPostForExecution(tx, postId) {
  return tx.post.findUnique({
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
      scheduledPublishAt: true,
      slug: true,
      status: true,
    },
    where: {
      id: postId,
    },
  });
}

async function tryPublishScheduledPost({ attempt, candidate, now, runId }, db) {
  return db.$transaction(async (tx) => {
    const currentPost = await loadScheduledPostForExecution(tx, candidate.id);

    if (!currentPost) {
      return {
        post: candidate,
        reason: "post_not_found",
        status: "skipped",
      };
    }

    if (currentPost.status !== PostStatus.SCHEDULED) {
      return {
        post: currentPost,
        reason: "post_not_scheduled",
        status: "skipped",
      };
    }

    if (!currentPost.scheduledPublishAt || currentPost.scheduledPublishAt > now) {
      return {
        post: currentPost,
        reason: "post_not_due",
        status: "skipped",
      };
    }

    const publishedAt = new Date(now);
    const claimResult = await tx.post.updateMany({
      data: {
        publishedAt,
        scheduledPublishAt: null,
        status: PostStatus.PUBLISHED,
      },
      where: {
        id: currentPost.id,
        scheduledPublishAt: currentPost.scheduledPublishAt,
        status: PostStatus.SCHEDULED,
      },
    });

    if (!claimResult.count) {
      return {
        post: currentPost,
        reason: "already_processed",
        status: "skipped",
      };
    }

    await createAuditEvent(tx, buildStatusChangedAudit(currentPost, publishedAt));
    await createAuditEvent(tx, buildPublishedAudit(currentPost, publishedAt));
    await createAuditEvent(tx, {
      action: "POST_SCHEDULED_PUBLISH_SUCCEEDED",
      actorId: null,
      entityId: currentPost.id,
      entityType: "post",
      payloadJson: buildExecutionPayload(currentPost, {
        attempt,
        publishedAt: serializeDate(publishedAt),
        runId,
      }),
    });

    return {
      post: {
        ...currentPost,
        publishedAt,
        scheduledPublishAt: null,
        status: PostStatus.PUBLISHED,
      },
      status: "published",
    };
  });
}

async function retryPublishedPostRevalidation({
  db,
  maxAttempts,
  post,
  revalidate,
  retryDelayMs,
  runId,
  wait,
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const revalidatedPaths = await revalidatePublishedPostPaths(
        {
          categorySlugs: post.categories.map(({ category }) => category.slug),
          equipmentSlug: post.equipment?.slug || null,
          manufacturerSlugs: post.manufacturers.map(({ manufacturer }) => manufacturer.slug),
          slug: post.slug,
        },
        revalidate,
      );

      await createAuditEvent(db, {
        action: "POST_PUBLISH_REVALIDATED",
        actorId: null,
        entityId: post.id,
        entityType: "post",
        payloadJson: buildExecutionPayload(post, {
          attempt,
          paths: revalidatedPaths,
          publishedAt: serializeDate(post.publishedAt),
          runId,
        }),
      });

      return {
        paths: revalidatedPaths,
        status: "revalidated",
      };
    } catch (error) {
      await createAuditEvent(db, {
        action: "POST_PUBLISH_REVALIDATION_FAILED",
        actorId: null,
        entityId: post.id,
        entityType: "post",
        payloadJson: buildExecutionPayload(post, {
          attempt,
          errorMessage: getErrorMessage(error),
          publishedAt: serializeDate(post.publishedAt),
          runId,
        }),
      });

      if (attempt >= maxAttempts) {
        return {
          errorMessage: getErrorMessage(error),
          paths: [],
          status: "failed",
        };
      }

      if (retryDelayMs > 0) {
        await wait(retryDelayMs * attempt);
      }
    }
  }

  return {
    paths: [],
    status: "failed",
  };
}

async function executeScheduledPublishCandidate({
  candidate,
  db,
  maxAttempts,
  now,
  revalidate,
  retryDelayMs,
  runId,
  wait,
}) {
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const publishResult = await tryPublishScheduledPost(
        {
          attempt,
          candidate,
          now,
          runId,
        },
        db,
      );

      if (publishResult.status !== "published") {
        return {
          attemptCount: attempt,
          executionKey: getExecutionKey(candidate.id, candidate.scheduledPublishAt),
          id: candidate.id,
          post: mapCandidateToPostContext(publishResult.post),
          reason: publishResult.reason,
          revalidatedPaths: [],
          revalidationStatus: "skipped",
          slug: candidate.slug,
          status: publishResult.status,
        };
      }

      const revalidationResult = await retryPublishedPostRevalidation({
        db,
        maxAttempts,
        post: publishResult.post,
        revalidate,
        retryDelayMs,
        runId,
        wait,
      });

      return {
        attemptCount: attempt,
        executionKey: getExecutionKey(candidate.id, candidate.scheduledPublishAt),
        id: candidate.id,
        post: mapCandidateToPostContext(publishResult.post),
        publishedAt: serializeDate(publishResult.post.publishedAt),
        reason: null,
        revalidatedPaths: revalidationResult.paths,
        revalidationStatus: revalidationResult.status,
        slug: candidate.slug,
        status: publishResult.status,
      };
    } catch (error) {
      await createAuditEvent(db, {
        action: "POST_SCHEDULED_PUBLISH_FAILED",
        actorId: null,
        entityId: candidate.id,
        entityType: "post",
        payloadJson: buildExecutionPayload(candidate, {
          attempt,
          errorMessage: getErrorMessage(error),
          runId,
        }),
      });

      if (attempt >= maxAttempts) {
        return {
          attemptCount: attempt,
          errorMessage: getErrorMessage(error),
          executionKey: getExecutionKey(candidate.id, candidate.scheduledPublishAt),
          id: candidate.id,
          post: mapCandidateToPostContext(candidate),
          reason: "publish_failed",
          revalidatedPaths: [],
          revalidationStatus: "skipped",
          slug: candidate.slug,
          status: "failed",
        };
      }

      if (retryDelayMs > 0) {
        await wait(retryDelayMs * attempt);
      }
    }
  }

  return {
    attemptCount: maxAttempts,
    executionKey: getExecutionKey(candidate.id, candidate.scheduledPublishAt),
    id: candidate.id,
    post: mapCandidateToPostContext(candidate),
    reason: "publish_failed",
    revalidatedPaths: [],
    revalidationStatus: "skipped",
    slug: candidate.slug,
    status: "failed",
  };
}

export async function runScheduledPublishingWorker(options = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const now = options.now ? new Date(options.now) : new Date();

  if (Number.isNaN(now.getTime())) {
    throw new Error("Scheduled publishing worker requires a valid execution time.");
  }

  const batchSize = normalizeInteger(options.batchSize, DEFAULT_BATCH_SIZE, {
    max: 100,
    min: 1,
  });
  const maxAttempts = normalizeInteger(options.maxAttempts, DEFAULT_MAX_ATTEMPTS, {
    max: 5,
    min: 1,
  });
  const retryDelayMs = normalizeInteger(options.retryDelayMs, DEFAULT_RETRY_DELAY_MS, {
    max: 10_000,
    min: 0,
  });
  const runId = options.runId || crypto.randomUUID();
  const wait = typeof options.wait === "function" ? options.wait : waitForDelay;
  const revalidate = typeof options.revalidate === "function" ? options.revalidate : undefined;

  await createAuditEvent(db, {
    action: "SCHEDULED_PUBLISH_RUN_STARTED",
    actorId: null,
    entityId: runId,
    entityType: "scheduled_publish_worker",
    payloadJson: {
      batchSize,
      maxAttempts,
      retryDelayMs,
      startedAt: serializeDate(now),
    },
  });

  const duePosts = await getDueScheduledPosts(
    {
      batchSize,
      now,
    },
    db,
  );

  const results = [];

  for (const duePost of duePosts) {
    const result = await executeScheduledPublishCandidate({
      candidate: duePost,
      db,
      maxAttempts,
      now,
      revalidate,
      retryDelayMs,
      runId,
      wait,
    });

    results.push(result);
  }

  const completedAt = new Date();
  const summary = {
    batchSize,
    completedAt: serializeDate(completedAt),
    dueCount: duePosts.length,
    failedCount: results.filter((result) => result.status === "failed").length,
    now: serializeDate(now),
    processedCount: results.length,
    publishedCount: results.filter((result) => result.status === "published").length,
    revalidationFailureCount: results.filter(
      (result) => result.status === "published" && result.revalidationStatus === "failed",
    ).length,
    runId,
    skippedCount: results.filter((result) => result.status === "skipped").length,
  };

  await createAuditEvent(db, {
    action: "SCHEDULED_PUBLISH_RUN_COMPLETED",
    actorId: null,
    entityId: runId,
    entityType: "scheduled_publish_worker",
    payloadJson: summary,
  });

  return {
    ...summary,
    results,
  };
}
