"use client";

/**
 * Client analytics tracker that records NewsPub public view events without blocking rendering.
 */

import { useEffect } from "react";
import { usePathname } from "next/navigation";

const recentViewTtlMs = 3000;

function buildTrackingKey({ event_type, path, post_id }) {
  return `news-pub:view:${event_type}:${post_id || "none"}:${path}`;
}

function shouldSkipRecentDuplicate(key, now) {
  try {
    const previousTimestamp = Number.parseInt(sessionStorage.getItem(key) || "", 10);

    if (Number.isFinite(previousTimestamp) && now - previousTimestamp < recentViewTtlMs) {
      return true;
    }

    sessionStorage.setItem(key, `${now}`);
    return false;
  } catch {
    return false;
  }
}

/**
 * Tracks NewsPub public view events after the page becomes visible to the reader.
 */
export default function PublicViewTracker({ event_type, locale, post_id = null }) {
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname) {
      return;
    }

    const search = typeof window !== "undefined" ? window.location.search : "";
    const path = `${pathname || `/${locale}`}${search || ""}`;

    const now = Date.now();
    const trackingKey = buildTrackingKey({
      event_type,
      path,
      post_id,
    });

    if (shouldSkipRecentDuplicate(trackingKey, now)) {
      return;
    }

    void fetch("/api/analytics/views", {
      body: JSON.stringify({
        event_type,
        locale,
        path,
        ...(post_id ? { post_id } : {}),
        ...(document.referrer ? { referrer: document.referrer } : {}),
      }),
      credentials: "same-origin",
      headers: {
        "Content-Type": "application/json",
      },
      keepalive: true,
      method: "POST",
    }).catch(() => {});
  }, [event_type, locale, pathname, post_id]);

  return null;
}
