import { CommentStatus, PostStatus } from "@prisma/client";

import { defaultLocale, supportedLocales } from "@/features/i18n/config";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import {
  buildCommentCaptchaChallenge,
  commentDuplicateLookbackMs,
  commentReplyDepthLimit,
  containsProfanity,
  createCommentPreview,
  detectSpamSignals,
  extractRequestIp,
  extractRequestUserAgent,
  hashCommentValue,
  isDuplicateComment,
  verifyCommentCaptchaChallenge,
} from "@/lib/comments";
import { env } from "@/lib/env/server";
import { normalizeDisplayText } from "@/lib/normalization";
import { revalidatePaths } from "@/lib/revalidation";
import {
  commentDeletionSchema,
  commentModerationStatusValues,
  commentModerationUpdateSchema,
  commentSubmissionSchema,
} from "@/lib/validation";

export const commentModerationFilterValues = Object.freeze([
  "ALL",
  ...commentModerationStatusValues,
]);
export const adminCommentModerationPageSize = 20;

const commentModerationActionByStatus = Object.freeze({
  [CommentStatus.APPROVED]: "COMMENT_APPROVED",
  [CommentStatus.PENDING]: "COMMENT_RETURNED_TO_PENDING",
  [CommentStatus.REJECTED]: "COMMENT_REJECTED",
  [CommentStatus.SPAM]: "COMMENT_MARKED_AS_SPAM",
});

const commentModerationActionLabels = Object.freeze({
  COMMENT_APPROVED: "Approved",
  COMMENT_AUTO_REJECTED: "Automatically rejected",
  COMMENT_AUTO_SPAMMED: "Automatically marked as spam",
  COMMENT_MARKED_AS_SPAM: "Marked as spam",
  COMMENT_REMOVED: "Removed from public display",
  COMMENT_REJECTED: "Rejected",
  COMMENT_RETURNED_TO_PENDING: "Returned to pending review",
  COMMENT_SUBMITTED: "Submitted",
});

const topLevelVisibleStatus = new Set([CommentStatus.APPROVED]);

