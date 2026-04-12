/**
 * Normalized fetch-window helpers for NewsPub stream execution.
 *
 * The workflow layer resolves one per-stream window for local filtering and
 * checkpoint decisions, then shared-fetch groups widen those windows into one
 * upstream provider request envelope when that is safe.
 */

export const DEFAULT_FETCH_WINDOW_HOURS = 24;
export const DEFAULT_FETCH_WINDOW_FORWARD_MINUTES = 30;

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

function padDateSegment(value) {
  return `${value}`.padStart(2, "0");
}

function formatLocalDateBoundary(value, precision = "datetime") {
  const normalizedValue = normalizeDateBoundary(value);

  if (!normalizedValue) {
    return "";
  }

  const year = normalizedValue.getFullYear();
  const month = padDateSegment(normalizedValue.getMonth() + 1);
  const day = padDateSegment(normalizedValue.getDate());

  if (precision === "date") {
    return `${year}-${month}-${day}`;
  }

  const hours = padDateSegment(normalizedValue.getHours());
  const minutes = padDateSegment(normalizedValue.getMinutes());

  return `${year}-${month}-${day}T${hours}:${minutes}`;
}

/**
 * Creates the default operator-visible NewsPub window of the previous
 * 24 hours through the next 30 minutes from the supplied execution time.
 *
 * The lookback and the forward buffer both anchor to "now" so the default
 * window truly spans "previous 24 hours" plus a small future-safe cushion
 * instead of shrinking the lookback when the end boundary moves forward.
 *
 * @param {object} [options] - Preview window options.
 * @param {number} [options.defaultWindowHours] - Preview lookback horizon.
 * @param {number} [options.forwardBufferMinutes] - Preview forward buffer.
 * @param {Date|string|number} [options.now] - Current time reference.
 * @returns {object} Preview window boundaries plus the resolved duration.
 */
export function createDefaultFetchWindowPreview({
  defaultWindowHours = DEFAULT_FETCH_WINDOW_HOURS,
  forwardBufferMinutes = DEFAULT_FETCH_WINDOW_FORWARD_MINUTES,
  now = new Date(),
} = {}) {
  const resolvedNow = normalizeDateBoundary(now) || new Date();
  const resolvedWindowHours = Math.max(1, Number(defaultWindowHours) || DEFAULT_FETCH_WINDOW_HOURS);
  const resolvedForwardBufferMinutes = Math.max(
    0,
    Number(forwardBufferMinutes) || DEFAULT_FETCH_WINDOW_FORWARD_MINUTES,
  );

  return {
    defaultWindowForwardMinutes: resolvedForwardBufferMinutes,
    defaultWindowHours: resolvedWindowHours,
    end: new Date(resolvedNow.getTime() + resolvedForwardBufferMinutes * 60 * 1000),
    start: new Date(resolvedNow.getTime() - resolvedWindowHours * 60 * 60 * 1000),
  };
}

/**
 * Formats a fetch-window boundary for HTML date or datetime-local inputs.
 *
 * @param {Date|string|number|null} value - Boundary value to format.
 * @param {"date"|"datetime"} [precision="datetime"] - Input precision to target.
 * @returns {string} Input-safe local value or an empty string.
 */
export function formatFetchWindowInputValue(value, precision = "datetime") {
  return formatLocalDateBoundary(value, precision);
}

/**
 * Parses an HTML date or datetime-local input value into a `Date`.
 *
 * @param {string|Date|number|null} value - Raw boundary value.
 * @returns {Date|null} Parsed date or null when the value is empty or invalid.
 */
export function parseFetchWindowInputValue(value) {
  return normalizeDateBoundary(value);
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
 * The default end boundary still keeps the extra 30-minute forward buffer so
 * very recent provider items are less likely to be missed during indexing or
 * processing delays. Explicit windows keep their boundaries but do not advance
 * the checkpoint unless the caller opts in.
 *
 * @param {object} [options] - Window resolution inputs.
 * @param {object|null} [options.checkpoint] - Provider checkpoint record.
 * @param {number} [options.defaultWindowHours] - Fallback lookback horizon.
 * @param {number} [options.forwardBufferMinutes] - Default end-boundary buffer.
 * @param {Date} [options.now] - Current execution time.
 * @param {object|null} [options.requestedWindow] - Optional explicit window.
 * @param {boolean|null} [options.writeCheckpointOnSuccess] - Explicit checkpoint write override.
 * @returns {object} The normalized fetch window contract.
 */
export function resolveExecutionFetchWindow({
  checkpoint = null,
  defaultWindowHours = DEFAULT_FETCH_WINDOW_HOURS,
  forwardBufferMinutes = DEFAULT_FETCH_WINDOW_FORWARD_MINUTES,
  now = new Date(),
  requestedWindow = null,
  writeCheckpointOnSuccess = null,
} = {}) {
  const resolvedNow = normalizeDateBoundary(now) || new Date();
  const explicitStart = normalizeDateBoundary(requestedWindow?.start);
  const explicitEnd = normalizeDateBoundary(requestedWindow?.end);
  const checkpointStart = normalizeDateBoundary(checkpoint?.last_successful_fetch_at);
  const fallbackStart = new Date(
    resolvedNow.getTime() - Math.max(1, defaultWindowHours) * 60 * 60 * 1000,
  );
  const defaultEnd = new Date(
    resolvedNow.getTime()
      + Math.max(0, Number(forwardBufferMinutes) || DEFAULT_FETCH_WINDOW_FORWARD_MINUTES) * 60 * 1000,
  );
  const usesExplicitBoundaries = Boolean(explicitStart || explicitEnd);
  const end = explicitEnd || defaultEnd;
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

  const articlePublishedAt = normalizeDateBoundary(article?.published_at);

  if (!articlePublishedAt) {
    return true;
  }

  return articlePublishedAt >= fetchWindow.start && articlePublishedAt <= fetchWindow.end;
}
