/**
 * Bounded outbound fetch helpers for provider and destination integrations.
 */

const defaultOutboundFetchTimeoutMs = 10000;
const defaultOutboundFetchRetryCount = 2;
const defaultRetryDelayMs = 250;
const defaultRetryJitterRatio = 0.2;
const defaultMaxRetryDelayMs = 15000;

function normalizePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value || ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function waitForRetry(delayMs) {
  return new Promise((resolve) => {
    setTimeout(resolve, delayMs);
  });
}

function createBoundedSignal(timeoutMs, upstreamSignal) {
  const controller = new AbortController();
  const timeout = setTimeout(() => {
    controller.abort(new Error(`Outbound fetch exceeded ${timeoutMs}ms.`));
  }, timeoutMs);
  const abortFromUpstream = () => {
    controller.abort(upstreamSignal?.reason || new Error("Outbound fetch was aborted."));
  };

  if (upstreamSignal) {
    if (upstreamSignal.aborted) {
      abortFromUpstream();
    } else {
      upstreamSignal.addEventListener("abort", abortFromUpstream, { once: true });
    }
  }

  return {
    signal: controller.signal,
    cleanup() {
      clearTimeout(timeout);
      upstreamSignal?.removeEventListener?.("abort", abortFromUpstream);
    },
  };
}

function isRetryableResponse(response) {
  return response?.status === 408 || response?.status === 429 || response?.status >= 500;
}

function isRetryableFetchError(error) {
  return (
    error?.name === "AbortError" ||
    error?.name === "TimeoutError" ||
    error instanceof TypeError ||
    /aborted|network|timeout|timed out/i.test(`${error?.message || ""}`)
  );
}

function parseRetryAfterDelayMs(response) {
  const retryAfterValue = response?.headers?.get?.("retry-after");

  if (!retryAfterValue) {
    return null;
  }

  const retryAfterSeconds = Number.parseInt(retryAfterValue, 10);

  if (Number.isFinite(retryAfterSeconds) && retryAfterSeconds >= 0) {
    return retryAfterSeconds * 1000;
  }

  const retryAt = new Date(retryAfterValue);

  if (Number.isNaN(retryAt.getTime())) {
    return null;
  }

  return Math.max(0, retryAt.getTime() - Date.now());
}

function applyRetryJitter(delayMs, jitterRatio) {
  const normalizedDelayMs = Math.max(0, delayMs);
  const normalizedJitterRatio = Math.max(0, Number(jitterRatio) || 0);

  if (!normalizedDelayMs || !normalizedJitterRatio) {
    return normalizedDelayMs;
  }

  const maxJitterMs = Math.round(normalizedDelayMs * normalizedJitterRatio);
  const jitterMs = Math.round(Math.random() * maxJitterMs);

  return normalizedDelayMs + jitterMs;
}

function resolveRetryDelayMs({
  attempt,
  maxRetryDelayMs,
  response = null,
  retryDelayMs,
  retryJitterRatio,
}) {
  const retryAfterDelayMs = parseRetryAfterDelayMs(response);

  if (Number.isFinite(retryAfterDelayMs) && retryAfterDelayMs >= 0) {
    return Math.min(retryAfterDelayMs, maxRetryDelayMs);
  }

  return Math.min(
    applyRetryJitter(retryDelayMs * 2 ** attempt, retryJitterRatio),
    maxRetryDelayMs,
  );
}

async function cancelResponseBody(response) {
  try {
    await response?.body?.cancel?.();
  } catch {
    // Best effort: failed body cancellation should not hide the real upstream error.
  }
}

/**
 * Executes a fetch with an explicit timeout and bounded retry policy.
 */
export async function fetchWithTimeoutAndRetry(
  input,
  init = {},
  {
    maxRetryDelayMs = normalizePositiveInteger(
      process.env.OUTBOUND_FETCH_MAX_RETRY_DELAY_MS,
      defaultMaxRetryDelayMs,
    ),
    onRetry = null,
    retryDelayMs = defaultRetryDelayMs,
    retryJitterRatio = defaultRetryJitterRatio,
    retries = normalizePositiveInteger(process.env.OUTBOUND_FETCH_RETRY_COUNT, defaultOutboundFetchRetryCount),
    shouldRetryError = isRetryableFetchError,
    shouldRetryResponse = isRetryableResponse,
    timeoutMs = normalizePositiveInteger(process.env.OUTBOUND_FETCH_TIMEOUT_MS, defaultOutboundFetchTimeoutMs),
  } = {},
) {
  let attempt = 0;

  while (true) {
    const boundedSignal = createBoundedSignal(timeoutMs, init.signal);

    try {
      const response = await fetch(input, {
        ...init,
        signal: boundedSignal.signal,
      });

      if (!shouldRetryResponse(response) || attempt >= retries) {
        return response;
      }

      await cancelResponseBody(response);
      const delayMs = resolveRetryDelayMs({
        attempt,
        maxRetryDelayMs,
        response,
        retryDelayMs,
        retryJitterRatio,
      });

      await Promise.resolve(
        onRetry?.({
          attempt: attempt + 1,
          delayMs,
          kind: "response",
          status: response.status,
          url: `${input}`,
        }),
      );
      await waitForRetry(delayMs);
    } catch (error) {
      if (attempt >= retries || !shouldRetryError(error)) {
        throw error;
      }

      const delayMs = resolveRetryDelayMs({
        attempt,
        maxRetryDelayMs,
        retryDelayMs,
        retryJitterRatio,
      });

      await Promise.resolve(
        onRetry?.({
          attempt: attempt + 1,
          delayMs,
          errorMessage: error instanceof Error ? error.message : `${error}`,
          kind: "error",
          status: null,
          url: `${input}`,
        }),
      );
      await waitForRetry(delayMs);
    } finally {
      boundedSignal.cleanup();
    }

    attempt += 1;
  }
}
