import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { fetchWithTimeoutAndRetry } from "./outbound-fetch";

function createResponse(status, { retryAfter = null } = {}) {
  return {
    body: {
      cancel: vi.fn().mockResolvedValue(undefined),
    },
    headers: {
      get: vi.fn((name) => (name?.toLowerCase?.() === "retry-after" ? retryAfter : null)),
    },
    status,
  };
}

describe("outbound fetch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn());
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  it("retries throttled responses using Retry-After seconds", async () => {
    const throttledResponse = createResponse(429, {
      retryAfter: "2",
    });
    const successResponse = createResponse(200);
    const onRetry = vi.fn();

    fetch.mockResolvedValueOnce(throttledResponse).mockResolvedValueOnce(successResponse);

    const responsePromise = fetchWithTimeoutAndRetry(
      "https://example.com/provider",
      {},
      {
        onRetry,
        retries: 1,
        retryDelayMs: 50,
        timeoutMs: 1000,
      },
    );

    await vi.advanceTimersByTimeAsync(2000);
    const response = await responsePromise;

    expect(response).toBe(successResponse);
    expect(throttledResponse.body.cancel).toHaveBeenCalledTimes(1);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        delayMs: 2000,
        kind: "response",
        status: 429,
        url: "https://example.com/provider",
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("retries throttled responses using Retry-After HTTP dates", async () => {
    vi.setSystemTime(new Date("2026-04-05T12:00:00.000Z"));

    const throttledResponse = createResponse(429, {
      retryAfter: new Date("2026-04-05T12:00:03.000Z").toUTCString(),
    });
    const successResponse = createResponse(200);
    const onRetry = vi.fn();

    fetch.mockResolvedValueOnce(throttledResponse).mockResolvedValueOnce(successResponse);

    const responsePromise = fetchWithTimeoutAndRetry(
      "https://example.com/provider",
      {},
      {
        onRetry,
        retries: 1,
        retryDelayMs: 50,
        timeoutMs: 1000,
      },
    );

    await vi.advanceTimersByTimeAsync(3000);
    const response = await responsePromise;

    expect(response).toBe(successResponse);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        delayMs: 3000,
        kind: "response",
        status: 429,
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("adds jitter to retryable network errors", async () => {
    vi.spyOn(Math, "random").mockReturnValue(0.5);
    const successResponse = createResponse(200);
    const onRetry = vi.fn();

    fetch
      .mockRejectedValueOnce(new TypeError("Network request failed"))
      .mockResolvedValueOnce(successResponse);

    const responsePromise = fetchWithTimeoutAndRetry(
      "https://example.com/provider",
      {},
      {
        onRetry,
        retries: 1,
        retryDelayMs: 100,
        retryJitterRatio: 0.5,
        timeoutMs: 1000,
      },
    );

    await vi.advanceTimersByTimeAsync(125);
    const response = await responsePromise;

    expect(response).toBe(successResponse);
    expect(onRetry).toHaveBeenCalledWith(
      expect.objectContaining({
        attempt: 1,
        delayMs: 125,
        last_error_message: "Network request failed",
        kind: "error",
        status: null,
      }),
    );
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("stops after the configured retry count for retryable errors", async () => {
    fetch.mockRejectedValue(new TypeError("network down"));

    const responsePromise = fetchWithTimeoutAndRetry(
      "https://example.com/provider",
      {},
      {
        retries: 1,
        retryDelayMs: 100,
        retryJitterRatio: 0,
        timeoutMs: 1000,
      },
    );
    const rejection = expect(responsePromise).rejects.toThrow("network down");

    await vi.advanceTimersByTimeAsync(100);
    await rejection;
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it("does not retry non-retryable 4xx responses", async () => {
    const response = createResponse(404);

    fetch.mockResolvedValueOnce(response);

    await expect(
      fetchWithTimeoutAndRetry(
        "https://example.com/provider",
        {},
        {
          retries: 2,
          retryDelayMs: 100,
          timeoutMs: 1000,
        },
      ),
    ).resolves.toBe(response);

    expect(fetch).toHaveBeenCalledTimes(1);
    expect(response.body.cancel).not.toHaveBeenCalled();
  });
});
