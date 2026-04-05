import crypto from "node:crypto";

import { z } from "zod";

import { defaultLocale, isSupportedLocale } from "@/features/i18n/config";
import { extractRequestIp, extractRequestUserAgent } from "@/lib/comments";
import { env } from "@/lib/env/server";
import { normalizeDisplayText } from "@/lib/normalization";

export const viewEventTypeValues = Object.freeze(["WEBSITE_VIEW", "PAGE_VIEW", "POST_VIEW"]);

export const observabilityFailureActionValues = Object.freeze([
  "GENERATION_JOB_FAILED",
  "MEDIA_LIBRARY_FAILURE",
  "POST_PUBLISH_REVALIDATION_FAILED",
  "POST_SCHEDULED_PUBLISH_FAILED",
  "SEO_FAILURE",
  "SOURCE_FETCH_ERROR",
]);

export const observabilityWarningActionValues = Object.freeze(["GENERATION_JOB_WARNING"]);

export const captureViewEventSchema = z.object({
  eventType: z.enum(viewEventTypeValues),
  locale: z.string().trim().min(1),
  path: z.string().trim().min(1).max(2048),
  postId: z.string().trim().min(1).optional(),
  referrer: z.string().trim().max(2048).optional(),
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

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function buildErrorPayload(error) {
  if (!(error instanceof Error)) {
    return {
      errorMessage: `${error}`,
      errorName: "UnknownError",
    };
  }

  return {
    errorMessage: error.message,
    errorName: error.name,
  };
}

function buildConsoleLogEntry({
  action,
  entityId,
  entityType,
  error,
  level = "info",
  message = null,
  payload = {},
}) {
  return {
    action,
    entityId: entityId ? `${entityId}` : null,
    entityType: entityType || "observability",
    level,
    message: message || null,
    occurredAt: new Date().toISOString(),
    ...(error instanceof Error
      ? {
          errorMessage: error.message,
          errorName: error.name,
          errorStack: error.stack || null,
        }
      : error
        ? {
            errorMessage: `${error}`,
            errorName: "UnknownError",
          }
        : {}),
    payload,
  };
}

function safeJsonStringify(value) {
  const seenValues = new WeakSet();

  try {
    return JSON.stringify(value, (key, nestedValue) => {
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

export function hashAnalyticsValue(value, secret = env.auth.session.secret, scope = "analytics") {
  return crypto
    .createHash("sha256")
    .update(`${scope}:${secret}:${normalizeDisplayText(value) || "unknown"}`)
    .digest("hex");
}

export function writeStructuredLog(input) {
  const level = ["error", "info", "warn"].includes(input?.level) ? input.level : "info";
  const entry = buildConsoleLogEntry({
    action: input?.action || "OBSERVABILITY_EVENT",
    entityId: input?.entityId,
    entityType: input?.entityType,
    error: input?.error,
    level,
    message: input?.message || null,
    payload: input?.payload || {},
  });
  const logger = typeof console[level] === "function" ? console[level] : console.log;

  logger(safeJsonStringify(entry));

  return entry;
}

export async function createAuditEventRecord(input, prisma) {
  const db = await resolvePrismaClient(prisma);

  if (typeof db.auditEvent?.create !== "function") {
    return null;
  }

  return db.auditEvent.create({
    data: {
      action: input.action,
      actorId: input.actorId || null,
      entityId: `${input.entityId || input.action}`,
      entityType: input.entityType || "observability",
      payloadJson: input.payloadJson || null,
    },
  });
}

export async function recordObservabilityEvent(input, prisma) {
  const payloadJson = {
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
      actorId: input?.actorId || null,
      entityId: input?.entityId || input?.action || "observability_event",
      entityType: input?.entityType || "observability",
      payloadJson,
    },
    prisma,
  ).catch(() => null);

  if (input?.writeToConsole !== false) {
    writeStructuredLog({
      action: input?.action || "OBSERVABILITY_EVENT",
      entityId: input?.entityId,
      entityType: input?.entityType || "observability",
      error: input?.error,
      level: input?.level || "error",
      message: input?.message || null,
      payload: payloadJson,
    });
  }

  return {
    auditEvent,
    payloadJson,
  };
}

export async function recordViewEvent(input, options = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const clientIp = options.ipAddress || extractRequestIp(options.request);

  return db.viewEvent.create({
    data: {
      eventType: normalizeViewEventType(input?.eventType),
      ipHash: hashAnalyticsValue(clientIp, env.auth.session.secret, "view-ip"),
      locale: normalizeLocale(input?.locale),
      path: normalizePathname(input?.path),
      postId: trimToNull(input?.postId, 191),
      referrer: trimToNull(input?.referrer, 2048),
      userAgent: trimToNull(options.userAgent || extractRequestUserAgent(options.request), 512),
    },
    select: {
      createdAt: true,
      eventType: true,
      id: true,
      locale: true,
      path: true,
      postId: true,
    },
  });
}

export function serializeAuditEvent(event) {
  return {
    action: event.action,
    actorId: event.actorId || null,
    createdAt: serializeDate(event.createdAt),
    entityId: event.entityId,
    entityType: event.entityType,
    id: event.id,
    payload: event.payloadJson || null,
  };
}

export function isFailureAuditAction(action) {
  return observabilityFailureActionValues.includes(action);
}

export function isWarningAuditAction(action) {
  return observabilityWarningActionValues.includes(action);
}
