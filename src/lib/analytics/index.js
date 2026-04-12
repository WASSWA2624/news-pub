/**
 * Analytics and audit-log helpers used across NewsPub admin, workflow, and public tracking flows.
 */

import crypto from "node:crypto";

import { z } from "zod";

import { defaultLocale, isSupportedLocale } from "@/features/i18n/config";
import { env } from "@/lib/env/server";
import { normalizeDisplayText } from "@/lib/normalization";

/**
 * Analytics, audit, and observability helpers for NewsPub admin and public traffic flows.
 */
export const viewEventTypeValues = Object.freeze([
  "WEBSITE_VIEW",
  "PAGE_VIEW",
  "POST_VIEW",
  "SEARCH_VIEW",
]);

export const webVitalMetricNameValues = Object.freeze([
  "CLS",
  "FCP",
  "INP",
  "LCP",
  "TTFB",
]);

export const observabilityFailureActionValues = Object.freeze([
  "DESTINATION_CONNECTION_ERROR",
  "FETCH_RUN_FAILED",
  "MEDIA_LIBRARY_FAILURE",
  "POST_PUBLISH_REVALIDATION_FAILED",
  "PROVIDER_RESPONSE_INVALID",
  "PUBLISH_ATTEMPT_FAILED",
  "STREAM_EXECUTION_PAUSED",
]);

export const observabilityWarningActionValues = Object.freeze([
  "AI_OPTIMIZATION_FALLBACK_USED",
  "AI_OPTIMIZATION_SKIPPED",
  "FETCH_RUN_WARNING",
  "PUBLISH_ATTEMPT_WARNING",
]);

export const captureViewEventSchema = z.object({
  event_type: z.enum(viewEventTypeValues),
  locale: z.string().trim().min(1),
  path: z.string().trim().min(1).max(2048),
  post_id: z.string().trim().min(1).optional(),
  referrer: z.string().trim().max(2048).optional(),
});

export const captureWebVitalSchema = z.object({
  attribution: z.record(z.any()).optional(),
  build_id: z.string().trim().max(128).optional(),
  connection_type: z.string().trim().max(32).optional(),
  delta: z.number().finite().optional(),
  form_factor: z.string().trim().max(16).optional(),
  id: z.string().trim().min(1).max(128),
  label: z.string().trim().max(32).optional(),
  name: z.enum(webVitalMetricNameValues),
  navigation_type: z.string().trim().max(32).optional(),
  path: z.string().trim().min(1).max(2048),
  rating: z.string().trim().min(1).max(16),
  value: z.number().finite(),
  viewport_height: z.number().int().positive().optional(),
  viewport_width: z.number().int().positive().optional(),
});

function trimToNull(value, maxLength) {
  if (typeof value !== "string") {
    return null;
  }

  const normalizedValue = normalizeDisplayText(value);

  if (!normalizedValue) {
    return null;
  }

  return maxLength ? normalizedValue.slice(0, maxLength) : normalizedValue;
}

function normalizePathname(value) {
  const normalizedValue = trimToNull(value, 2048);

  if (!normalizedValue) {
    return `/${defaultLocale}`;
  }

  return normalizedValue.startsWith("/") ? normalizedValue : `/${normalizedValue}`;
}

function normalizeLocale(value) {
  const normalizedValue = typeof value === "string" ? value.trim().toLowerCase() : "";

  return isSupportedLocale(normalizedValue) ? normalizedValue : defaultLocale;
}

function normalizeViewEventType(value) {
  const normalizedValue = `${value || ""}`.trim().toUpperCase();

  return viewEventTypeValues.includes(normalizedValue) ? normalizedValue : "PAGE_VIEW";
}

function normalizeWebVitalMetricName(value) {
  const normalizedValue = `${value || ""}`.trim().toUpperCase();

  return webVitalMetricNameValues.includes(normalizedValue) ? normalizedValue : "LCP";
}

function normalizeWebVitalRating(value) {
  const normalizedValue = `${value || ""}`.trim().toLowerCase();

  return ["good", "needs-improvement", "poor"].includes(normalizedValue)
    ? normalizedValue
    : "good";
}

