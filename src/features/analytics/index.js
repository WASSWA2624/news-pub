import { ADMIN_PERMISSIONS, hasAdminPermission } from "@/lib/auth/rbac";
import {
  isFailureAuditAction,
  observabilityFailureActionValues,
  serializeAuditEvent,
} from "@/lib/analytics";
import { buildLocalizedPath, publicRouteSegments } from "@/features/i18n/routing";
import { defaultLocale } from "@/features/i18n/config";

const jobStatusFilterValues = Object.freeze([
  "ALL",
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "FAILED",
  "CANCELLED",
]);

const generationJobSelect = Object.freeze({
  createdAt: true,
  currentStage: true,
  equipmentName: true,
  errorMessage: true,
  finishedAt: true,
  id: true,
  locale: true,
  post: {
    select: {
      id: true,
      publishedAt: true,
      slug: true,
      translations: {
        orderBy: {
          locale: "asc",
        },
        select: {
          locale: true,
          title: true,
        },
        take: 2,
      },
    },
  },
  providerConfig: {
    select: {
      id: true,
      model: true,
      provider: true,
      purpose: true,
    },
  },
  replaceExistingPost: true,
  requestJson: true,
  responseJson: true,
  schedulePublishAt: true,
  startedAt: true,
  status: true,
  updatedAt: true,
  warningJson: true,
});

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearchValue(value) {
  return trimText(value).slice(0, 191);
}

function normalizeStatusFilter(value) {
  const normalizedValue = `${value || "ALL"}`.trim().toUpperCase();

  return jobStatusFilterValues.includes(normalizedValue) ? normalizedValue : "ALL";
}

function subtractDays(date, days) {
  return new Date(date.getTime() - days * 24 * 60 * 60 * 1000);
}

function createUtcDateKey(value) {
  const date = value instanceof Date ? value : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return date.toISOString().slice(0, 10);
}

function createDateWindow(dayCount, now = new Date()) {
  const startDate = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - (dayCount - 1), 0, 0, 0, 0),
  );
  const labels = [];

  for (let dayIndex = 0; dayIndex < dayCount; dayIndex += 1) {
    const nextDate = new Date(startDate);
    nextDate.setUTCDate(startDate.getUTCDate() + dayIndex);
    labels.push(nextDate.toISOString().slice(0, 10));
  }

  return {
    labels,
    startDate,
  };
}

function getWarningList(warningJson) {
  return Array.isArray(warningJson)
    ? warningJson.map((warning) => `${warning}`.trim()).filter(Boolean)
    : [];
}

function getJobDurationSeconds(job) {
  const startedAt = job?.startedAt instanceof Date ? job.startedAt : null;
  const finishedAt = job?.finishedAt instanceof Date ? job.finishedAt : null;

  if (!startedAt || !finishedAt) {
    return null;
  }

  return Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000));
}

function resolvePostTitle(post) {
  return post?.translations?.find((translation) => translation.locale === defaultLocale)?.title
    || post?.translations?.[0]?.title
    || post?.slug
    || "Untitled post";
}

function serializeGenerationJob(job) {
  const warnings = getWarningList(job.warningJson);

  return {
    createdAt: serializeDate(job.createdAt),
    currentStage: job.currentStage || null,
    durationSeconds: getJobDurationSeconds(job),
    equipmentName: job.equipmentName,
    errorMessage: job.errorMessage || null,
    finishedAt: serializeDate(job.finishedAt),
    id: job.id,
    locale: job.locale,
    post: job.post
      ? {
          id: job.post.id,
          path: buildLocalizedPath(
            job.locale || defaultLocale,
            publicRouteSegments.blogPost(job.post.slug),
          ),
          publishedAt: serializeDate(job.post.publishedAt),
          slug: job.post.slug,
          title: resolvePostTitle(job.post),
        }
      : null,
    providerConfig: job.providerConfig
      ? {
          id: job.providerConfig.id,
          label: `${job.providerConfig.provider} / ${job.providerConfig.model}`,
          model: job.providerConfig.model,
          provider: job.providerConfig.provider,
          purpose: job.providerConfig.purpose,
        }
      : null,
    replaceExistingPost: Boolean(job.replaceExistingPost),
    requestJson: job.requestJson || null,
    responseJson: job.responseJson || null,
    schedulePublishAt: serializeDate(job.schedulePublishAt),
    startedAt: serializeDate(job.startedAt),
    status: job.status,
    updatedAt: serializeDate(job.updatedAt),
    warningCount: warnings.length,
    warnings,
  };
}

