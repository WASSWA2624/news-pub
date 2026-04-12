import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

function createRequest(headers = {}) {
  const normalizedHeaders = new Map(
    Object.entries(headers).map(([key, value]) => [key.toLowerCase(), value]),
  );

  return {
    headers: {
      get(name) {
        return normalizedHeaders.get(`${name}`.toLowerCase()) || null;
      },
    },
  };
}

const originalEnv = process.env;

describe("analytics library", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("records normalized view events with a hashed ip", async () => {
    const viewEventCreate = vi.fn().mockResolvedValue({
      created_at: new Date("2026-04-03T10:05:00.000Z"),
      event_type: "POST_VIEW",
      id: "view_1",
      locale: "en",
      path: "/en/news/microscope-basics",
      post_id: "post_1",
    });
    const prisma = {
      viewEvent: {
        create: viewEventCreate,
      },
    };
    const request = createRequest({
      "user-agent": "Vitest Browser",
      "x-forwarded-for": "203.0.113.12, 10.0.0.9",
    });
    const { hashAnalyticsValue, recordViewEvent } = await import("./index");

    await recordViewEvent(
      {
        event_type: "post_view",
        locale: "EN",
        path: "en/news/microscope-basics",
        post_id: "post_1",
        referrer: "https://example.com/en",
      },
      {
        request,
      },
      prisma,
    );

    expect(viewEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: {
          event_type: "POST_VIEW",
          ip_hash: hashAnalyticsValue("203.0.113.12", "session-secret", "view-ip"),
          locale: "en",
          path: "/en/news/microscope-basics",
          post_id: "post_1",
          referrer: "https://example.com/en",
          user_agent: "Vitest Browser",
        },
      }),
    );
  });

  it("persists and console-logs structured observability failures", async () => {
    const auditEventCreate = vi.fn().mockResolvedValue({
      id: "audit_1",
    });
    const prisma = {
      auditEvent: {
        create: auditEventCreate,
      },
    };
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    const { recordObservabilityEvent } = await import("./index");

    await recordObservabilityEvent(
      {
        action: "MEDIA_LIBRARY_FAILURE",
        actor_id: "user_1",
        entity_id: "media_library",
        entity_type: "media_library",
        error: new Error("Image derivative write failed."),
        message: "Media upload failed.",
        payload: {
          route: "/api/media",
        },
      },
      prisma,
    );

    expect(auditEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MEDIA_LIBRARY_FAILURE",
          actor_id: "user_1",
          entity_id: "media_library",
          entity_type: "media_library",
          payload_json: expect.objectContaining({
            last_error_message: "Image derivative write failed.",
            level: "error",
            message: "Media upload failed.",
            route: "/api/media",
          }),
        }),
      }),
    );
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining("\"action\":\"MEDIA_LIBRARY_FAILURE\""),
    );
  });

  it("records normalized web vitals with route and form-factor metadata", async () => {
    const webVitalMetricCreate = vi.fn().mockResolvedValue({
      build_id: "build-42",
      created_at: new Date("2026-04-03T10:05:00.000Z"),
      id: "metric_1",
      name: "LCP",
      path: "/en/news/climate-resilience-market-watch",
      route_group: "story",
      value: 2140,
    });
    const prisma = {
      webVitalMetric: {
        create: webVitalMetricCreate,
      },
    };
    const { recordWebVitalMetric } = await import("./index");

    await recordWebVitalMetric(
      {
        attribution: {
          element: "hero-image",
        },
        build_id: "build-42",
        form_factor: "",
        id: "vital_1",
        name: "lcp",
        path: "en/news/climate-resilience-market-watch",
        rating: "needs-improvement",
        value: 2140,
        viewport_width: 900,
      },
      prisma,
    );

    expect(webVitalMetricCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        attribution_json: {
          element: "hero-image",
        },
        build_id: "build-42",
        form_factor: "tablet",
        locale: "en",
        metric_id: "vital_1",
        name: "LCP",
        path: "/en/news/climate-resilience-market-watch",
        rating: "needs-improvement",
        route_group: "story",
        value: 2140,
        viewport_height: null,
        viewport_width: 900,
      }),
      select: {
        build_id: true,
        created_at: true,
        id: true,
        name: true,
        path: true,
        route_group: true,
        value: true,
      },
    });
  });
});
