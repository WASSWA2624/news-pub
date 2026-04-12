import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

function createFetchRuns() {
  return [
    {
      created_at: new Date("2026-04-03T10:00:00.000Z"),
      duplicate_count: 1,
      execution_details_json: {
        executionMode: "shared_batch",
        groupId: "shared_group_1",
        groupSize: 2,
        streamFetchWindow: {
          end: "2026-04-03T10:00:00.000Z",
          start: "2026-04-03T06:00:00.000Z",
        },
      },
      failed_count: 0,
      fetched_count: 12,
      finished_at: new Date("2026-04-03T10:05:00.000Z"),
      held_count: 2,
      id: "fetch_1",
      providerConfig: {
        id: "provider_1",
        label: "Mediastack",
        provider_key: "mediastack",
      },
      publishable_count: 5,
      published_count: 3,
      skipped_count: 4,
      started_at: new Date("2026-04-03T10:00:00.000Z"),
      status: "SUCCEEDED",
      stream: {
        id: "stream_1",
        mode: "AUTO_PUBLISH",
        name: "Website News Feed",
      },
      trigger_type: "scheduled",
    },
    {
      created_at: new Date("2026-04-02T10:00:00.000Z"),
      duplicate_count: 0,
      failed_count: 1,
      fetched_count: 4,
      finished_at: new Date("2026-04-02T10:05:00.000Z"),
      held_count: 1,
      id: "fetch_2",
      providerConfig: {
        id: "provider_1",
        label: "Mediastack",
        provider_key: "mediastack",
      },
      publishable_count: 2,
      published_count: 0,
      skipped_count: 1,
      started_at: new Date("2026-04-02T10:00:00.000Z"),
      status: "FAILED",
      stream: {
        id: "stream_2",
        mode: "REVIEW_REQUIRED",
        name: "Instagram Queue",
      },
      trigger_type: "manual",
    },
  ];
}

function createPublishAttempts() {
  return [
    {
      article_match_id: "match_1",
      created_at: new Date("2026-04-03T10:06:00.000Z"),
      destination: {
        id: "destination_1",
        name: "Website",
        platform: "WEBSITE",
      },
      last_error_message: null,
      id: "attempt_1",
      platform: "WEBSITE",
      post: {
        id: "post_1",
        slug: "breaking-story",
      },
      published_at: new Date("2026-04-03T10:06:30.000Z"),
      queued_at: new Date("2026-04-03T10:06:00.000Z"),
      remote_id: "website_123",
      retry_count: 0,
      status: "SUCCEEDED",
      stream: {
        id: "stream_1",
        name: "Website News Feed",
      },
    },
    {
      article_match_id: "match_2",
      created_at: new Date("2026-04-02T10:06:00.000Z"),
      destination: {
        id: "destination_2",
        name: "Instagram Business",
        platform: "INSTAGRAM",
      },
      last_error_message: "Destination is not connected.",
      id: "attempt_2",
      platform: "INSTAGRAM",
      post: {
        id: "post_2",
        slug: "held-story",
      },
      published_at: null,
      queued_at: new Date("2026-04-02T10:06:00.000Z"),
      remote_id: null,
      retry_count: 2,
      status: "FAILED",
      stream: {
        id: "stream_2",
        name: "Instagram Queue",
      },
    },
  ];
}

function createMockPrisma() {
  const fetchRuns = createFetchRuns();
  const publishAttempts = createPublishAttempts();
  const posts = [
    {
      id: "post_1",
      published_at: new Date("2026-04-03T10:06:30.000Z"),
      slug: "breaking-story",
      status: "PUBLISHED",
      translations: [
        {
          locale: "en",
          title: "Breaking story",
        },
      ],
      _count: {
        viewEvents: 2,
      },
    },
  ];
  const auditEvents = [
    {
      action: "AI_OPTIMIZATION_SKIPPED",
      actor_id: null,
      created_at: new Date("2026-04-03T10:07:00.000Z"),
      entity_id: "match_1",
      entity_type: "article_match",
      id: "audit_ai_skip",
      payload_json: {
        level: "warn",
        reasonCode: "ai_credentials_missing",
        reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
      },
    },
    {
      action: "AI_OPTIMIZATION_FALLBACK_USED",
      actor_id: null,
      created_at: new Date("2026-04-03T10:06:00.000Z"),
      entity_id: "match_2",
      entity_type: "article_match",
      id: "audit_ai_fallback",
      payload_json: {
        level: "warn",
        reasonCode: "ai_timeout",
        reasonMessage: "AI timed out, so NewsPub fell back to deterministic formatting.",
      },
    },
    {
      action: "FETCH_RUN_COMPLETED",
      actor_id: null,
      created_at: new Date("2026-04-03T10:05:00.000Z"),
      entity_id: "fetch_1",
      entity_type: "fetch_run",
      id: "audit_1",
      payload_json: null,
    },
  ];
  const viewEvents = [
    {
      created_at: new Date(),
      event_type: "POST_VIEW",
      post_id: "post_1",
    },
    {
      created_at: new Date(),
      event_type: "WEBSITE_VIEW",
      post_id: null,
    },
  ];

  return {
    auditEvent: {
      findMany: vi.fn(async () => auditEvents),
      groupBy: vi.fn(async () => [
        {
          action: "AI_OPTIMIZATION_FALLBACK_USED",
          _count: {
            _all: 1,
          },
        },
        {
          action: "AI_OPTIMIZATION_SKIPPED",
          _count: {
            _all: 1,
          },
        },
      ]),
    },
    destination: {
      groupBy: vi.fn(async () => [
        {
          connection_status: "CONNECTED",
          _count: {
            _all: 1,
          },
        },
        {
          connection_status: "ERROR",
          _count: {
            _all: 1,
          },
        },
      ]),
    },
    newsProviderConfig: {
      findMany: vi.fn(async () => [
        {
          id: "provider_1",
          is_default: true,
          is_enabled: true,
          is_selectable: true,
          label: "Mediastack",
          provider_key: "mediastack",
          _count: {
            streams: 2,
          },
        },
        {
          id: "provider_2",
          is_default: false,
          is_enabled: true,
          is_selectable: true,
          label: "NewsAPI",
          provider_key: "newsapi",
          _count: {
            streams: 0,
          },
        },
      ]),
    },
    fetchRun: {
      findMany: vi.fn(async ({ where } = {}) =>
        fetchRuns.filter((run) => !where?.status || run.status === where.status),
      ),
    },
    post: {
      findMany: vi.fn(async () => posts),
    },
    publishAttempt: {
      findMany: vi.fn(async ({ where } = {}) =>
        publishAttempts.filter((attempt) => !where?.status || attempt.status === where.status),
      ),
    },
    publishingStream: {
      groupBy: vi.fn(async () => [
        {
          status: "ACTIVE",
          _count: {
            _all: 1,
          },
        },
        {
          status: "PAUSED",
          _count: {
            _all: 1,
          },
        },
      ]),
    },
    viewEvent: {
      count: vi.fn(async ({ where } = {}) =>
        viewEvents.filter((event) => {
          const gte = where?.created_at?.gte;
          const lt = where?.created_at?.lt;

          return (!gte || event.created_at >= gte) && (!lt || event.created_at < lt);
        }).length,
      ),
    },
  };
}