function serializeFailureEntry(event) {
  const payload = event.payload || {};

  return {
    action: event.action,
    createdAt: event.createdAt,
    entityId: event.entityId,
    entityType: event.entityType,
    errorMessage: payload.errorMessage || payload.message || null,
    id: event.id,
    level: payload.level || (isFailureAuditAction(event.action) ? "error" : "warn"),
    summary:
      payload.message ||
      payload.errorMessage ||
      payload.currentStage ||
      payload.revalidationStatus ||
      payload.status ||
      event.action,
  };
}

function buildGenerationJobWhere(filters = {}) {
  const status = normalizeStatusFilter(filters.status);
  const search = normalizeSearchValue(filters.search);

  return {
    ...(status !== "ALL" ? { status } : {}),
    ...(search
      ? {
          equipmentName: {
            contains: search,
          },
        }
      : {}),
  };
}

function createViewTrend(viewEvents, dayCount, now = new Date()) {
  const { labels } = createDateWindow(dayCount, now);
  const trendIndex = new Map(
    labels.map((label) => [
      label,
      {
        date: label,
        pageViews: 0,
        postViews: 0,
        totalViews: 0,
        websiteViews: 0,
      },
    ]),
  );

  for (const event of viewEvents) {
    const dateKey = createUtcDateKey(event.createdAt);
    const bucket = dateKey ? trendIndex.get(dateKey) : null;

    if (!bucket) {
      continue;
    }

    bucket.totalViews += 1;

    if (event.eventType === "WEBSITE_VIEW") {
      bucket.websiteViews += 1;
    } else if (event.eventType === "POST_VIEW") {
      bucket.postViews += 1;
    } else {
      bucket.pageViews += 1;
    }
  }

  return labels.map((label) => trendIndex.get(label));
}

function createTopPostMap(groupedRows = []) {
  const topPostMap = new Map();

  for (const row of groupedRows) {
    if (!row?.postId) {
      continue;
    }

    const existingCount = topPostMap.get(row.postId) || 0;
    const nextCount =
      row._count?.postId
      || row._count?.id
      || row._count?._all
      || row.count
      || 0;

    topPostMap.set(row.postId, Math.max(existingCount, nextCount));
  }

  return topPostMap;
}

function createScheduledRunSummary(events = []) {
  const runsById = new Map();

  for (const event of events) {
    const payload = event.payload || {};
    const runId = event.entityId;
    const existingRun = runsById.get(runId) || {
      batchSize: payload.batchSize || null,
      completedAt: null,
      dueCount: null,
      failedCount: null,
      publishedCount: null,
      revalidationFailureCount: null,
      runId,
      skippedCount: null,
      startedAt: null,
      status: "running",
    };

    if (event.action === "SCHEDULED_PUBLISH_RUN_STARTED") {
      existingRun.batchSize = payload.batchSize || existingRun.batchSize;
      existingRun.startedAt = existingRun.startedAt || payload.startedAt || event.createdAt;

      if (!existingRun.completedAt) {
        existingRun.status = "running";
      }
    }

    if (event.action === "SCHEDULED_PUBLISH_RUN_COMPLETED") {
      existingRun.batchSize = payload.batchSize || existingRun.batchSize;
      existingRun.completedAt = payload.completedAt || event.createdAt;
      existingRun.dueCount = payload.dueCount ?? existingRun.dueCount;
      existingRun.failedCount = payload.failedCount ?? existingRun.failedCount;
      existingRun.publishedCount = payload.publishedCount ?? existingRun.publishedCount;
      existingRun.revalidationFailureCount =
        payload.revalidationFailureCount ?? existingRun.revalidationFailureCount;
      existingRun.skippedCount = payload.skippedCount ?? existingRun.skippedCount;
      existingRun.startedAt = existingRun.startedAt || payload.now || event.createdAt;
      existingRun.status = "completed";
    }

    runsById.set(runId, existingRun);
  }

  return [...runsById.values()].sort((left, right) => {
    const leftDate = left.completedAt || left.startedAt || "";
    const rightDate = right.completedAt || right.startedAt || "";

    return rightDate.localeCompare(leftDate);
  });
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

async function countGenerationJobs(db, where = {}) {
  if (typeof db.generationJob?.count !== "function") {
    return 0;
  }

  return db.generationJob.count({
    where,
  });
}

async function countJobsWithWarnings(db, startDate) {
  if (typeof db.generationJob?.findMany !== "function") {
    return 0;
  }

  const jobs = await db.generationJob.findMany({
    select: {
      warningJson: true,
    },
    ...(startDate
      ? {
          where: {
            createdAt: {
              gte: startDate,
            },
          },
        }
      : {}),
  });

  return jobs.reduce((count, job) => count + (getWarningList(job.warningJson).length ? 1 : 0), 0);
}

async function getRecentGenerationJobs(db, filters = {}, take = 8) {
  if (typeof db.generationJob?.findMany !== "function") {
    return [];
  }

  const jobs = await db.generationJob.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: generationJobSelect,
    take,
    where: buildGenerationJobWhere(filters),
  });

  return jobs.map(serializeGenerationJob);
}

