import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createPrismaStub(overrides = {}) {
  return {
    destination: {
      findUnique: vi.fn().mockResolvedValue({
        id: "destination_1",
        kind: "WEBSITE",
        name: "Website",
        platform: "WEBSITE",
        slug: "website",
      }),
      ...(overrides.destination || {}),
    },
    destinationTemplate: {
      findUnique: vi.fn().mockResolvedValue(null),
      ...(overrides.destinationTemplate || {}),
    },
    newsProviderConfig: {
      findUnique: vi.fn().mockResolvedValue({
        id: "provider_1",
        provider_key: "mediastack",
      }),
      ...(overrides.newsProviderConfig || {}),
    },
    providerFetchCheckpoint: {
      upsert: vi.fn().mockResolvedValue({
        id: "checkpoint_1",
      }),
      ...(overrides.providerFetchCheckpoint || {}),
    },
    publishingStream: {
      delete: vi.fn().mockResolvedValue({
        active_provider_id: "provider_1",
        destination_id: "destination_1",
        id: "stream_1",
        name: "Website via Mediastack",
        slug: "website-via-mediastack",
      }),
      findUnique: vi.fn().mockResolvedValue({
        active_provider_id: "provider_1",
        destination_id: "destination_1",
        id: "stream_1",
        name: "Website via Mediastack",
        slug: "website-via-mediastack",
      }),
      upsert: vi.fn().mockResolvedValue({
        active_provider_id: "provider_1",
        destination_id: "destination_1",
        id: "stream_1",
        mode: "REVIEW_REQUIRED",
        status: "ACTIVE",
      }),
      ...(overrides.publishingStream || {}),
    },
    streamCategory: {
      create: vi.fn().mockResolvedValue({
        id: "stream_category_1",
      }),
      deleteMany: vi.fn().mockResolvedValue({
        count: 0,
      }),
      ...(overrides.streamCategory || {}),
    },
  };
}

function createStreamSnapshotPrisma(now = new Date()) {
  const lastScheduledRunAt = new Date(now.getTime() - 45 * 60 * 1000);

  return {
    category: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "category_1",
          name: "Technology",
          slug: "technology",
        },
      ]),
    },
    destination: {
      findMany: vi.fn().mockResolvedValue([
        {
          _count: {
            streams: 1,
          },
          id: "destination_1",
          kind: "WEBSITE",
          name: "Website",
          platform: "WEBSITE",
          slug: "website",
        },
      ]),
    },
    destinationTemplate: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    newsProviderConfig: {
      findMany: vi.fn().mockResolvedValue([
        {
          id: "provider_1",
          is_default: true,
          label: "NewsAPI",
          provider_key: "newsapi",
          request_defaults_json: {
            category: "general",
            endpoint: "top-headlines",
          },
        },
      ]),
    },
    publishingStream: {
      count: vi.fn().mockResolvedValue(1),
      findMany: vi.fn().mockResolvedValue([
        {
          activeProvider: {
            id: "provider_1",
            label: "NewsAPI",
            provider_key: "newsapi",
            request_defaults_json: {
              category: "general",
              endpoint: "top-headlines",
            },
          },
          active_provider_id: "provider_1",
          categories: [
            {
              category: {
                id: "category_1",
                name: "Technology",
                slug: "technology",
              },
            },
          ],
          checkpoints: [
            {
              id: "checkpoint_1",
              last_successful_fetch_at: lastScheduledRunAt,
              provider_config_id: "provider_1",
              updated_at: lastScheduledRunAt,
            },
          ],
          country_allowlist_json: ["ug"],
          defaultTemplate: null,
          destination: {
            id: "destination_1",
            kind: "WEBSITE",
            name: "Website",
            platform: "WEBSITE",
            slug: "website",
          },
          exclude_keywords_json: ["rumor"],
          fetchRuns: [
            {
              ai_cache_hit_count: 0,
              blocked_count: 0,
              duplicate_count: 0,
              last_error_message: null,
              execution_details_json: {
                executionMode: "single",
                sharedRequest: {
                  requestValues: {
                    category: "general",
                    country: "ug",
                    endpoint: "top-headlines",
                    q: "uganda tech",
                  },
                },
                streamFetchWindow: {
                  end: now.toISOString(),
                  source: "checkpoint",
                  start: lastScheduledRunAt.toISOString(),
                },
              },
              failed_count: 0,
              fetched_count: 6,
              finished_at: new Date(now.getTime() - 40 * 60 * 1000),
              held_count: 0,
              id: "run_1",
              optimized_count: 4,
              publishable_count: 4,
              published_count: 4,
              queued_count: 0,
              skipped_count: 2,
              started_at: lastScheduledRunAt,
              status: "SUCCEEDED",
              trigger_type: "scheduled",
            },
          ],
          id: "stream_1",
          include_keywords_json: ["uganda", "ai"],
          language_allowlist_json: ["en"],
          last_failure_at: null,
          last_run_completed_at: lastScheduledRunAt,
          last_run_started_at: lastScheduledRunAt,
          locale: "en",
          max_posts_per_run: 5,
          mode: "AUTO_PUBLISH",
          name: "Website auto stream",
          region_allowlist_json: [],
          schedule_interval_minutes: 30,
          settings_json: {
            providerFilters: {
              country_allowlist_json: ["ug"],
              endpoint: "top-headlines",
              q: "uganda tech",
            },
          },
          status: "ACTIVE",
          timezone: "Africa/Kampala",
        },
      ]),
      groupBy: vi.fn().mockResolvedValue([
        {
          _count: {
            _all: 1,
          },
          status: "ACTIVE",
        },
      ]),
    },
  };
}