export class CommentWorkflowError extends Error {
  constructor(
    message,
    {
      fieldErrors = null,
      status = "invalid_comment_workflow",
      statusCode = 400,
    } = {},
  ) {
    super(message);
    this.name = "CommentWorkflowError";
    this.fieldErrors = fieldErrors;
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

function normalizeFilterStatus(value) {
  const normalizedValue = `${value || "PENDING"}`.trim().toUpperCase();

  if (commentModerationFilterValues.includes(normalizedValue)) {
    return normalizedValue;
  }

  throw new CommentWorkflowError(
    `Comment filter status must be one of: ${commentModerationFilterValues.join(", ")}.`,
    {
      status: "invalid_comment_filter_status",
      statusCode: 400,
    },
  );
}

function formatModerationAction(action) {
  return commentModerationActionLabels[action] || action;
}

function createModerationNotes(reasons = []) {
  if (!reasons.length) {
    return null;
  }

  return `Signals: ${reasons.join(", ")}.`;
}

function createSubmissionEvents(status, reasons = []) {
  const events = [
    {
      action: "COMMENT_SUBMITTED",
      notes: null,
    },
  ];

  if (status === CommentStatus.SPAM) {
    events.push({
      action: "COMMENT_AUTO_SPAMMED",
      notes: createModerationNotes(reasons),
    });
  } else if (status === CommentStatus.REJECTED) {
    events.push({
      action: "COMMENT_AUTO_REJECTED",
      notes: createModerationNotes(reasons),
    });
  }

  return events;
}

function buildCommentRevalidationPaths(postSlug) {
  return supportedLocales.map((locale) =>
    buildLocalizedPath(locale, publicRouteSegments.blogPost(postSlug)),
  );
}

function shouldRevalidateCommentVisibility(previousStatus, nextStatus) {
  return topLevelVisibleStatus.has(previousStatus) || topLevelVisibleStatus.has(nextStatus);
}

function resolvePostTitle(post) {
  return post?.translations?.[0]?.title || post?.equipment?.name || post?.slug || "Untitled post";
}

function serializeModerationEvent(event) {
  return {
    action: event.action,
    actionLabel: formatModerationAction(event.action),
    actorName: event.actor?.name || "System",
    createdAt: event.createdAt?.toISOString() || null,
    id: event.id,
    notes: event.notes || "",
  };
}

function serializeCommentListItem(comment) {
  return {
    bodyPreview: createCommentPreview(comment.body),
    createdAt: comment.createdAt?.toISOString() || null,
    email: comment.email || "",
    id: comment.id,
    isReply: Boolean(comment.parentId),
    latestEvent: comment.moderationEvents?.[0]
      ? serializeModerationEvent(comment.moderationEvents[0])
      : null,
    name: comment.name,
    parentId: comment.parentId,
    parentName: comment.parent?.name || "",
    post: {
      path: buildLocalizedPath(defaultLocale, publicRouteSegments.blogPost(comment.post.slug)),
      slug: comment.post.slug,
      title: resolvePostTitle(comment.post),
    },
    repliesCount: comment._count?.replies || 0,
    status: comment.status,
  };
}

function serializeCommentEditor(comment) {
  if (!comment) {
    return {
      comment: null,
    };
  }

  return {
    comment: {
      body: comment.body,
      createdAt: comment.createdAt?.toISOString() || null,
      email: comment.email || "",
      id: comment.id,
      moderationEvents: comment.moderationEvents.map(serializeModerationEvent),
      name: comment.name,
      parent: comment.parent
        ? {
            body: comment.parent.body,
            id: comment.parent.id,
            name: comment.parent.name,
            status: comment.parent.status,
          }
        : null,
      post: {
        path: buildLocalizedPath(defaultLocale, publicRouteSegments.blogPost(comment.post.slug)),
        publishedAt: comment.post.publishedAt?.toISOString() || null,
        slug: comment.post.slug,
        title: resolvePostTitle(comment.post),
      },
      replies: comment.replies.map((reply) => ({
        createdAt: reply.createdAt?.toISOString() || null,
        id: reply.id,
        name: reply.name,
        status: reply.status,
      })),
      status: comment.status,
      updatedAt: comment.updatedAt?.toISOString() || null,
      userAgent: comment.userAgent || "",
    },
  };
}

async function loadPublishedPostForComment(db, postId) {
  const post = await db.post.findUnique({
    where: {
      id: postId,
    },
    select: {
      id: true,
      publishedAt: true,
      slug: true,
      status: true,
      translations: {
        select: {
          locale: true,
          title: true,
        },
        take: 1,
        where: {
          locale: defaultLocale,
        },
      },
    },
  });

  if (!post || post.status !== PostStatus.PUBLISHED || !post.publishedAt) {
    throw new CommentWorkflowError("This post is not accepting public comments.", {
      status: "post_not_found",
      statusCode: 404,
    });
  }

  return post;
}

async function loadReplyParent(db, parentId, postId) {
  if (!parentId) {
    return null;
  }

  const parentComment = await db.comment.findUnique({
    where: {
      id: parentId,
    },
    select: {
      id: true,
      name: true,
      parentId: true,
      postId: true,
      status: true,
    },
  });

  if (!parentComment || parentComment.postId !== postId) {
    throw new CommentWorkflowError("The selected parent comment was not found.", {
      status: "parent_comment_not_found",
      statusCode: 404,
    });
  }

  if (parentComment.parentId) {
    throw new CommentWorkflowError(
      `Replies may only be nested ${commentReplyDepthLimit} level deep.`,
      {
        status: "comment_reply_depth_exceeded",
        statusCode: 400,
      },
    );
  }

  if (parentComment.status !== CommentStatus.APPROVED) {
    throw new CommentWorkflowError("Replies are only allowed on approved top-level comments.", {
      status: "parent_comment_not_replyable",
      statusCode: 409,
    });
  }

  return parentComment;
}

async function assertRateLimit(db, ipHash, now) {
  const rateLimitWindowStart = new Date(now.getTime() - env.comments.rateLimit.windowMs);
  const recentSubmissionCount = await db.comment.count({
    where: {
      createdAt: {
        gte: rateLimitWindowStart,
      },
      ipHash,
    },
  });

  if (recentSubmissionCount >= env.comments.rateLimit.max) {
    throw new CommentWorkflowError("Comment rate limit reached. Please try again shortly.", {
      status: "comment_rate_limited",
      statusCode: 429,
    });
  }
}

async function assertNoDuplicateComment(db, { body, ipHash, parentId, postId }, now) {
  const duplicateWindowStart = new Date(now.getTime() - commentDuplicateLookbackMs);
  const recentComments = await db.comment.findMany({
    where: {
      createdAt: {
        gte: duplicateWindowStart,
      },
      ipHash,
      parentId: parentId || null,
      postId,
    },
    select: {
      body: true,
      id: true,
    },
  });

  if (recentComments.some((comment) => isDuplicateComment({ body }, comment))) {
    throw new CommentWorkflowError("A similar comment was already submitted recently.", {
      status: "duplicate_comment",
      statusCode: 409,
    });
  }
}

function resolveCommentStatus({ body, name, email }) {
  const moderationReasons = [];
  let status = CommentStatus.PENDING;

  if (containsProfanity([body, name])) {
    moderationReasons.push("profanity_detected");
    status = CommentStatus.REJECTED;
  }

  const spamSignals = detectSpamSignals({
    body,
    email,
    name,
  });

  if (spamSignals.length) {
    moderationReasons.push(...spamSignals);
    status = CommentStatus.SPAM;
  }

  return {
    moderationReasons,
    status,
  };
}

function assertCaptcha(input, now) {
  if (!env.comments.captcha.enabled) {
    return;
  }

  const result = verifyCommentCaptchaChallenge({
    answer: input.captchaAnswer,
    now,
    secret: env.comments.captcha.secret,
    token: input.captchaToken,
  });

  if (result.success) {
    return;
  }

  const messageByReason = {
    expired_captcha_token: "The captcha challenge expired. Please try again.",
    incorrect_captcha_answer: "The captcha answer was incorrect.",
    invalid_captcha_token: "The captcha challenge could not be verified.",
    missing_captcha_response: "Complete the captcha challenge before submitting your comment.",
  };

  throw new CommentWorkflowError(messageByReason[result.reason] || "The captcha challenge failed.", {
    fieldErrors: {
      captchaAnswer: [messageByReason[result.reason] || "The captcha challenge failed."],
    },
    status: result.reason,
    statusCode: 400,
  });
}

export function getCommentSubmissionFormSnapshot(now = new Date()) {
  return {
    captcha: env.comments.captcha.enabled
      ? buildCommentCaptchaChallenge(env.comments.captcha.secret, now)
      : null,
  };
}

export async function submitCommentRecord(input, options = {}, prisma) {
  const parsedInput = commentSubmissionSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  const now = options.now || new Date();
  const clientIp = normalizeDisplayText(options.ipAddress) || extractRequestIp(options.request);
  const ipHash = hashCommentValue(clientIp, env.auth.session.secret, "comment-ip");
  const userAgent = options.userAgent || extractRequestUserAgent(options.request);

  assertCaptcha(parsedInput, now);

  const post = await loadPublishedPostForComment(db, parsedInput.postId);
  await loadReplyParent(db, parsedInput.parentId, post.id);
  await assertRateLimit(db, ipHash, now);
  await assertNoDuplicateComment(
    db,
    {
      body: parsedInput.body,
      ipHash,
      parentId: parsedInput.parentId,
      postId: post.id,
    },
    now,
  );

  const { moderationReasons, status } = resolveCommentStatus(parsedInput);
  const createdComment = await db.comment.create({
    data: {
      body: parsedInput.body,
      email: parsedInput.email || null,
      ipHash,
      moderationEvents: {
        create: createSubmissionEvents(status, moderationReasons),
      },
      name: parsedInput.name,
      parentId: parsedInput.parentId || null,
      postId: post.id,
      status,
      userAgent,
    },
    select: {
      id: true,
      parentId: true,
      status: true,
    },
  });

  return {
    commentId: createdComment.id,
    message: "Comment submitted. It will appear once an editor approves it.",
  };
}

function buildCommentListWhere({ query, status }) {
  const clauses = [];

  if (status !== "ALL") {
    clauses.push({
      status,
    });
  }

  if (query) {
    clauses.push({
      OR: [
        {
          body: {
            contains: query,
          },
        },
        {
          email: {
            contains: query,
          },
        },
        {
          name: {
            contains: query,
          },
        },
        {
          parent: {
            name: {
              contains: query,
            },
          },
        },
        {
          post: {
            slug: {
              contains: query,
            },
          },
        },
        {
          post: {
            translations: {
              some: {
                locale: defaultLocale,
                title: {
                  contains: query,
                },
              },
            },
          },
        },
      ],
    });
  }

  if (!clauses.length) {
    return {};
  }

  return {
    AND: clauses,
  };
}

export async function getCommentModerationSnapshot(
  { commentId, page = 1, pageSize = adminCommentModerationPageSize, query, status = "PENDING" } = {},
  prisma,
) {
  const db = await resolvePrismaClient(prisma);
  const requestedPage = normalizePositiveInteger(page);
  const resolvedPageSize = normalizePositiveInteger(pageSize, adminCommentModerationPageSize);
  const normalizedQuery = normalizeDisplayText(query) || "";
  const normalizedStatus = normalizeFilterStatus(status);
  const where = buildCommentListWhere({
    query: normalizedQuery,
    status: normalizedStatus,
  });
  const [totalCount, filteredCount, pendingCount, approvedCount, rejectedCount, spamCount] =
    await Promise.all([
      db.comment.count(),
      db.comment.count({
        where,
      }),
      db.comment.count({
        where: {
          status: CommentStatus.PENDING,
        },
      }),
      db.comment.count({
        where: {
          status: CommentStatus.APPROVED,
        },
      }),
      db.comment.count({
        where: {
          status: CommentStatus.REJECTED,
        },
      }),
      db.comment.count({
        where: {
          status: CommentStatus.SPAM,
        },
      }),
    ]);
  const pagination = createPagination(filteredCount, requestedPage, resolvedPageSize);
  const comments = filteredCount
    ? await db.comment.findMany({
        orderBy: [{ createdAt: "desc" }],
        select: {
          _count: {
            select: {
              replies: true,
            },
          },
          body: true,
          createdAt: true,
          email: true,
          id: true,
          moderationEvents: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              action: true,
              actor: {
                select: {
                  name: true,
                },
              },
              createdAt: true,
              id: true,
              notes: true,
            },
            take: 1,
          },
          name: true,
          parent: {
            select: {
              name: true,
            },
          },
          parentId: true,
          post: {
            select: {
              equipment: {
                select: {
                  name: true,
                },
              },
              slug: true,
              translations: {
                select: {
                  title: true,
                },
                take: 1,
                where: {
                  locale: defaultLocale,
                },
              },
            },
          },
          status: true,
        },
        skip: (pagination.currentPage - 1) * pagination.pageSize,
        take: pagination.pageSize,
        where,
      })
    : [];
  const selectedCommentId =
    comments.find((comment) => comment.id === commentId)?.id || comments[0]?.id || null;
  const editorComment = selectedCommentId
    ? await db.comment.findUnique({
        where: {
          id: selectedCommentId,
        },
        select: {
          body: true,
          createdAt: true,
          email: true,
          id: true,
          moderationEvents: {
            orderBy: {
              createdAt: "desc",
            },
            select: {
              action: true,
              actor: {
                select: {
                  name: true,
                },
              },
              createdAt: true,
              id: true,
              notes: true,
            },
          },
          name: true,
          parent: {
            select: {
              body: true,
              id: true,
              name: true,
              status: true,
            },
          },
          post: {
            select: {
              publishedAt: true,
              equipment: {
                select: {
                  name: true,
                },
              },
              slug: true,
              translations: {
                select: {
                  title: true,
                },
                take: 1,
                where: {
                  locale: defaultLocale,
                },
              },
            },
          },
          replies: {
            orderBy: {
              createdAt: "asc",
            },
            select: {
              createdAt: true,
              id: true,
              name: true,
              status: true,
            },
          },
          status: true,
          updatedAt: true,
          userAgent: true,
        },
      })
    : null;