const originalEnv = process.env;

describe("analytics feature snapshots", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
      MEDIASTACK_API_KEY: "mediastack-key",
      NEWSAPI_API_KEY: "",
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("builds the admin dashboard snapshot with traffic and operational summaries", async () => {
    const prisma = createMockPrisma();
    const { getAdminDashboardSnapshot } = await import("./index");

    const snapshot = await getAdminDashboardSnapshot(
      {
        role: "SUPER_ADMIN",
      },
      prisma,
    );

    expect(snapshot.canViewAnalytics).toBe(true);
    expect(snapshot.summary).toMatchObject({
      aiFallbackCount7d: 1,
      aiSkippedCount7d: 1,
      failedFetchRuns7d: 1,
      failedPublishAttempts7d: 1,
      fetchRunCount7d: 2,
      publishableCount7d: 7,
      publishedCount7d: 3,
      retryCount7d: 2,
      sharedFetchRunCount7d: 1,
      sharedUpstreamCalls7d: 1,
      totalViews7d: 2,
    });
    expect(snapshot.recentAuditEvents[0]).toMatchObject({
      action: "AI_OPTIMIZATION_SKIPPED",
      level: "warn",
      reasonCode: "ai_credentials_missing",
      reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
    });
    expect(snapshot.destinationStatus).toMatchObject({
      connected: 1,
      error: 1,
      total: 2,
    });
    expect(snapshot.providerStatus).toMatchObject({
      configured: 2,
      enabled: 2,
      missingCredentials: 1,
    });
    expect(snapshot.providerStatus.providers[0]).toMatchObject({
      activeStreamCount: 2,
      credentialState: "configured",
      provider_key: "mediastack",
    });
    expect(snapshot.recentFailures[0]).toMatchObject({
      status: "FAILED",
    });
    expect(snapshot.latestStories[0]).toMatchObject({
      slug: "breaking-story",
      title: "Breaking story",
      viewCount: 2,
    });
    expect(snapshot.recentFetchRuns[0]).toMatchObject({
      executionDetails: {
        executionMode: "shared_batch",
        groupId: "shared_group_1",
        groupSize: 2,
      },
    });
  });

  it("hides analytics aggregates for dashboard users without analytics permission", async () => {
    const prisma = createMockPrisma();
    const { getAdminDashboardSnapshot } = await import("./index");

    const snapshot = await getAdminDashboardSnapshot(
      {
        role: "EDITOR",
      },
      prisma,
    );

    expect(snapshot.canViewAnalytics).toBe(false);
    expect(snapshot.summary.totalViews7d).toBeNull();
    expect(snapshot.trafficTrend).toEqual([]);
  });

  it("builds the job log snapshot with filtered fetch runs and publish attempts", async () => {
    const prisma = createMockPrisma();
    const { getAdminJobLogsSnapshot } = await import("./index");

    const snapshot = await getAdminJobLogsSnapshot(
      {
        search: "Instagram",
        status: "FAILED",
      },
      prisma,
    );

    expect(snapshot.summary).toMatchObject({
      failedFetchRuns: 1,
      failedPublishAttempts: 1,
      sharedFetchRuns: 0,
      sharedUpstreamCalls: 0,
    });
    expect(snapshot.fetchRuns[0]).toMatchObject({
      id: "fetch_2",
      status: "FAILED",
    });
    expect(snapshot.publishAttempts[0]).toMatchObject({
      id: "attempt_2",
      status: "FAILED",
    });
  });

  it("surfaces AI skip and fallback visibility inside the job log audit timeline", async () => {
    const prisma = createMockPrisma();
    const { getAdminJobLogsSnapshot } = await import("./index");

    const snapshot = await getAdminJobLogsSnapshot({}, prisma);

    expect(snapshot.summary).toMatchObject({
      aiFallbackEvents: 1,
      aiSkippedEvents: 1,
    });
    expect(snapshot.auditEvents[0]).toMatchObject({
      action: "AI_OPTIMIZATION_SKIPPED",
      level: "warn",
      reasonCode: "ai_credentials_missing",
      reasonMessage: "AI credentials are missing, so NewsPub kept deterministic content.",
    });
  });
});