describe("stream feature validation", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.doMock("@/lib/analytics", () => ({
      createAuditEventRecord: vi.fn().mockResolvedValue(null),
    }));
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("rejects default templates that do not match the selected destination platform", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "FACEBOOK_PAGE",
          name: "Facebook Page",
          platform: "FACEBOOK",
          slug: "facebook-page",
        }),
      },
      destinationTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          id: "template_1",
          name: "Website Default",
          platform: "WEBSITE",
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          active_provider_id: "provider_1",
          default_template_id: "template_1",
          destination_id: "destination_1",
          locale: "en",
          mode: "REVIEW_REQUIRED",
          name: "Mismatch stream",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });
  });

  it("rejects auto-publish streams for instagram personal destinations", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "INSTAGRAM_PERSONAL",
          name: "Instagram Personal",
          platform: "INSTAGRAM",
          slug: "instagram-personal",
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          active_provider_id: "provider_1",
          destination_id: "destination_1",
          locale: "en",
          mode: "AUTO_PUBLISH",
          name: "Instagram auto stream",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });
  });

  it("sanitizes and saves provider-side stream filters with allowlists", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "WEBSITE",
          name: "Website",
          platform: "WEBSITE",
          slug: "website",
        }),
      },
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          provider_key: "newsdata",
        }),
      },
    });

    await saveStreamRecord(
      {
        active_provider_id: "provider_1",
        categoryIds: ["category_1"],
        country_allowlist_json: ["UG", "US"],
        destination_id: "destination_1",
        exclude_keywords_json: "rumor",
        include_keywords_json: "ai, policy",
        language_allowlist_json: ["EN", "FR"],
        locale: "en",
        mode: "REVIEW_REQUIRED",
        name: "NewsData stream",
        providerFilters: {
          bogus: "drop-me",
          category: ["technology", "technology"],
          endpoint: "latest",
          excludeCountries: ["gb"],
          fullContent: "",
          image: "1",
          removeDuplicate: "1",
        },
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          country_allowlist_json: ["ug", "us"],
          exclude_keywords_json: ["rumor"],
          include_keywords_json: ["ai", "policy"],
          language_allowlist_json: ["en", "fr"],
          settings_json: {
            providerFilters: {
              category: ["technology"],
              endpoint: "latest",
              excludeCountries: ["gb"],
              fullContent: "",
              image: "1",
              removeDuplicate: "1",
            },
            socialPost: {
              linkPlacement: "RANDOM",
              linkUrl: null,
            },
          },
        }),
      }),
    );
    expect(prisma.streamCategory.create).toHaveBeenCalledWith({
      data: {
        category_id: "category_1",
        stream_id: "stream_1",
      },
    });
    expect(prisma.providerFetchCheckpoint.upsert).toHaveBeenCalledWith({
      create: {
        provider_config_id: "provider_1",
        stream_id: "stream_1",
      },
      update: {},
      where: {
        stream_id_provider_config_id: {
          provider_config_id: "provider_1",
          stream_id: "stream_1",
        },
      },
    });
  });

  it('rejects NewsAPI "Everything" streams without a query or domain filter', async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "WEBSITE",
          name: "Website",
          platform: "WEBSITE",
          slug: "website",
        }),
      },
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          provider_key: "newsapi",
          request_defaults_json: {
            category: "general",
            endpoint: "top-headlines",
          },
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          active_provider_id: "provider_1",
          destination_id: "destination_1",
          locale: "en",
          mode: "REVIEW_REQUIRED",
          name: "NewsAPI everything stream",
          providerFilters: {
            domains: "",
            endpoint: "everything",
            q: "",
          },
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });

    expect(prisma.publishingStream.upsert).not.toHaveBeenCalled();
  });

  it("moves provider-filter allowlists into the stream allowlist columns", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          provider_key: "newsapi",
          request_defaults_json: {
            category: "general",
            endpoint: "top-headlines",
          },
        }),
      },
    });

    await saveStreamRecord(
      {
        active_provider_id: "provider_1",
        destination_id: "destination_1",
        locale: "en",
        mode: "REVIEW_REQUIRED",
        name: "NewsAPI top headlines stream",
        providerFilters: {
          category: "sports",
          country_allowlist_json: "us",
          endpoint: "top-headlines",
        },
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          country_allowlist_json: ["us"],
          settings_json: {
            providerFilters: {
              category: "sports",
              endpoint: "top-headlines",
            },
            socialPost: {
              linkPlacement: "RANDOM",
              linkUrl: null,
            },
          },
        }),
      }),
    );
  });

  it("stores social post link settings and allows schedule interval 0 to disable auto-runs", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub();

    await saveStreamRecord(
      {
        active_provider_id: "provider_1",
        destination_id: "destination_1",
        locale: "en",
        mode: "REVIEW_REQUIRED",
        name: "Website stream with social link",
        postLinkPlacement: "END",
        postLinkUrl: "/go/deeper",
        schedule_interval_minutes: "0",
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          schedule_expression: null,
          schedule_interval_minutes: 0,
          settings_json: {
            providerFilters: {},
            socialPost: {
              linkPlacement: "END",
              linkUrl: "https://example.com/go/deeper",
            },
          },
        }),
      }),
    );
  });

  it("rejects stream saves when max posts per run exceeds the selected provider guard", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      newsProviderConfig: {
        findUnique: vi.fn().mockResolvedValue({
          id: "provider_1",
          provider_key: "mediastack",
          request_defaults_json: {
            countries: ["us"],
            languages: ["en"],
            sort: "published_desc",
          },
        }),
      },
    });

    await expect(
      saveStreamRecord(
        {
          active_provider_id: "provider_1",
          destination_id: "destination_1",
          locale: "en",
          max_posts_per_run: "34",
          mode: "REVIEW_REQUIRED",
          name: "Too many Mediastack posts",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });

    expect(prisma.publishingStream.upsert).not.toHaveBeenCalled();
  });

  it("defaults new website streams to auto publish when no mode is submitted", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = createPrismaStub();

    await saveStreamRecord(
      {
        active_provider_id: "provider_1",
        destination_id: "destination_1",
        locale: "en",
        name: "Website default mode stream",
      },
      {},
      prisma,
    );

    expect(prisma.publishingStream.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          mode: "AUTO_PUBLISH",
        }),
        update: expect.objectContaining({
          mode: "AUTO_PUBLISH",
        }),
      }),
    );
  });

  it("builds scheduler and effective-filter details for the stream management snapshot", async () => {
    const { getStreamManagementSnapshot } = await import("./index");
    const now = new Date();
    const prisma = createStreamSnapshotPrisma(now);

    const snapshot = await getStreamManagementSnapshot(prisma);

    expect(snapshot.summary).toMatchObject({
      activeCount: 1,
      dueCount: 1,
      scheduledCount: 1,
      totalCount: 1,
    });
    expect(snapshot.scheduler).toMatchObject({
      dueStreamCount: 1,
      mode: "EXTERNAL_CRON",
      scheduledStreamCount: 1,
      usesExternalCron: true,
    });
    expect(snapshot.streams[0]).toMatchObject({
      checkpoint: {
        id: "checkpoint_1",
      },
      effectiveFilters: {
        providerEndpoint: "top-headlines",
        providerRequestValues: {
          category: "general",
          country: "ug",
          endpoint: "top-headlines",
          q: "uganda tech",
        },
      },
      latestRun: {
        id: "run_1",
        trigger_type: "scheduled",
      },
      schedule: {
        isDue: true,
        is_enabled: true,
      },
    });
  });

  it("deletes streams and records the audit event payload", async () => {
    const analytics = await import("@/lib/analytics");
    const { deleteStreamRecord } = await import("./index");
    const prisma = createPrismaStub();

    const record = await deleteStreamRecord(
      "stream_1",
      {
        actor_id: "admin_1",
      },
      prisma,
    );

    expect(prisma.publishingStream.findUnique).toHaveBeenCalledWith({
      select: {
        active_provider_id: true,
        destination_id: true,
        id: true,
        name: true,
        slug: true,
      },
      where: {
        id: "stream_1",
      },
    });
    expect(prisma.publishingStream.delete).toHaveBeenCalledWith({
      where: {
        id: "stream_1",
      },
    });
    expect(analytics.createAuditEventRecord).toHaveBeenCalledWith(
      {
        action: "STREAM_DELETED",
        actor_id: "admin_1",
        entity_id: "stream_1",
        entity_type: "publishing_stream",
        payload_json: {
          destination_id: "destination_1",
          provider_config_id: "provider_1",
          slug: "website-via-mediastack",
        },
      },
      prisma,
    );
    expect(record).toMatchObject({
      id: "stream_1",
      slug: "website-via-mediastack",
    });
  });

  it("rejects deleting a stream that does not exist", async () => {
    const { deleteStreamRecord } = await import("./index");
    const prisma = createPrismaStub({
      publishingStream: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
    });

    await expect(
      deleteStreamRecord(
        "missing_stream",
        {
          actor_id: "admin_1",
        },
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
      statusCode: 404,
    });
    expect(prisma.publishingStream.delete).not.toHaveBeenCalled();
  });
});
