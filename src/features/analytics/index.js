import { hasAdminPermission, ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import { serializeAuditEvent } from "@/lib/analytics";
import { resolvePrismaClient } from "@/lib/news/shared";

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeSearch(value) {
  return trimText(value).slice(0, 191);
}

function createDateBuckets(dayCount, now = new Date()) {
  const buckets = [];

  for (let index = dayCount - 1; index >= 0; index -= 1) {
    const nextDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - index));

    buckets.push({
      date: nextDate.toISOString().slice(0, 10),
      total: 0,
    });
  }

  return buckets;
}

function countIntoBuckets(items, dayCount, now = new Date()) {
  const buckets = createDateBuckets(dayCount, now);
  const bucketIndex = new Map(buckets.map((bucket) => [bucket.date, bucket]));

  for (const item of items) {
    const date = item.createdAt instanceof Date ? item.createdAt.toISOString().slice(0, 10) : null;
    const bucket = date ? bucketIndex.get(date) : null;

    if (bucket) {
      bucket.total += 1;
    }
  }

  return buckets;
}

function sumCounts(items, key) {
  return items.reduce((total, item) => total + (item?.[key] || 0), 0);
}

function mapFetchRun(run) {
  return {
    createdAt: serializeDate(run.createdAt),
    duplicateCount: run.duplicateCount,
    failedCount: run.failedCount,
    fetchedCount: run.fetchedCount,
    finishedAt: serializeDate(run.finishedAt),
    heldCount: run.heldCount,
    id: run.id,
    provider: run.providerConfig
      ? {
          id: run.providerConfig.id,
          label: run.providerConfig.label,
          providerKey: run.providerConfig.providerKey,
        }
      : null,
    publishableCount: run.publishableCount,
    publishedCount: run.publishedCount,
    skippedCount: run.skippedCount,
    startedAt: serializeDate(run.startedAt),
    status: run.status,
    stream: run.stream
      ? {
          id: run.stream.id,
          mode: run.stream.mode,
          name: run.stream.name,
        }
      : null,
    triggerType: run.triggerType,
  };
}

function mapPublishAttempt(attempt) {
  return {
    articleMatchId: attempt.articleMatchId,
    createdAt: serializeDate(attempt.createdAt),
    destination: attempt.destination
      ? {
          id: attempt.destination.id,
          name: attempt.destination.name,
          platform: attempt.destination.platform,
        }
      : null,
    errorMessage: attempt.errorMessage || null,
    id: attempt.id,
    platform: attempt.platform,
    post: attempt.post
      ? {
          id: attempt.post.id,
          slug: attempt.post.slug,
        }
      : null,
    publishedAt: serializeDate(attempt.publishedAt),
    queuedAt: serializeDate(attempt.queuedAt),
    remoteId: attempt.remoteId || null,
    retryCount: attempt.retryCount,
    status: attempt.status,
    stream: attempt.stream
      ? {
          id: attempt.stream.id,
          name: attempt.stream.name,
        }
      : null,
  };
}

