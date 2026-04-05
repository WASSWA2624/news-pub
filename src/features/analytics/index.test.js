import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    ADMIN_SEED_EMAIL: "admin@example.com",
    ADMIN_SEED_PASSWORD: "password123",
    AI_MODEL_DEFAULT: "gpt-5.4",
    AI_MODEL_FALLBACK: "gpt-5.4-mini",
    AI_PROVIDER_DEFAULT: "openai",
    AI_PROVIDER_FALLBACK: "openai",
    COMMENT_CAPTCHA_ENABLED: "false",
    COMMENT_RATE_LIMIT_MAX: "5",
    COMMENT_RATE_LIMIT_WINDOW_MS: "60000",
    CRON_SECRET: "cron-secret",
    DATABASE_URL: "mysql://user:pass@localhost:3306/equip_blog",
    DEFAULT_LOCALE: "en",
    LOCAL_MEDIA_BASE_PATH: "d:/coding/apps/equip-blog/public/uploads",
    LOCAL_MEDIA_BASE_URL: "/uploads",
    MEDIA_DRIVER: "local",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    OPENAI_API_KEY: "test-openai-key",
    REVALIDATE_SECRET: "revalidate-secret",
    SESSION_MAX_AGE_SECONDS: "3600",
    SESSION_SECRET: "session-secret",
    SUPPORTED_LOCALES: "en",
    UPLOAD_ALLOWED_MIME_TYPES: "image/png,image/jpeg",
  };
}

function createGenerationJob(overrides = {}) {
  return {
    createdAt: new Date("2026-04-03T10:00:00.000Z"),
    currentStage: "draft_saved",
    equipmentName: "Microscope",
    errorMessage: null,
    finishedAt: new Date("2026-04-03T10:12:00.000Z"),
    id: "job_1",
    locale: "en",
    post: {
      id: "post_1",
      publishedAt: new Date("2026-04-03T12:00:00.000Z"),
      slug: "microscope-basics",
      translations: [
        {
          locale: "en",
          title: "Microscope basics",
        },
      ],
    },
    providerConfig: {
      id: "provider_cfg_default_generation",
      model: "gpt-5.4",
      provider: "openai",
      purpose: "draft_generation",
    },
    replaceExistingPost: false,
    requestJson: {
      equipmentName: "Microscope",
      locale: "en",
    },
    responseJson: {
      duplicateDecision: "create_new",
    },
    schedulePublishAt: null,
    startedAt: new Date("2026-04-03T10:01:00.000Z"),
    status: "COMPLETED",
    updatedAt: new Date("2026-04-03T10:12:00.000Z"),
    warningJson: [],
    ...overrides,
  };
}

function createAuditEvent(overrides = {}) {
  return {
    action: "MEDIA_LIBRARY_FAILURE",
    actorId: null,
    createdAt: new Date("2026-04-03T11:00:00.000Z"),
    entityId: "media_library",
    entityType: "media_library",
    id: "audit_1",
    payloadJson: {
      errorMessage: "Image derivative write failed.",
      level: "error",
      message: "Media upload failed.",
    },
    ...overrides,
  };
}

