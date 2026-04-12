"use client";

import { useReportWebVitals } from "next/web-vitals";

function normalizeViewportDimension(value) {
  return Number.isFinite(value) ? Math.max(0, Math.round(value)) : undefined;
}

function resolveFormFactor(viewport_width) {
  if (!Number.isFinite(viewport_width)) {
    return "desktop";
  }

  if (viewport_width < 760) {
    return "mobile";
  }

  if (viewport_width < 1040) {
    return "tablet";
  }

  return "desktop";
}

function buildPayload(metric) {
  const viewport_width = typeof window !== "undefined" ? normalizeViewportDimension(window.innerWidth) : undefined;
  const viewport_height = typeof window !== "undefined" ? normalizeViewportDimension(window.innerHeight) : undefined;
  const connection_type =
    typeof navigator !== "undefined" && navigator.connection?.effectiveType
      ? navigator.connection.effectiveType
      : "";

  return {
    attribution: metric.attribution,
    build_id: process.env.NEXT_PUBLIC_RELEASE_ID || "",
    connection_type,
    delta: metric.delta,
    form_factor: resolveFormFactor(viewport_width),
    id: metric.id,
    label: metric.label,
    name: metric.name,
    navigation_type: metric.navigation_type,
    path: typeof window !== "undefined" ? window.location.pathname : "",
    rating: metric.rating,
    value: metric.value,
    viewport_height,
    viewport_width,
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