function normalizeWebVitalFormFactor(value, viewport_width) {
  const normalizedValue = `${value || ""}`.trim().toLowerCase();

  if (["desktop", "mobile", "tablet"].includes(normalizedValue)) {
    return normalizedValue;
  }

  if (Number.isFinite(viewport_width)) {
    if (viewport_width < 760) {
      return "mobile";
    }

    if (viewport_width < 1040) {
      return "tablet";
    }
  }

  return "desktop";
}

function normalizeWebVitalPath(value) {
  return normalizePathname(value);
}

function inferLocaleFromPath(pathname) {
  const segments = normalizePathname(pathname).split("/").filter(Boolean);
  const localeSegment = segments[0] || defaultLocale;

  return normalizeLocale(localeSegment);
}

function classifyPublicRoute(pathname) {
  const normalizedPath = normalizePathname(pathname);
  const segments = normalizedPath.split("/").filter(Boolean);

  if (segments.length <= 1) {
    return "home";
  }

  if (segments[1] === "news" && segments.length === 2) {
    return "news";
  }

  if (segments[1] === "news" && segments.length === 3) {
    return "story";
  }

  if (segments[1] === "category" && segments.length === 3) {
    return "category";
  }

  if (segments[1] === "search" && segments.length === 2) {
    return "search";
  }

  return "other";
}

