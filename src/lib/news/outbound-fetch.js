/**
 * Bounded outbound fetch helpers for provider and destination integrations.
 */

const defaultOutboundFetchTimeoutMs = 10000;
const defaultOutboundFetchRetryCount = 2;
const defaultRetryDelayMs = 250;

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
    retryDelayMs = defaultRetryDelayMs,
    retries = normalizePositiveInteger(process.env.OUTBOUND_FETCH_RETRY_COUNT, defaultOutboundFetchRetryCount),
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

      if (!isRetryableResponse(response) || attempt >= retries) {
        return response;
      }

      await cancelResponseBody(response);
    } catch (error) {
      if (attempt >= retries || !isRetryableFetchError(error)) {
        throw error;
      }
    } finally {
      boundedSignal.cleanup();
    }

    await waitForRetry(retryDelayMs * 2 ** attempt);
    attempt += 1;
  }
}
