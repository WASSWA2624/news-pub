"use client";

import { useReportWebVitals } from "next/web-vitals";

function normalizeViewportDimension(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function resolveFormFactor(viewportWidth) {
  if (!Number.isFinite(viewportWidth)) {
    return "desktop";
  }

  if (viewportWidth < 760) {
    return "mobile";
  }

  if (viewportWidth < 1040) {
    return "tablet";
  }

  return "desktop";
}

function buildPayload(metric) {
  const viewportWidth = typeof window !== "undefined" ? normalizeViewportDimension(window.innerWidth) : undefined;
  const viewportHeight = typeof window !== "undefined" ? normalizeViewportDimension(window.innerHeight) : undefined;
  const connectionType =
    typeof navigator !== "undefined" && navigator.connection?.effectiveType
      ? navigator.connection.effectiveType
      : "";

  return {
    attribution: metric.attribution,
    buildId: process.env.NEXT_PUBLIC_RELEASE_ID || "",
    connectionType,
    delta: metric.delta,
    formFactor: resolveFormFactor(viewportWidth),
    id: metric.id,
    label: metric.label,
    name: metric.name,
    navigationType: metric.navigationType,
    path: typeof window !== "undefined" ? window.location.pathname : "",
    rating: metric.rating,
    value: metric.value,
    viewportHeight,
    viewportWidth,
  };
}

export default function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify(buildPayload(metric));

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon(
        "/api/analytics/web-vitals",
        new Blob([body], {
          type: "application/json",
        }),
      );
      return;
    }

    void fetch("/api/analytics/web-vitals", {
      body,
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => {});
  });

  return null;
}