export async function getAdminDashboardSnapshot(user, prisma) {
  const db = await resolvePrismaClient(prisma);
  const canViewAnalytics = hasAdminPermission(user, ADMIN_PERMISSIONS.VIEW_ANALYTICS);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    destinations,
    streams,
    fetchRuns,
    publishAttempts,
    latestStories,
    recentAuditEvents,
    viewEvents,
  ] = await Promise.all([
    db.destination.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
    }),
    db.publishingStream.findMany({
      include: {
        destination: {
          select: {
            name: true,
            platform: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.fetchRun.findMany({
      include: {
        providerConfig: {
          select: {
            id: true,
            label: true,
            providerKey: true,
          },
        },
        stream: {
          select: {
            id: true,
            mode: true,
            name: true,
          },
        },
      },
      orderBy: [{ startedAt: "desc" }],
      take: 20,
      where: {
        createdAt: {
          gte: since,
        },
      },
    }),
    db.publishAttempt.findMany({
      include: {
        destination: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        post: {
          select: {
            id: true,
            slug: true,
          },
        },
        stream: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
      take: 20,
      where: {
        createdAt: {
          gte: since,
        },
      },
    }),
    db.post.findMany({
      include: {
        translations: {
          orderBy: {
            locale: "asc",
          },
          select: {
            locale: true,
            title: true,
          },
        },
        viewEvents: canViewAnalytics
          ? {
              select: {
                id: true,
              },
            }
          : false,
      },
      orderBy: [{ publishedAt: "desc" }],
      take: 5,
      where: {
        status: "PUBLISHED",
      },
    }),
    db.auditEvent.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 12,
    }),
    canViewAnalytics
      ? db.viewEvent.findMany({
          orderBy: [{ createdAt: "desc" }],
          select: {
            createdAt: true,
            eventType: true,
            postId: true,
          },
          where: {
            createdAt: {
              gte: since,
            },
          },
        })
      : Promise.resolve([]),
  ]);

  return {
    canViewAnalytics,
    destinationStatus: {
      connected: destinations.filter((destination) => destination.connectionStatus === "CONNECTED").length,
      disconnected: destinations.filter((destination) => destination.connectionStatus === "DISCONNECTED").length,
      error: destinations.filter((destination) => destination.connectionStatus === "ERROR").length,
      total: destinations.length,
    },
    latestStories: latestStories.map((story) => ({
      id: story.id,
      publishedAt: serializeDate(story.publishedAt),
      slug: story.slug,
      title: story.translations[0]?.title || story.slug,
      viewCount: canViewAnalytics ? story.viewEvents.length : null,
    })),
    recentAuditEvents: recentAuditEvents.map(serializeAuditEvent),
    recentFetchRuns: fetchRuns.slice(0, 6).map(mapFetchRun),
    recentPublishAttempts: publishAttempts.slice(0, 6).map(mapPublishAttempt),
    streamStatus: {
      active: streams.filter((stream) => stream.status === "ACTIVE").length,
      paused: streams.filter((stream) => stream.status === "PAUSED").length,
      total: streams.length,
    },
    summary: {
      duplicateCount7d: sumCounts(fetchRuns, "duplicateCount"),
      failedFetchRuns7d: fetchRuns.filter((run) => run.status === "FAILED").length,
      failedPublishAttempts7d: publishAttempts.filter((attempt) => attempt.status === "FAILED").length,
      fetchRunCount7d: fetchRuns.length,
      publishAttemptCount7d: publishAttempts.length,
      publishableCount7d: sumCounts(fetchRuns, "publishableCount"),
      publishedCount7d: sumCounts(fetchRuns, "publishedCount"),
      retryCount7d: publishAttempts.reduce((total, attempt) => total + (attempt.retryCount || 0), 0),
      totalViews7d: canViewAnalytics ? viewEvents.length : null,
    },
    trafficTrend: canViewAnalytics ? countIntoBuckets(viewEvents, 7) : [],
  };
}

export async function getAdminJobLogsSnapshot({ search = "", status = "ALL" } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const normalizedSearch = normalizeSearch(search);
  const normalizedStatus = trimText(status).toUpperCase() || "ALL";
  const fetchRuns = await db.fetchRun.findMany({
    include: {
      providerConfig: {
        select: {
          id: true,
          label: true,
          providerKey: true,
        },
      },
      stream: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ startedAt: "desc" }],
    take: 30,
    where: {
      ...(normalizedStatus !== "ALL"
        ? {
            status: normalizedStatus,
          }
        : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                stream: {
                  name: {
                    contains: normalizedSearch,
                  },
                },
              },
              {
                providerConfig: {
                  label: {
                    contains: normalizedSearch,
                  },
                },
              },
            ],
          }
        : {}),
    },
  });
  const publishAttempts = await db.publishAttempt.findMany({
    include: {
      destination: {
        select: {
          id: true,
          name: true,
          platform: true,
        },
      },
      post: {
        select: {
          id: true,
          slug: true,
        },
      },
      stream: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
    take: 30,
    where: {
      ...(normalizedStatus !== "ALL"
        ? {
            status: normalizedStatus,
          }
        : {}),
      ...(normalizedSearch
        ? {
            OR: [
              {
                destination: {
                  name: {
                    contains: normalizedSearch,
                  },
                },
              },
              {
                stream: {
                  name: {
                    contains: normalizedSearch,
                  },
                },
              },
              {
                post: {
                  slug: {
                    contains: normalizedSearch,
                  },
                },
              },
            ],
          }
        : {}),
    },
  });
  const auditEvents = await db.auditEvent.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 20,
    where: normalizedSearch
      ? {
          OR: [
            {
              action: {
                contains: normalizedSearch,
              },
            },
            {
              entityId: {
                contains: normalizedSearch,
              },
            },
            {
              entityType: {
                contains: normalizedSearch,
              },
            },
          ],
        }
      : undefined,
  });

  return {
    auditEvents: auditEvents.map(serializeAuditEvent),
    fetchRuns: fetchRuns.map(mapFetchRun),
    publishAttempts: publishAttempts.map(mapPublishAttempt),
    summary: {
      failedFetchRuns: fetchRuns.filter((run) => run.status === "FAILED").length,
      failedPublishAttempts: publishAttempts.filter((attempt) => attempt.status === "FAILED").length,
      totalFetchRuns: fetchRuns.length,
      totalPublishAttempts: publishAttempts.length,
    },
  };
}
