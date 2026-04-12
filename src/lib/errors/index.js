/**
 * Standard NewsPub API and workflow error helpers with consistent operator-safe responses.
 */

import { NextResponse } from "next/server";

import { NewsPubError } from "@/lib/news/shared";

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

/**
 * Normalizes domain, validation, and unexpected errors into one safe shape for
 * API and server-action responses.
 */
export function normalizeAppError(error, fallbackMessage = "A NewsPub error occurred.") {
  if (error instanceof NewsPubError) {
    return {
      details: null,
      last_error_code: trimText(error.status) || "news_pub_error",
      message: trimText(error.message) || fallbackMessage,
      retryable: false,
      statusCode: error.statusCode || 500,
    };
  }

  const response_json =
    error && typeof error === "object" && !Array.isArray(error) && error.response_json
      ? error.response_json
      : null;
  const last_error_code =
    trimText(error?.status)
    || trimText(error?.last_error_code)
    || trimText(response_json?.error)
    || "internal_error";

  return {
    details: response_json || null,
    last_error_code,
    message: trimText(error?.message) || fallbackMessage,
    retryable: Boolean(error?.retryable || response_json?.retryable),
    statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : 500,
  };
}
/**
 * Creates the standard API error payload returned by NewsPub routes.
 */

export function createApiErrorPayload(error, fallbackMessage) {
  const normalizedError = normalizeAppError(error, fallbackMessage);

  return {
    body: {
      details: normalizedError.details,
      message: normalizedError.message,
      retryable: normalizedError.retryable,
      status: normalizedError.last_error_code,
      success: false,
    },
    statusCode: normalizedError.statusCode,
  };
}
/**
 * Creates the standard API error response returned by NewsPub routes.
 */

export function createApiErrorResponse(error, fallbackMessage) {
  const payload = createApiErrorPayload(error, fallbackMessage);

  return NextResponse.json(payload.body, { status: payload.statusCode });
}
