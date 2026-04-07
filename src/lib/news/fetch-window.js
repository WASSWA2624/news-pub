/**
 * Normalized fetch-window helpers for NewsPub stream execution.
 *
 * The workflow layer resolves one per-stream window for local filtering and
 * checkpoint decisions, then shared-fetch groups widen those windows into one
 * upstream provider request envelope when that is safe.
 */

const DEFAULT_FETCH_WINDOW_HOURS = 24;

function normalizeDateBoundary(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsedValue = new Date(value);

    if (!Number.isNaN(parsedValue.getTime())) {
      return parsedValue;
    }
  }

  return null;
}

/**
 * Serializes a resolved fetch window into audit-safe JSON values.
 *
 * @param {object|null} fetchWindow - The normalized fetch window.
 * @returns {object|null} Serialized window details or null.
 */
export function serializeFetchWindow(fetchWindow) {
  if (!fetchWindow?.start || !fetchWindow?.end) {
    return null;
  }

  return {
    end: fetchWindow.end.toISOString(),
    source: fetchWindow.source || "default",
    start: fetchWindow.start.toISOString(),
    usesExplicitBoundaries: Boolean(fetchWindow.usesExplicitBoundaries),
    usesProviderCheckpoint: Boolean(fetchWindow.usesProviderCheckpoint),
    writeCheckpointOnSuccess: Boolean(fetchWindow.writeCheckpointOnSuccess),
  };
}

/**
 * Resolves the normalized NewsPub fetch window for one stream execution.
 *
 * Automatic runs reuse the previous successful checkpoint where possible.
 * Explicit windows keep their boundaries but do not advance the checkpoint
 * unless the caller opts in.
 *
 * @param {object} [options] - Window resolution inputs.
 * @param {object|null} [options.checkpoint] - Provider checkpoint record.
 * @param {number} [options.defaultWindowHours] - Fallback lookback horizon.
 * @param {Date} [options.now] - Current execution time.
 * @param {object|null} [options.requestedWindow] - Optional explicit window.
 * @param {boolean|null} [options.writeCheckpointOnSuccess] - Explicit checkpoint write override.
 * @returns {object} The normalized fetch window contract.
 */
export function resolveExecutionFetchWindow({
  checkpoint = null,
  defaultWindowHours = DEFAULT_FETCH_WINDOW_HOURS,
  now = new Date(),
  requestedWindow = null,
  writeCheckpointOnSuccess = null,
} = {}) {
  const resolvedNow = normalizeDateBoundary(now) || new Date();
  const explicitStart = normalizeDateBoundary(requestedWindow?.start);
  const explicitEnd = normalizeDateBoundary(requestedWindow?.end);
  const checkpointStart = normalizeDateBoundary(checkpoint?.lastSuccessfulFetchAt);
  const fallbackStart = new Date(
    resolvedNow.getTime() - Math.max(1, defaultWindowHours) * 60 * 60 * 1000,
  );
  const usesExplicitBoundaries = Boolean(explicitStart || explicitEnd);
  const end = explicitEnd || resolvedNow;
  const start = explicitStart || checkpointStart || fallbackStart;
  const usesProviderCheckpoint = !explicitStart && Boolean(checkpointStart);

  if (start > end) {
    throw new Error("fetch_window_start_after_end");
  }

  return {
    end,
    source: usesExplicitBoundaries
      ? "explicit"
      : usesProviderCheckpoint
        ? "checkpoint"
        : "default",
    start,
    usesExplicitBoundaries,
    usesProviderCheckpoint,
    writeCheckpointOnSuccess:
      typeof writeCheckpointOnSuccess === "boolean"
        ? writeCheckpointOnSuccess
        : !usesExplicitBoundaries,
  };
}

/**
 * Merges several normalized windows into one upstream-safe shared envelope.
 *
 * @param {Array<object>} windows - Per-stream normalized windows.
 * @returns {object|null} The widened fetch window or null when no windows exist.
 */
export function mergeExecutionFetchWindows(windows = []) {
  const normalizedWindows = windows.filter((window) => window?.start && window?.end);

  if (!normalizedWindows.length) {
    return null;
  }

  return {
    end: normalizedWindows.reduce(
      (latest, window) => (window.end > latest ? window.end : latest),
      normalizedWindows[0].end,
    ),
    source: normalizedWindows.some((window) => window.usesExplicitBoundaries)
      ? "merged_explicit"
      : normalizedWindows.some((window) => window.usesProviderCheckpoint)
        ? "merged_checkpoint"
        : "merged_default",
    start: normalizedWindows.reduce(
      (earliest, window) => (window.start < earliest ? window.start : earliest),
      normalizedWindows[0].start,
    ),
    usesExplicitBoundaries: normalizedWindows.some((window) => window.usesExplicitBoundaries),
    usesProviderCheckpoint: normalizedWindows.some((window) => window.usesProviderCheckpoint),
    writeCheckpointOnSuccess: normalizedWindows.every((window) => window.writeCheckpointOnSuccess),
  };
}

/**
 * Checks whether a normalized article timestamp falls inside the target window.
 *
 * When providers omit a trustworthy publish timestamp, NewsPub keeps the item in
 * play so shared fetches do not underfetch valid downstream matches.
 *
 * @param {object} article - Normalized provider article.
 * @param {object|null} fetchWindow - Normalized fetch window.
 * @returns {boolean} True when the article should remain eligible by window.
 */
export function isArticleInsideFetchWindow(article, fetchWindow) {
  if (!fetchWindow?.start || !fetchWindow?.end) {
    return true;
  }

  const articlePublishedAt = normalizeDateBoundary(article?.publishedAt);

  if (!articlePublishedAt) {
    return true;
  }

  return articlePublishedAt >= fetchWindow.start && articlePublishedAt <= fetchWindow.end;
}

