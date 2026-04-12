"use client";

import { useReportWebVitals } from "next/web-vitals";

function buildPayload(metric) {
  return {
    id: metric.id,
    label: metric.label,
    name: metric.name,
    navigationType: metric.navigationType,
    pathname: typeof window !== "undefined" ? window.location.pathname : "",
    rating: metric.rating,
    startTime: metric.startTime,
    url: typeof window !== "undefined" ? window.location.href : "",
    value: metric.value,
  };
}

export default function WebVitals() {
  useReportWebVitals((metric) => {
    const body = JSON.stringify(buildPayload(metric));

    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      navigator.sendBeacon("/api/analytics/web-vitals", body);
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