async function getGenerationJobDetails(db, jobId) {
  if (!jobId || typeof db.generationJob?.findUnique !== "function") {
    return null;
  }

  const job = await db.generationJob.findUnique({
    select: generationJobSelect,
    where: {
      id: jobId,
    },
  });

  return job ? serializeGenerationJob(job) : null;
}

async function getGenerationJobLogs(db, jobId) {
  if (!jobId || typeof db.auditEvent?.findMany !== "function") {
    return [];
  }

  const logs = await db.auditEvent.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      action: true,
      actorId: true,
      createdAt: true,
      entityId: true,
      entityType: true,
      id: true,
      payloadJson: true,
    },
    where: {
      entityId: jobId,
      entityType: "generation_job",
    },
  });

  return logs.map(serializeAuditEvent);
}

async function getRecentFailureEvents(db, startDate, take = 12) {
  if (typeof db.auditEvent?.findMany !== "function") {
    return [];
  }

  const events = await db.auditEvent.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      action: true,
      actorId: true,
      createdAt: true,
      entityId: true,
      entityType: true,
      id: true,
      payloadJson: true,
    },
    take,
    where: {
      action: {
        in: [...observabilityFailureActionValues, ...["GENERATION_JOB_WARNING"]],
      },
      createdAt: {
        gte: startDate,
      },
    },
  });

  return events.map(serializeAuditEvent).map(serializeFailureEntry);
}

async function getScheduledPublishingRuns(db, take = 12) {
  if (typeof db.auditEvent?.findMany !== "function") {
    return [];
  }

  const events = await db.auditEvent.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    select: {
      action: true,
      actorId: true,
      createdAt: true,
      entityId: true,
      entityType: true,
      id: true,
      payloadJson: true,
    },
    take,
    where: {
      entityType: "scheduled_publish_worker",
    },
  });

  return createScheduledRunSummary(events.map(serializeAuditEvent));
}

async function getViewCounts(db, startDate) {
  if (typeof db.viewEvent?.count !== "function") {
    return {
      pageViewCount30d: 0,
      postViewCount30d: 0,
      totalViewCount30d: 0,
      websiteViewCount30d: 0,
    };
  }

  const [totalViewCount30d, websiteViewCount30d, pageViewCount30d, postViewCount30d] =
    await Promise.all([
      db.viewEvent.count({
        where: {
          createdAt: {
            gte: startDate,
          },
        },
      }),
      db.viewEvent.count({
        where: {
          createdAt: {
            gte: startDate,
          },
          eventType: "WEBSITE_VIEW",
        },
      }),
      db.viewEvent.count({
        where: {
          createdAt: {
            gte: startDate,
          },
          eventType: "PAGE_VIEW",
        },
      }),
      db.viewEvent.count({
        where: {
          createdAt: {
            gte: startDate,
          },
          eventType: "POST_VIEW",
        },
      }),
    ]);

  return {
    pageViewCount30d,
    postViewCount30d,
    totalViewCount30d,
    websiteViewCount30d,
  };
}

async function getViewTrendData(db, startDate) {
  if (typeof db.viewEvent?.findMany !== "function") {
    return [];
  }

  return db.viewEvent.findMany({
    orderBy: [{ createdAt: "asc" }],
    select: {
      createdAt: true,
      eventType: true,
    },
    where: {
      createdAt: {
        gte: startDate,
      },
    },
  });
}

async function getTopPostViews(db, startDate) {
  if (!db.viewEvent) {
    return [];
  }

  let groupedRows = [];

  if (typeof db.viewEvent.groupBy === "function") {
    groupedRows = await db.viewEvent.groupBy({
      _count: {
        postId: true,
      },
      by: ["postId"],
      orderBy: {
        _count: {
          postId: "desc",
        },
      },
      take: 5,
      where: {
        createdAt: {
          gte: startDate,
        },
        eventType: "POST_VIEW",
        postId: {
          not: null,
        },
      },
    });
  } else if (typeof db.viewEvent.findMany === "function") {
    const rows = await db.viewEvent.findMany({
      select: {
        postId: true,
      },
      where: {
        createdAt: {
          gte: startDate,
        },
        eventType: "POST_VIEW",
      },
    });
    const counts = rows.reduce((map, row) => {
      if (!row.postId) {
        return map;
      }

      map.set(row.postId, (map.get(row.postId) || 0) + 1);
      return map;
    }, new Map());

    groupedRows = [...counts.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, 5)
      .map(([postId, count]) => ({
        _count: {
          postId: count,
        },
        postId,
      }));
  }

  const topPostMap = createTopPostMap(groupedRows);
  const postIds = [...topPostMap.keys()];

  if (!postIds.length || typeof db.post?.findMany !== "function") {
    return [];
  }

  const posts = await db.post.findMany({
    select: {
      id: true,
      publishedAt: true,
      slug: true,
      translations: {
        orderBy: {
          locale: "asc",
        },
        select: {
          locale: true,
          title: true,
        },
        take: 2,
      },
    },
    where: {
      id: {
        in: postIds,
      },
    },
  });

  return posts
    .map((post) => ({
      id: post.id,
      path: buildLocalizedPath(defaultLocale, publicRouteSegments.blogPost(post.slug)),
      publishedAt: serializeDate(post.publishedAt),
      slug: post.slug,
      title: resolvePostTitle(post),
      viewCount: topPostMap.get(post.id) || 0,
    }))
    .sort((left, right) => right.viewCount - left.viewCount);
}

