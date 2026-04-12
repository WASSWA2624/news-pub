"use strict";

const DEFAULT_INTERVAL_SECONDS = 60;
const DEFAULT_ENDPOINT_PATH = "/api/jobs/scheduled-publishing";
const DEFAULT_HOST = "127.0.0.1";

function parseBooleanFlag(value) {
  return ["1", "true", "yes", "on"].includes(`${value || ""}`.trim().toLowerCase());
}

function parsePositiveInteger(value, fallbackValue) {
  const parsedValue = Number.parseInt(`${value || ""}`, 10);

  return Number.isFinite(parsedValue) && parsedValue > 0 ? parsedValue : fallbackValue;
}

function buildSchedulerUrl() {
  const protocol = `${process.env.INTERNAL_SCHEDULER_PROTOCOL || "http"}`.trim() || "http";
  const host = `${process.env.INTERNAL_SCHEDULER_HOST || process.env.HOSTNAME || DEFAULT_HOST}`.trim() || DEFAULT_HOST;
  const port = `${process.env.PORT || "3000"}`.trim() || "3000";
  const endpointPath = `${process.env.INTERNAL_SCHEDULER_PATH || DEFAULT_ENDPOINT_PATH}`.trim() || DEFAULT_ENDPOINT_PATH;
  const normalizedEndpointPath = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;

  return `${protocol}://${host}:${port}${normalizedEndpointPath}`;
}

function startInternalScheduler({
  fetchImpl = globalThis.fetch?.bind(globalThis),
  logger = console,
} = {}) {
  const enabled = parseBooleanFlag(process.env.INTERNAL_SCHEDULER_ENABLED);

  if (!enabled) {
    return null;
  }

  if (typeof fetchImpl !== "function") {
    logger.warn("[news-pub:scheduler] fetch is unavailable; internal scheduler is disabled.");
    return null;
  }

  if (!`${process.env.CRON_SECRET || ""}`.trim()) {
    logger.warn("[news-pub:scheduler] CRON_SECRET is missing; internal scheduler is disabled.");
    return null;
  }

  const intervalSeconds = parsePositiveInteger(
    process.env.INTERNAL_SCHEDULER_INTERVAL_SECONDS,
    DEFAULT_INTERVAL_SECONDS,
  );
  const schedulerUrl = buildSchedulerUrl();
  let stopped = false;
  let timer = null;
  let runInFlight = false;

  function scheduleNext(delayMs = intervalSeconds * 1000) {
    if (stopped) {
      return;
    }

    timer = setTimeout(runOnce, delayMs);

    if (typeof timer?.unref === "function") {
      timer.unref();
    }
  }

  async function runOnce() {
    if (stopped) {
      return;
    }

    if (runInFlight) {
      scheduleNext();
      return;
    }

    runInFlight = true;

    try {
      const response = await fetchImpl(schedulerUrl, {
        headers: {
          "content-type": "application/json",
          "x-cron-secret": process.env.CRON_SECRET,
        },
        method: "POST",
      });

      if (!response.ok) {
        logger.warn(
          `[news-pub:scheduler] scheduler request failed with status ${response.status} at ${schedulerUrl}.`,
        );
      }
    } catch (error) {
      logger.warn(
        `[news-pub:scheduler] scheduler request failed: ${error instanceof Error ? error.message : error}.`,
      );
    } finally {
      runInFlight = false;
      scheduleNext();
    }
  }

  logger.info(
    `[news-pub:scheduler] enabled; polling ${schedulerUrl} every ${intervalSeconds} seconds.`,
  );
  scheduleNext(Math.min(intervalSeconds, 30) * 1000);

  return {
    stop() {
      stopped = true;

      if (timer) {
        clearTimeout(timer);
      }
    },
  };
}

module.exports = {
  startInternalScheduler,
};