function createMockPrisma() {
  const generationJobs = [
    createGenerationJob({
      createdAt: new Date("2026-04-03T10:00:00.000Z"),
      currentStage: "failed",
      errorMessage: "SEO payload generation failed.",
      finishedAt: new Date("2026-04-03T10:04:00.000Z"),
      id: "job_failed",
      status: "FAILED",
      warningJson: ["SEO payload fallback was unavailable."],
    }),
    createGenerationJob({
      createdAt: new Date("2026-04-02T08:00:00.000Z"),
      id: "job_completed",
      status: "COMPLETED",
      warningJson: ["Used fixture-backed research payload."],
    }),
    createGenerationJob({
      createdAt: new Date("2026-04-01T08:30:00.000Z"),
      finishedAt: null,
      id: "job_running",
      startedAt: new Date("2026-04-01T08:31:00.000Z"),
      status: "RUNNING",
      warningJson: [],
    }),
  ];
  const viewEvents = [
    {
      createdAt: new Date("2026-04-03T08:00:00.000Z"),
      eventType: "WEBSITE_VIEW",
      postId: null,
    },
    {
      createdAt: new Date("2026-04-03T09:00:00.000Z"),
      eventType: "PAGE_VIEW",
      postId: null,
    },
    {
      createdAt: new Date("2026-04-03T10:00:00.000Z"),
      eventType: "POST_VIEW",
      postId: "post_1",
    },
    {
      createdAt: new Date("2026-04-02T10:00:00.000Z"),
      eventType: "POST_VIEW",
      postId: "post_1",
    },
    {
      createdAt: new Date("2026-04-02T12:00:00.000Z"),
      eventType: "POST_VIEW",
      postId: "post_2",
    },
  ];
  const auditEvents = [
    createAuditEvent(),
    createAuditEvent({
      action: "GENERATION_JOB_WARNING",
      createdAt: new Date("2026-04-03T10:05:00.000Z"),
      entityId: "job_failed",
      entityType: "generation_job",
      id: "audit_warning",
      payloadJson: {
        level: "warn",
        message: "Used fixture-backed research payload.",
        warningCount: 1,
      },
    }),
    createAuditEvent({
      action: "SCHEDULED_PUBLISH_RUN_STARTED",
      createdAt: new Date("2026-04-03T07:00:00.000Z"),
      entityId: "run_1",
      entityType: "scheduled_publish_worker",
      id: "run_start",
      payloadJson: {
        batchSize: 25,
        startedAt: "2026-04-03T07:00:00.000Z",
      },
    }),
    createAuditEvent({
      action: "SCHEDULED_PUBLISH_RUN_COMPLETED",
      createdAt: new Date("2026-04-03T07:02:00.000Z"),
      entityId: "run_1",
      entityType: "scheduled_publish_worker",
      id: "run_complete",
      payloadJson: {
        batchSize: 25,
        completedAt: "2026-04-03T07:02:00.000Z",
        dueCount: 2,
        failedCount: 0,
        publishedCount: 2,
        revalidationFailureCount: 0,
        skippedCount: 0,
      },
    }),
    createAuditEvent({
      action: "GENERATION_JOB_COMPLETED",
      createdAt: new Date("2026-04-02T08:05:00.000Z"),
      entityId: "job_completed",
      entityType: "generation_job",
      id: "job_log_complete",
      payloadJson: {
        currentStage: "draft_saved",
        status: "COMPLETED",
      },
    }),
  ];
  const posts = [
    {
      id: "post_1",
      publishedAt: new Date("2026-04-03T12:00:00.000Z"),
      slug: "microscope-basics",
      translations: [
        {
          locale: "en",
          title: "Microscope basics",
        },
      ],
    },
    {
      id: "post_2",
      publishedAt: new Date("2026-04-02T12:00:00.000Z"),
      slug: "centrifuge-guide",
      translations: [
        {
          locale: "en",
          title: "Centrifuge guide",
        },
      ],
    },
  ];

  function matchesCreatedAtFilter(record, where = {}) {
    const gte = where?.createdAt?.gte;

    return !gte || record.createdAt >= gte;
  }

  function matchesJobWhere(job, where = {}) {
    if (where.status && job.status !== where.status) {
      return false;
    }

    if (where.createdAt?.gte && job.createdAt < where.createdAt.gte) {
      return false;
    }

    if (where.equipmentName?.contains) {
      return job.equipmentName.includes(where.equipmentName.contains);
    }

    return true;
  }

  const prisma = {
    auditEvent: {
      findMany: vi.fn(async ({ take, where }) => {
        return auditEvents
          .filter((event) => {
            if (where?.entityType && event.entityType !== where.entityType) {
              return false;
            }

            if (where?.entityId && event.entityId !== where.entityId) {
              return false;
            }

            if (where?.action?.in && !where.action.in.includes(event.action)) {
              return false;
            }

            if (!matchesCreatedAtFilter(event, where)) {
              return false;
            }

            return true;
          })
          .sort((left, right) => right.createdAt.getTime() - left.createdAt.getTime())
          .slice(0, take || auditEvents.length);
      }),
    },
    generationJob: {
      count: vi.fn(async ({ where } = {}) => generationJobs.filter((job) => matchesJobWhere(job, where)).length),
      findMany: vi.fn(async ({ select, take, where } = {}) => {
        const matchedJobs = generationJobs.filter((job) => matchesJobWhere(job, where));

        if (select?.warningJson && !select?.id) {
          return matchedJobs.map((job) => ({
            warningJson: job.warningJson,
          }));
        }

        return matchedJobs.slice(0, take || matchedJobs.length);
      }),
      findUnique: vi.fn(async ({ where }) => generationJobs.find((job) => job.id === where.id) || null),
    },
    post: {
      findMany: vi.fn(async ({ where }) => posts.filter((post) => where.id.in.includes(post.id))),
    },
    viewEvent: {
      count: vi.fn(async ({ where } = {}) =>
        viewEvents.filter((event) => {
          if (where?.eventType && event.eventType !== where.eventType) {
            return false;
          }

          if (!matchesCreatedAtFilter(event, where)) {
            return false;
          }

          return true;
        }).length),
      findMany: vi.fn(async ({ select, where } = {}) => {
        const matchedEvents = viewEvents.filter((event) => {
          if (where?.eventType && event.eventType !== where.eventType) {
            return false;
          }

          if (where?.postId?.not === null && !event.postId) {
            return false;
          }

          if (!matchesCreatedAtFilter(event, where)) {
            return false;
          }

          return true;
        });

        if (select?.postId) {
          return matchedEvents.map((event) => ({
            postId: event.postId,
          }));
        }

        return matchedEvents;
      }),
      groupBy: vi.fn(async ({ where }) => {
        const counts = viewEvents
          .filter((event) => {
            if (where?.eventType && event.eventType !== where.eventType) {
              return false;
            }

            if (where?.postId?.not === null && !event.postId) {
              return false;
            }

            if (!matchesCreatedAtFilter(event, where)) {
              return false;
            }

            return true;
          })
          .reduce((map, event) => {
            if (!event.postId) {
              return map;
            }

            map.set(event.postId, (map.get(event.postId) || 0) + 1);
            return map;
          }, new Map());

        return [...counts.entries()].map(([postId, count]) => ({
          _count: {
            postId: count,
          },
          postId,
        }));
      }),
    },
  };

  return prisma;
}