export async function getAdminDashboardSnapshot(user, prisma) {
  const db = await resolvePrismaClient(prisma);
  const now = new Date();
  const canViewAnalytics = hasAdminPermission(user, ADMIN_PERMISSIONS.VIEW_ANALYTICS);
  const trendWindow = createDateWindow(14, now);
  const thirtyDayStart = subtractDays(now, 30);
  const failureWindowStart = subtractDays(now, 14);

  const [generationJobCount30d, completedJobCount30d, failedJobCount30d, warningJobCount30d, recentJobs, recentFailures, scheduledRuns] =
    await Promise.all([
      countGenerationJobs(db, {
        createdAt: {
          gte: thirtyDayStart,
        },
      }),
      countGenerationJobs(db, {
        createdAt: {
          gte: thirtyDayStart,
        },
        status: "COMPLETED",
      }),
      countGenerationJobs(db, {
        createdAt: {
          gte: thirtyDayStart,
        },
        status: "FAILED",
      }),
      countJobsWithWarnings(db, thirtyDayStart),
      getRecentGenerationJobs(db, {}, 6),
      getRecentFailureEvents(db, failureWindowStart, 12),
      getScheduledPublishingRuns(db, 16),
    ]);

  const analytics = canViewAnalytics
    ? await (async () => {
        const [viewCounts, trendEvents, topPosts] = await Promise.all([
          getViewCounts(db, thirtyDayStart),
          getViewTrendData(db, trendWindow.startDate),
          getTopPostViews(db, thirtyDayStart),
        ]);

        return {
          ...viewCounts,
          topPosts,
          trend: createViewTrend(trendEvents, trendWindow.labels.length, now),
        };
      })()
    : {
        pageViewCount30d: null,
        postViewCount30d: null,
        topPosts: [],
        totalViewCount30d: null,
        trend: [],
        websiteViewCount30d: null,
      };

  return {
    analytics,
    permissions: {
      canViewAnalytics,
    },
    recentFailures,
    recentGenerationJobs: recentJobs,
    scheduledRuns,
    summary: {
      completedJobCount30d,
      failedJobCount30d,
      failureLogCount14d: recentFailures.filter((failure) => failure.level === "error").length,
      generationJobCount30d,
      scheduledRunCount14d: scheduledRuns.length,
      warningJobCount30d,
    },
  };
}

export async function getAdminJobLogsSnapshot(filters = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const normalizedFilters = {
    jobId: trimText(filters.jobId) || null,
    search: normalizeSearchValue(filters.search),
    status: normalizeStatusFilter(filters.status),
  };
  const [jobs, selectedJobById, scheduledRuns, totalJobs, failedJobs, runningJobs, warningJobs] =
    await Promise.all([
      getRecentGenerationJobs(db, normalizedFilters, 20),
      getGenerationJobDetails(db, normalizedFilters.jobId),
      getScheduledPublishingRuns(db, 16),
      countGenerationJobs(db),
      countGenerationJobs(db, {
        status: "FAILED",
      }),
      countGenerationJobs(db, {
        status: "RUNNING",
      }),
      countJobsWithWarnings(db),
    ]);
  const selectedJob = selectedJobById || jobs[0] || null;
  const selectedJobLogs = await getGenerationJobLogs(db, selectedJob?.id);

  return {
    filters: normalizedFilters,
    jobs,
    scheduledRuns,
    selectedJob: selectedJob
      ? {
          ...selectedJob,
          logs: selectedJobLogs,
        }
      : null,
    summary: {
      failedJobs,
      runningJobs,
      scheduledRunCount: scheduledRuns.length,
      totalJobs,
      warningJobs,
    },
  };
}

export { jobStatusFilterValues };
