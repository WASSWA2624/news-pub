import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("error normalization", () => {
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

  it("preserves NewsPub domain error metadata", async () => {
    const { NewsPubError } = await import("@/lib/news/shared");
    const { normalizeAppError } = await import("./index");
    const error = new NewsPubError("Destination token is invalid.", {
      status: "destination_validation_failed",
      statusCode: 400,
    });
    const normalized = normalizeAppError(error);

    expect(normalized).toEqual({
      details: null,
      last_error_code: "destination_validation_failed",
      message: "Destination token is invalid.",
      retryable: false,
      statusCode: 400,
    });
  });

  it("maps provider diagnostics into a safe API payload", async () => {
    const { createApiErrorPayload } = await import("./index");
    const payload = createApiErrorPayload(
      {
        message: "Graph API returned 190.",
        response_json: {
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
