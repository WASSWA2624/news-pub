/**
 * Feature services that assemble the NewsPub admin dashboard, observability, and reporting snapshot.
 */

import { hasAdminPermission, ADMIN_PERMISSIONS } from "@/lib/auth/rbac";
import {
  isFailureAuditAction,
  isWarningAuditAction,
  serializeAuditEvent,
} from "@/lib/analytics";
import { getPublishAttemptDiagnosticSummary } from "@/lib/news/publish-diagnostics";
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

function sumCounts(items, key) {
  return items.reduce((total, item) => total + (item?.[key] || 0), 0);
}

function createUtcDayRange(date) {
  const start = new Date(`${date}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 60 * 60 * 1000);

  return { end, start };
}

async function countViewEventsIntoBuckets(db, dayCount, now = new Date()) {
  const buckets = createDateBuckets(dayCount, now);
  const totals = await Promise.all(
    buckets.map((bucket) => {
      const range = createUtcDayRange(bucket.date);

      return db.viewEvent.count({
        where: {
          created_at: {
            gte: range.start,
            lt: range.end,
          },
        },
      });
    }),
  );

  return buckets.map((bucket, index) => ({
    ...bucket,
    total: totals[index] || 0,
  }));
}

function getGroupedCount(rows, key, value) {
  const row = (rows || []).find((entry) => entry?.[key] === value);

  return row?._count?._all || 0;
}

function getAuditActionCount(rows, action) {
  return getGroupedCount(rows, "action", action);
}

function getFetchRunExecutionDetails(run) {
  const executionDetails = run.execution_details_json || null;

  if (!executionDetails || typeof executionDetails !== "object" || Array.isArray(executionDetails)) {
    return null;
  }

  return {
    checkpointStrategy: executionDetails.checkpointStrategy || null,
    endpoint: executionDetails.endpoint || null,
    executionMode: executionDetails.executionMode || "single",
    fanOutCounts: executionDetails.fanOutCounts || null,
    groupId: executionDetails.groupId || null,
    groupSize: executionDetails.groupSize || 1,
    partitionReasonCodes: executionDetails.partitionReasonCodes || [],
    sharedRequest: executionDetails.sharedRequest || null,
    streamFetchWindow: executionDetails.streamFetchWindow || null,
    timeBoundarySupport: executionDetails.timeBoundarySupport || null,
  };
}

function mapFetchRun(run) {
  const executionDetails = getFetchRunExecutionDetails(run);

  return {
    ai_cache_hit_count: run.ai_cache_hit_count,
    blocked_count: run.blocked_count,
    created_at: serializeDate(run.created_at),
    duplicate_count: run.duplicate_count,
    executionDetails,
    failed_count: run.failed_count,
    fetched_count: run.fetched_count,
    finished_at: serializeDate(run.finished_at),
    held_count: run.held_count,
    id: run.id,
    optimized_count: run.optimized_count,
    provider: run.providerConfig
      ? {
          id: run.providerConfig.id,
          label: run.providerConfig.label,
          provider_key: run.providerConfig.provider_key,
        }
      : null,
    publishable_count: run.publishable_count,
    published_count: run.published_count,
    skipped_count: run.skipped_count,
    started_at: serializeDate(run.started_at),
    status: run.status,
    stream: run.stream
      ? {
          id: run.stream.id,
          mode: run.stream.mode,
          name: run.stream.name,
        }
      : null,
    trigger_type: run.trigger_type,
  };
}

function mapPublishAttempt(attempt) {
  const diagnosticSummary = getPublishAttemptDiagnosticSummary(attempt);

  return {
    aiResolution: attempt.diagnostics_json?.aiResolution || null,
    article_match_id: attempt.article_match_id,
    created_at: serializeDate(attempt.created_at),
    diagnosticIssueCodes: diagnosticSummary.issueCodes,
    diagnosticReasonCode: diagnosticSummary.reasonCode,
    diagnosticReasonMessage: diagnosticSummary.reasonMessage,
    destination: attempt.destination
      ? {
          id: attempt.destination.id,
          name: attempt.destination.name,
          platform: attempt.destination.platform,
        }
      : null,
    last_error_message: attempt.last_error_message || null,
    id: attempt.id,
    platform: attempt.platform,
    post: attempt.post
      ? {
          id: attempt.post.id,
          slug: attempt.post.slug,
        }
      : null,
    optimization_status: attempt.diagnostics_json?.optimization_status || null,
    publicationMode: attempt.diagnostics_json?.publicationMode || null,
    published_at: serializeDate(attempt.published_at),
    queued_at: serializeDate(attempt.queued_at),
    remote_id: attempt.remote_id || null,
    retry_count: attempt.retry_count,
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
    activeStreamCount: config._count?.streams ?? config.streams?.length ?? 0,
    credentialState: getProviderCredentialState(config.provider_key),
    id: config.id,
    is_default: Boolean(config.is_default),
    is_enabled: Boolean(config.is_enabled),
    is_selectable: Boolean(config.is_selectable),
    label: config.label,
    provider_key: config.provider_key,
  };
}

function mapFailureItem(item) {
  return {
    created_at: item.created_at,
    details: item.details,
    id: item.id,
    label: item.label,
    status: item.status,
    type: item.type,
  };
}

function mapAuditEvent(event) {
  const payload = event.payload_json || null;

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

function countSharedFetchRuns(fetchRuns = []) {
  return fetchRuns.filter((run) => getFetchRunExecutionDetails(run)?.executionMode === "shared_batch").length;
}

function countSharedFetchUpstreamCalls(fetchRuns = []) {
  return new Set(
    fetchRuns
      .map((run) => getFetchRunExecutionDetails(run)?.groupId)
      .filter(Boolean),
  ).size;
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
    destinationStatusCounts,
    streamStatusCounts,
    fetchRuns,
    publishAttempts,
    latestStories,
    recentAuditEvents,
    aiOptimizationAuditEvents,
    trafficTrend,
  ] = await Promise.all([
    db.newsProviderConfig.findMany({
      orderBy: [{ is_default: "desc" }, { label: "asc" }],
      select: {
        _count: {
          select: {
            streams: true,
          },
        },
        id: true,
        is_default: true,
        is_enabled: true,
        is_selectable: true,
        label: true,
        provider_key: true,
      },
    }),
    db.destination.groupBy({
      by: ["connection_status"],
      _count: {
        _all: true,
      },
    }),
    db.publishingStream.groupBy({
      by: ["status"],
      _count: {
        _all: true,
      },
    }),
    db.fetchRun.findMany({
      include: {
        providerConfig: {
          select: {
            id: true,
            label: true,
            provider_key: true,
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
      orderBy: [{ started_at: "desc" }],
      take: 20,
      where: {
        created_at: {
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
      orderBy: [{ created_at: "desc" }],
      take: 20,
      where: {
        created_at: {
          gte: since,
        },
      },
    }),
    db.post.findMany({
      include: {
        ...(canViewAnalytics
          ? {
              _count: {
                select: {
                  viewEvents: true,
                },
              },
            }
          : {}),
        translations: {
          orderBy: {
            locale: "asc",
          },
          select: {
            locale: true,
            title: true,
          },
        },
      },
      orderBy: [{ published_at: "desc" }],
      take: 5,
      where: {
        status: "PUBLISHED",
      },
    }),
    db.auditEvent.findMany({
      orderBy: [{ created_at: "desc" }],
      take: 12,
    }),
    db.auditEvent.groupBy({
      by: ["action"],
      _count: {
        _all: true,
      },
      where: {
        action: {
          in: ["AI_OPTIMIZATION_FALLBACK_USED", "AI_OPTIMIZATION_SKIPPED"],
        },
        created_at: {
          gte: since,
        },
      },
    }),
    canViewAnalytics
      ? countViewEventsIntoBuckets(db, 7)
      : Promise.resolve([]),
  ]);
  const totalDestinationCount = destinationStatusCounts.reduce(
    (total, row) => total + (row._count?._all || 0),
    0,
  );
  const totalStreamCount = streamStatusCounts.reduce(
    (total, row) => total + (row._count?._all || 0),
    0,
  );
  const totalViews7d = trafficTrend.reduce((total, bucket) => total + (bucket.total || 0), 0);
  const recentFailures = [
    ...fetchRuns
      .filter((run) => run.status === "FAILED")
      .map((run) =>
        mapFailureItem({
          created_at: serializeDate(run.started_at || run.created_at),
          details: run.last_error_message || run.providerConfig?.label || "Fetch run failed.",
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
          created_at: serializeDate(attempt.queued_at || attempt.created_at),
          details: attempt.last_error_message || attempt.destination?.name || "Publish attempt failed.",
          id: `publish:${attempt.id}`,
          label: attempt.destination?.name || attempt.platform,
          status: attempt.status,
          type: "Publish",
        }),
      ),
  ]
    .sort((left, right) => `${right.created_at || ""}`.localeCompare(`${left.created_at || ""}`))
    .slice(0, 6);

  return {
    canViewAnalytics,
    destinationStatus: {
      connected: getGroupedCount(destinationStatusCounts, "connection_status", "CONNECTED"),
      disconnected: getGroupedCount(destinationStatusCounts, "connection_status", "DISCONNECTED"),
      error: getGroupedCount(destinationStatusCounts, "connection_status", "ERROR"),
      total: totalDestinationCount,
    },
    providerStatus: {
      configured: providers.length,
      enabled: providers.filter((provider) => provider.is_enabled).length,
      missingCredentials: providers.filter(
        (provider) => getProviderCredentialState(provider.provider_key) !== "configured",
      ).length,
      providers: providers.map(mapProviderStatus),
    },
    latestStories: latestStories.map((story) => ({
      id: story.id,
      published_at: serializeDate(story.published_at),
      slug: story.slug,
      title: story.translations[0]?.title || story.slug,
      viewCount: canViewAnalytics ? story._count?.viewEvents || 0 : null,
    })),
    recentAuditEvents: recentAuditEvents.map(mapAuditEvent),
    recentFailures,
    recentFetchRuns: fetchRuns.slice(0, 6).map(mapFetchRun),
    recentPublishAttempts: publishAttempts.slice(0, 6).map(mapPublishAttempt),
    streamStatus: {
      active: getGroupedCount(streamStatusCounts, "status", "ACTIVE"),
      paused: getGroupedCount(streamStatusCounts, "status", "PAUSED"),
      total: totalStreamCount,
    },
    summary: {
      aiCacheHitCount7d: sumCounts(fetchRuns, "ai_cache_hit_count"),
      aiFallbackCount7d: getAuditActionCount(aiOptimizationAuditEvents, "AI_OPTIMIZATION_FALLBACK_USED"),
      aiSkippedCount7d: getAuditActionCount(aiOptimizationAuditEvents, "AI_OPTIMIZATION_SKIPPED"),
      blockedBeforePublish7d: sumCounts(fetchRuns, "blocked_count"),
      duplicateCount7d: sumCounts(fetchRuns, "duplicate_count"),
      failedFetchRuns7d: fetchRuns.filter((run) => run.status === "FAILED").length,
      failedPublishAttempts7d: publishAttempts.filter((attempt) => attempt.status === "FAILED").length,
      fetchRunCount7d: fetchRuns.length,
      optimizedCount7d: sumCounts(fetchRuns, "optimized_count"),
      publishAttemptCount7d: publishAttempts.length,
      publishableCount7d: sumCounts(fetchRuns, "publishable_count"),
      publishedCount7d: sumCounts(fetchRuns, "published_count"),
      retryCount7d: publishAttempts.reduce((total, attempt) => total + (attempt.retry_count || 0), 0),
      sharedFetchRunCount7d: countSharedFetchRuns(fetchRuns),
      sharedUpstreamCalls7d: countSharedFetchUpstreamCalls(fetchRuns),
      totalViews7d: canViewAnalytics ? totalViews7d : null,
    },
    trafficTrend: canViewAnalytics ? trafficTrend : [],
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
          provider_key: true,
        },
      },
      stream: {
        select: {
          id: true,
          name: true,
        },
      },
    },
    orderBy: [{ started_at: "desc" }],
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
    orderBy: [{ created_at: "desc" }],
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
    orderBy: [{ created_at: "desc" }],
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
              entity_id: {
                contains: normalizedSearch,
              },
            },
            {
              entity_type: {
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
      sharedFetchRuns: countSharedFetchRuns(fetchRuns),
      sharedUpstreamCalls: countSharedFetchUpstreamCalls(fetchRuns),
      totalFetchRuns: fetchRuns.length,
      totalPublishAttempts: publishAttempts.length,
    },
  };
}