  return {
    comments: comments.map(serializeCommentListItem),
    editor: serializeCommentEditor(editorComment),
    filters: {
      page: pagination.currentPage,
      query: normalizedQuery,
      status: normalizedStatus,
    },
    pagination,
    selection: {
      commentId: selectedCommentId,
    },
    summary: {
      approvedCount,
      filteredCount,
      pendingCount,
      rejectedCount,
      spamCount,
      totalCount,
    },
  };
}

async function loadCommentForModeration(db, commentId) {
  const comment = await db.comment.findUnique({
    where: {
      id: commentId,
    },
    select: {
      id: true,
      post: {
        select: {
          slug: true,
        },
      },
      status: true,
    },
  });

  if (!comment) {
    throw new CommentWorkflowError(`Comment "${commentId}" was not found.`, {
      status: "comment_not_found",
      statusCode: 404,
    });
  }

  return comment;
}

function normalizeModerationNotes(notes) {
  return normalizeDisplayText(notes) || null;
}

async function revalidateCommentPost(postSlug, implementation) {
  return revalidatePaths(buildCommentRevalidationPaths(postSlug), implementation);
}

export async function moderateCommentRecord(commentId, input, options = {}, prisma) {
  const parsedInput = commentModerationUpdateSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  const existingComment = await loadCommentForModeration(db, commentId);

  await db.$transaction(async (tx) => {
    await tx.comment.update({
      where: {
        id: commentId,
      },
      data: {
        status: parsedInput.moderationStatus,
      },
    });

    await tx.commentModerationEvent.create({
      data: {
        action: commentModerationActionByStatus[parsedInput.moderationStatus],
        actorId: options.actorId || null,
        commentId,
        notes: normalizeModerationNotes(parsedInput.notes),
      },
    });
  });

  if (shouldRevalidateCommentVisibility(existingComment.status, parsedInput.moderationStatus)) {
    await revalidateCommentPost(existingComment.post.slug, options.revalidate);
  }

  return {
    commentId,
    moderationStatus: parsedInput.moderationStatus,
  };
}

export async function removeCommentRecord(commentId, input = {}, options = {}, prisma) {
  const parsedInput = commentDeletionSchema.parse(input);
  const db = await resolvePrismaClient(prisma);
  const existingComment = await loadCommentForModeration(db, commentId);
  const nextStatus =
    existingComment.status === CommentStatus.SPAM ? CommentStatus.SPAM : CommentStatus.REJECTED;

  await db.$transaction(async (tx) => {
    await tx.comment.update({
      where: {
        id: commentId,
      },
      data: {
        status: nextStatus,
      },
    });

    await tx.commentModerationEvent.create({
      data: {
        action: "COMMENT_REMOVED",
        actorId: options.actorId || null,
        commentId,
        notes: normalizeModerationNotes(parsedInput.notes),
      },
    });
  });

  if (shouldRevalidateCommentVisibility(existingComment.status, nextStatus)) {
    await revalidateCommentPost(existingComment.post.slug, options.revalidate);
  }

  return {
    commentId,
    removed: true,
  };
}

export function createCommentWorkflowErrorPayload(error) {
  if (error instanceof CommentWorkflowError) {
    return {
      body: {
        fieldErrors: error.fieldErrors || undefined,
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
      message: "An unexpected comment moderation error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}
