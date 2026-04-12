import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("web vitals analytics route", () => {
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
    vi.resetModules();
  });

  it("persists valid web-vitals payloads", async () => {
    const recordWebVitalMetric = vi.fn().mockResolvedValue({
      id: "metric_1",
      name: "LCP",
      path: "/en/news/climate-resilience-market-watch",
    });

    vi.doMock("@/lib/analytics", async () => {
      const actual = await vi.importActual("@/lib/analytics");

      return {
        ...actual,
        recordWebVitalMetric,
      };
    });

    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/analytics/web-vitals", {
        body: JSON.stringify({
          id: "vital_1",
          name: "LCP",
          path: "/en/news/climate-resilience-market-watch",
          rating: "good",
          value: 2140,
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body).toEqual({
      data: {
        id: "metric_1",
        name: "LCP",
        path: "/en/news/climate-resilience-market-watch",
      },
      success: true,
    });
    expect(recordWebVitalMetric).toHaveBeenCalledWith({
      id: "vital_1",
      name: "LCP",
      path: "/en/news/climate-resilience-market-watch",
      rating: "good",
      value: 2140,
    });
  });

  it("rejects invalid web-vitals payloads", async () => {
    const { POST } = await import("./route");
    const response = await POST(
      new Request("https://example.com/api/analytics/web-vitals", {
        body: JSON.stringify({
          path: "/en",
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      }),
    );
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body).toEqual(
      expect.objectContaining({
        status: "invalid_payload",
        success: false,
      }),
    );
  });
});
