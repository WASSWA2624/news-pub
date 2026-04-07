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
      errorCode: trimText(error.status) || "news_pub_error",
      message: trimText(error.message) || fallbackMessage,
      retryable: false,
      statusCode: error.statusCode || 500,
    };
  }

  const responseJson =
    error && typeof error === "object" && !Array.isArray(error) && error.responseJson
      ? error.responseJson
      : null;
  const errorCode =
    trimText(error?.status)
    || trimText(error?.errorCode)
    || trimText(responseJson?.error)
    || "internal_error";

  return {
    details: responseJson || null,
    errorCode,
    message: trimText(error?.message) || fallbackMessage,
    retryable: Boolean(error?.retryable || responseJson?.retryable),
    statusCode: Number.isInteger(error?.statusCode) ? error.statusCode : 500,
  };
}

export function createApiErrorPayload(error, fallbackMessage) {
  const normalizedError = normalizeAppError(error, fallbackMessage);

  return {
    body: {
      details: normalizedError.details,
      message: normalizedError.message,
      retryable: normalizedError.retryable,
      status: normalizedError.errorCode,
      success: false,
    },
    statusCode: normalizedError.statusCode,
  };
}

export function createApiErrorResponse(error, fallbackMessage) {
  const payload = createApiErrorPayload(error, fallbackMessage);

  return NextResponse.json(payload.body, { status: payload.statusCode });
}
