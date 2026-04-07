import { describe, expect, it } from "vitest";

import { NewsPubError } from "@/lib/news/shared";

import { createApiErrorPayload, normalizeAppError } from "./index";

describe("error normalization", () => {
  it("preserves NewsPub domain error metadata", () => {
    const error = new NewsPubError("Destination token is invalid.", {
      status: "destination_validation_failed",
      statusCode: 400,
    });
    const normalized = normalizeAppError(error);

    expect(normalized).toEqual({
      details: null,
      errorCode: "destination_validation_failed",
      message: "Destination token is invalid.",
      retryable: false,
      statusCode: 400,
    });
  });

  it("maps provider diagnostics into a safe API payload", () => {
    const payload = createApiErrorPayload(
      {
        message: "Graph API returned 190.",
        responseJson: {
          error: "meta_auth_invalid",
          retryable: true,
        },
        statusCode: 502,
      },
      "Unable to publish the story.",
    );

    expect(payload).toEqual({
      body: {
        details: {
          error: "meta_auth_invalid",
          retryable: true,
        },
        message: "Graph API returned 190.",
        retryable: true,
        status: "meta_auth_invalid",
        success: false,
      },
      statusCode: 502,
    });
  });
});