const originalEnv = process.env;

describe("analytics feature snapshots", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
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

    expect(snapshot.permissions.canViewAnalytics).toBe(true);
    expect(snapshot.summary).toMatchObject({
      completedJobCount30d: 1,
      failedJobCount30d: 1,
      generationJobCount30d: 3,
      warningJobCount30d: 2,
    });
    expect(snapshot.analytics).toMatchObject({
      pageViewCount30d: 1,
      postViewCount30d: 3,
      totalViewCount30d: 5,
      websiteViewCount30d: 1,
    });
    expect(snapshot.analytics.topPosts[0]).toMatchObject({
      path: "/en/blog/microscope-basics",
      slug: "microscope-basics",
      title: "Microscope basics",
      viewCount: 2,
    });
    expect(snapshot.recentFailures).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          action: "GENERATION_JOB_WARNING",
          level: "warn",
        }),
      ]),
    );
    expect(snapshot.scheduledRuns[0]).toMatchObject({
      publishedCount: 2,
      runId: "run_1",
      status: "completed",
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

    expect(snapshot.permissions.canViewAnalytics).toBe(false);
    expect(snapshot.analytics.totalViewCount30d).toBeNull();
    expect(snapshot.analytics.trend).toEqual([]);
  });

  it("builds the job log snapshot with filtered jobs, selected details, and grouped worker runs", async () => {
    const prisma = createMockPrisma();
    const { getAdminJobLogsSnapshot } = await import("./index");

    const snapshot = await getAdminJobLogsSnapshot(
      {
        jobId: "job_failed",
        search: "Microscope",
        status: "FAILED",
      },
      prisma,
    );

    expect(snapshot.filters).toEqual({
      jobId: "job_failed",
      search: "Microscope",
      status: "FAILED",
    });
    expect(snapshot.jobs).toHaveLength(1);
    expect(snapshot.selectedJob).toMatchObject({
      errorMessage: "SEO payload generation failed.",
      id: "job_failed",
      status: "FAILED",
      warningCount: 1,
    });
    expect(snapshot.selectedJob.logs[0]).toMatchObject({
      action: "GENERATION_JOB_WARNING",
      entityId: "job_failed",
    });
    expect(snapshot.scheduledRuns[0]).toMatchObject({
      batchSize: 25,
      runId: "run_1",
      status: "completed",
    });
  });
});