function trimStructuredObject(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : null;
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function buildErrorPayload(error) {
  if (!(error instanceof Error)) {
    return {
      last_error_message: `${error}`,
      errorName: "UnknownError",
    };
  }

  return {
    last_error_message: error.message,
    errorName: error.name,
  };
}

function extractRequestIp(request) {
  return (
    request?.headers?.get?.("x-forwarded-for")?.split(",")[0]?.trim()
    || request?.headers?.get?.("x-real-ip")
    || "unknown"
  );
}

function extractRequestUserAgent(request) {
  return request?.headers?.get?.("user-agent") || null;
}

function buildConsoleLogEntry({
  action,
  entity_id,
  entity_type,
  error,
  level = "info",
  message = null,
  payload = {},
}) {
  return {
    action,
    entity_id: entity_id ? `${entity_id}` : null,
    entity_type: entity_type || "observability",
    level,
    message: message || null,
    occurredAt: new Date().toISOString(),
    ...(error instanceof Error
      ? {
          last_error_message: error.message,
          errorName: error.name,
          errorStack: error.stack || null,
        }
      : error
        ? {
            last_error_message: `${error}`,
            errorName: "UnknownError",
          }
        : {}),
    payload,
  };
}

function safeJsonStringify(value) {
  const seenValues = new WeakSet();

  try {
    return JSON.stringify(value, (_key, nestedValue) => {
      if (nestedValue && typeof nestedValue === "object") {
        if (seenValues.has(nestedValue)) {
          return "[Circular]";
        }

        seenValues.add(nestedValue);
      }

      return nestedValue;
    });
  } catch {
    return JSON.stringify({
      message: "Unable to serialize structured log payload.",
    });
  }
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}
/**
 * Returns a stable hashed analytics value for privacy-preserving NewsPub metrics.
 */

export function hashAnalyticsValue(value, secret = env.auth.session.secret, scope = "analytics") {
  return crypto
    .createHash("sha256")
    .update(`${scope}:${secret}:${normalizeDisplayText(value) || "unknown"}`)
    .digest("hex");
}

/** Writes a structured log entry to the configured console sink. */
export function writeStructuredLog(input) {
  const level = ["error", "info", "warn"].includes(input?.level) ? input.level : "info";
  const entry = buildConsoleLogEntry({
    action: input?.action || "OBSERVABILITY_EVENT",
    entity_id: input?.entity_id,
    entity_type: input?.entity_type,
    error: input?.error,
    level,
    message: input?.message || null,
    payload: input?.payload || {},
  });
  const logger = typeof console[level] === "function" ? console[level] : console.log;

  logger(safeJsonStringify(entry));

  return entry;
}

/** Persists an append-only audit event when the active Prisma delegate is available. */
export async function createAuditEventRecord(input, prisma) {
  const db = await resolvePrismaClient(prisma);

  if (typeof db.auditEvent?.create !== "function") {
    return null;
  }

  return db.auditEvent.create({
    data: {
      action: input.action,
      actor_id: input.actor_id || null,
      entity_id: `${input.entity_id || input.action}`,
      entity_type: input.entity_type || "observability",
      payload_json: input.payload_json || null,
    },
  });
}

/** Records an operational failure or warning in both audit storage and structured logs. */
export async function recordObservabilityEvent(input, prisma) {
  const payload_json = {
    ...((input?.payload && typeof input.payload === "object" && !Array.isArray(input.payload))
      ? input.payload
      : {}),
    ...(input?.message ? { message: input.message } : {}),
    ...(input?.error ? buildErrorPayload(input.error) : {}),
    level: input?.level || "error",
    occurredAt: new Date().toISOString(),
  };

  const auditEvent = await createAuditEventRecord(
    {
      action: input?.action || "OBSERVABILITY_EVENT",
      actor_id: input?.actor_id || null,
      entity_id: input?.entity_id || input?.action || "observability_event",
      entity_type: input?.entity_type || "observability",
      payload_json,
    },
    prisma,
  ).catch(() => null);

  if (input?.writeToConsole !== false) {
    writeStructuredLog({
      action: input?.action || "OBSERVABILITY_EVENT",
      entity_id: input?.entity_id,
      entity_type: input?.entity_type || "observability",
      error: input?.error,
      level: input?.level || "error",
      message: input?.message || null,
      payload: payload_json,
    });
  }

  return {
    auditEvent,
    payload_json,
  };
}

/** Records a privacy-safe public analytics event using hashed request metadata. */
export async function recordViewEvent(input, options = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const clientIp = options.ipAddress || extractRequestIp(options.request);

  return db.viewEvent.create({
    data: {
      event_type: normalizeViewEventType(input?.event_type),
      ip_hash: hashAnalyticsValue(clientIp, env.auth.session.secret, "view-ip"),
      locale: normalizeLocale(input?.locale),
      path: normalizePathname(input?.path),
      post_id: trimToNull(input?.post_id, 191),
      referrer: trimToNull(input?.referrer, 2048),
      user_agent: trimToNull(options.user_agent || extractRequestUserAgent(options.request), 512),
    },
    select: {
      created_at: true,
      event_type: true,
      id: true,
      locale: true,
      path: true,
      post_id: true,
    },
  });
}

/** Records a privacy-conscious Core Web Vitals sample for later aggregation. */
export async function recordWebVitalMetric(input, prisma) {
  if (!env.observability.metricsEnabled) {
    return null;
  }

  const db = await resolvePrismaClient(prisma);

  if (typeof db.webVitalMetric?.create !== "function") {
    return null;
  }

  const path = normalizeWebVitalPath(input?.path);
  const viewport_width = Number.isFinite(input?.viewport_width) ? Math.trunc(input.viewport_width) : null;
  const viewport_height = Number.isFinite(input?.viewport_height) ? Math.trunc(input.viewport_height) : null;

  return db.webVitalMetric.create({
    data: {
      attribution_json: trimStructuredObject(input?.attribution),
      build_id: trimToNull(input?.build_id, 128),
      connection_type: trimToNull(input?.connection_type, 32),
      delta: Number.isFinite(input?.delta) ? input.delta : null,
      form_factor: normalizeWebVitalFormFactor(input?.form_factor, viewport_width),
      label: trimToNull(input?.label, 32),
      locale: inferLocaleFromPath(path),
      metric_id: trimToNull(input?.id, 128) || "unknown",
      name: normalizeWebVitalMetricName(input?.name),
      navigation_type: trimToNull(input?.navigation_type, 32),
      path,
      rating: normalizeWebVitalRating(input?.rating),
      route_group: classifyPublicRoute(path),
      value: Number.isFinite(input?.value) ? input.value : 0,
      viewport_height,
      viewport_width,
    },
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
}
/**
 * Serializes an audit event into the shape expected by NewsPub admin surfaces.
 */

export function serializeAuditEvent(event) {
  return {
    action: event.action,
    actor_id: event.actor_id || null,
    created_at: serializeDate(event.created_at),
    entity_id: event.entity_id,
    entity_type: event.entity_type,
    id: event.id,
    payload: event.payload_json || null,
  };
}
/**
 * Returns whether an audit action should be classified as a failure in NewsPub reporting.
 */

export function isFailureAuditAction(action) {
  return observabilityFailureActionValues.includes(action);
}
/**
 * Returns whether an audit action should be classified as a warning in NewsPub reporting.
 */

export function isWarningAuditAction(action) {
  return observabilityWarningActionValues.includes(action);
}
