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
      createdAt: new Date("2026-04-03T10:05:00.000Z"),
      eventType: "POST_VIEW",
      id: "view_1",
      locale: "en",
      path: "/en/news/microscope-basics",
      postId: "post_1",
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
        eventType: "post_view",
        locale: "EN",
        path: "en/news/microscope-basics",
        postId: "post_1",
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
          eventType: "POST_VIEW",
          ipHash: hashAnalyticsValue("203.0.113.12", "session-secret", "view-ip"),
          locale: "en",
          path: "/en/news/microscope-basics",
          postId: "post_1",
          referrer: "https://example.com/en",
          userAgent: "Vitest Browser",
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
        actorId: "user_1",
        entityId: "media_library",
        entityType: "media_library",
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
          actorId: "user_1",
          entityId: "media_library",
          entityType: "media_library",
          payloadJson: expect.objectContaining({
            errorMessage: "Image derivative write failed.",
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
});
