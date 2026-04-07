import { hasAdminPermission, ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import {
  isFailureAuditAction,
  isWarningAuditAction,
  serializeAuditEvent,
} from "@/lib/analytics";
import { getProviderCredentialState } from "@/lib/news/providers";
import { resolvePrismaClient } from "@/lib/news/shared";

/**
 * Admin analytics snapshots for NewsPub operations, traffic, and recent job history.
 */
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
    aiCacheHitCount: run.aiCacheHitCount,
    blockedCount: run.blockedCount,
    createdAt: serializeDate(run.createdAt),
    duplicateCount: run.duplicateCount,
    failedCount: run.failedCount,
    fetchedCount: run.fetchedCount,
    finishedAt: serializeDate(run.finishedAt),
    heldCount: run.heldCount,
    id: run.id,
    optimizedCount: run.optimizedCount,
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
    aiResolution: attempt.diagnosticsJson?.aiResolution || null,
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
    optimizationStatus: attempt.diagnosticsJson?.optimizationStatus || null,
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

function mapProviderStatus(config) {
  return {
    activeStreamCount: config.streams?.length || 0,
    credentialState: getProviderCredentialState(config.providerKey),
    id: config.id,
    isDefault: Boolean(config.isDefault),
    isEnabled: Boolean(config.isEnabled),
    isSelectable: Boolean(config.isSelectable),
    label: config.label,
    providerKey: config.providerKey,
  };
}

function mapFailureItem(item) {
  return {
    createdAt: item.createdAt,
    details: item.details,
    id: item.id,
    label: item.label,
    status: item.status,
    type: item.type,
  };
}

function mapAuditEvent(event) {
  const payload = event.payloadJson || null;

  return {
    ...serializeAuditEvent(event),
    level:
      payload?.level
      || (isFailureAuditAction(event.action) ? "error" : isWarningAuditAction(event.action) ? "warn" : "info"),
    reasonCode: payload?.reasonCode || null,
    reasonMessage: payload?.reasonMessage || payload?.message || null,
  };
}

function countAuditActions(events, action) {
  return events.filter((event) => event.action === action).length;
}

/**
 * Returns the main admin dashboard snapshot with operational counts, traffic
 * summaries, AI observability, and recent workflow activity.
 *
 * @param {object} user - The current admin user.
 * @param {object} [prisma] - Optional Prisma client override.
 * @returns {Promise<object>} Dashboard data shaped for the admin home route.
 */
export async function getAdminDashboardSnapshot(user, prisma) {
  const db = await resolvePrismaClient(prisma);
  const canViewAnalytics = hasAdminPermission(user, ADMIN_PERMISSIONS.VIEW_ANALYTICS);
  const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const [
    providers,
    destinations,
    streams,
    fetchRuns,
    publishAttempts,
    latestStories,
    recentAuditEvents,
    aiOptimizationAuditEvents,
    viewEvents,
  ] = await Promise.all([
    db.newsProviderConfig.findMany({
      include: {
        streams: {
          select: {
            id: true,
          },
        },
      },
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
    }),
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
    db.auditEvent.findMany({
      orderBy: [{ createdAt: "desc" }],
      where: {
        action: {
          in: ["AI_OPTIMIZATION_FALLBACK_USED", "AI_OPTIMIZATION_SKIPPED"],
        },
        createdAt: {
          gte: since,
        },
      },
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
  const recentFailures = [
    ...fetchRuns
      .filter((run) => run.status === "FAILED")
      .map((run) =>
        mapFailureItem({
          createdAt: serializeDate(run.startedAt || run.createdAt),
          details: run.errorMessage || run.providerConfig?.label || "Fetch run failed.",
          id: `fetch:${run.id}`,
          label: run.stream?.name || "Stream fetch run",
          status: run.status,
          type: "Fetch",
        }),
      ),
    ...publishAttempts
      .filter((attempt) => attempt.status === "FAILED")
      .map((attempt) =>
        mapFailureItem({
          createdAt: serializeDate(attempt.queuedAt || attempt.createdAt),
          details: attempt.errorMessage || attempt.destination?.name || "Publish attempt failed.",
          id: `publish:${attempt.id}`,
          label: attempt.destination?.name || attempt.platform,
          status: attempt.status,
          type: "Publish",
        }),
      ),
  ]
    .sort((left, right) => `${right.createdAt || ""}`.localeCompare(`${left.createdAt || ""}`))
    .slice(0, 6);

  return {
    canViewAnalytics,
    destinationStatus: {
      connected: destinations.filter((destination) => destination.connectionStatus === "CONNECTED").length,
      disconnected: destinations.filter((destination) => destination.connectionStatus === "DISCONNECTED").length,
      error: destinations.filter((destination) => destination.connectionStatus === "ERROR").length,
      total: destinations.length,
    },
    providerStatus: {
      configured: providers.length,
      enabled: providers.filter((provider) => provider.isEnabled).length,
      missingCredentials: providers.filter(
        (provider) => getProviderCredentialState(provider.providerKey) !== "configured",
      ).length,
      providers: providers.map(mapProviderStatus),
    },
    latestStories: latestStories.map((story) => ({
      id: story.id,
      publishedAt: serializeDate(story.publishedAt),
      slug: story.slug,
      title: story.translations[0]?.title || story.slug,
      viewCount: canViewAnalytics ? story.viewEvents.length : null,
    })),
    recentAuditEvents: recentAuditEvents.map(mapAuditEvent),
    recentFailures,
    recentFetchRuns: fetchRuns.slice(0, 6).map(mapFetchRun),
    recentPublishAttempts: publishAttempts.slice(0, 6).map(mapPublishAttempt),
    streamStatus: {
      active: streams.filter((stream) => stream.status === "ACTIVE").length,
      paused: streams.filter((stream) => stream.status === "PAUSED").length,
      total: streams.length,
    },
    summary: {
      aiCacheHitCount7d: sumCounts(fetchRuns, "aiCacheHitCount"),
      aiFallbackCount7d: countAuditActions(aiOptimizationAuditEvents, "AI_OPTIMIZATION_FALLBACK_USED"),
      aiSkippedCount7d: countAuditActions(aiOptimizationAuditEvents, "AI_OPTIMIZATION_SKIPPED"),
      blockedBeforePublish7d: sumCounts(fetchRuns, "blockedCount"),
      duplicateCount7d: sumCounts(fetchRuns, "duplicateCount"),
      failedFetchRuns7d: fetchRuns.filter((run) => run.status === "FAILED").length,
      failedPublishAttempts7d: publishAttempts.filter((attempt) => attempt.status === "FAILED").length,
      fetchRunCount7d: fetchRuns.length,
      optimizedCount7d: sumCounts(fetchRuns, "optimizedCount"),
      publishAttemptCount7d: publishAttempts.length,
      publishableCount7d: sumCounts(fetchRuns, "publishableCount"),
      publishedCount7d: sumCounts(fetchRuns, "publishedCount"),
      retryCount7d: publishAttempts.reduce((total, attempt) => total + (attempt.retryCount || 0), 0),
      totalViews7d: canViewAnalytics ? viewEvents.length : null,
    },
    trafficTrend: canViewAnalytics ? countIntoBuckets(viewEvents, 7) : [],
  };
}

/** Returns the filtered fetch, publish, and audit timeline used by the jobs screen. */
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
    auditEvents: auditEvents.map(mapAuditEvent),
    fetchRuns: fetchRuns.map(mapFetchRun),
    publishAttempts: publishAttempts.map(mapPublishAttempt),
    summary: {
      aiFallbackEvents: countAuditActions(auditEvents, "AI_OPTIMIZATION_FALLBACK_USED"),
      aiSkippedEvents: countAuditActions(auditEvents, "AI_OPTIMIZATION_SKIPPED"),
      failedFetchRuns: fetchRuns.filter((run) => run.status === "FAILED").length,
      failedPublishAttempts: publishAttempts.filter((attempt) => attempt.status === "FAILED").length,
      totalFetchRuns: fetchRuns.length,
      totalPublishAttempts: publishAttempts.length,
    },
  };
}
