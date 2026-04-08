/**
 * Helpers that prepare manual-run windows and provider capability messaging for the NewsPub stream workspace.
 */

import {
  DEFAULT_FETCH_WINDOW_FORWARD_MINUTES,
  DEFAULT_FETCH_WINDOW_HOURS,
  createDefaultFetchWindowPreview,
  formatFetchWindowInputValue,
  parseFetchWindowInputValue,
} from "@/lib/news/fetch-window";
import {
  getProviderTimeBoundarySupport,
  resolveStreamProviderRequestValues,
} from "@/lib/news/provider-definitions";

/**
 * Shared presentation and payload helpers for the admin stream-management
 * workspace, including explicit manual-window defaults and provider guidance.
 */

function getTone(status) {
  return status === "ACTIVE" ? "success" : "warning";
}

function getDestinationPlatformIcon(platform) {
  if (platform === "FACEBOOK") {
    return "facebook";
  }

  if (platform === "INSTAGRAM") {
    return "instagram";
  }

  return "globe";
}

function getStreamDeleteDescription(stream) {
  return `This will permanently remove ${stream.name} and also delete its fetch checkpoints, fetch history, article matches, publish attempts, and category assignments.`;
}

function getRunProgress(streamCount, completedCount, isRunning) {
  if (!streamCount) {
    return 0;
  }

  if (!isRunning) {
    return 100;
  }

  return Math.min(((completedCount + 0.45) / streamCount) * 100, 96);
}

function summarizeRunCounts(results) {
  return results.reduce(
    (summary, result) => {
      if (!result.run) {
        summary.failedRuns += 1;
        return summary;
      }

      summary.completedRuns += 1;
      summary.fetchedCount += Number(result.run.fetchedCount || 0);
      summary.publishedCount += Number(result.run.publishedCount || 0);
      summary.heldCount += Number(result.run.heldCount || 0);
      summary.skippedCount += Number(result.run.skippedCount || 0);
      summary.duplicateCount += Number(result.run.duplicateCount || 0);
      summary.failedPublishCount += Number(result.run.failedCount || 0);

      return summary;
    },
    {
      completedRuns: 0,
      duplicateCount: 0,
      failedPublishCount: 0,
      failedRuns: 0,
      fetchedCount: 0,
      heldCount: 0,
      publishedCount: 0,
      skippedCount: 0,
    },
  );
}

function describeCompletedRun(run) {
  const fragments = [];
  const executionDetails = run?.executionDetailsJson || run?.executionDetails || null;

  if (executionDetails?.executionMode === "shared_batch" && Number(executionDetails.groupSize || 0) > 1) {
    fragments.push(`shared fetch across ${executionDetails.groupSize} streams`);
  }

  if (Number(run.fetchedCount || 0) > 0) {
    fragments.push(`${run.fetchedCount} fetched`);
  }

  if (Number(run.publishedCount || 0) > 0) {
    fragments.push(`${run.publishedCount} published`);
  }

  if (Number(run.heldCount || 0) > 0) {
    fragments.push(`${run.heldCount} held for review`);
  }

  if (Number(run.skippedCount || 0) > 0) {
    fragments.push(`${run.skippedCount} skipped`);
  }

  if (Number(run.duplicateCount || 0) > 0) {
    fragments.push(`${run.duplicateCount} duplicates`);
  }

  if (Number(run.failedCount || 0) > 0) {
    fragments.push(`${run.failedCount} publish failures`);
  }

  if (!fragments.length) {
    return "No new articles were processed during this run.";
  }

  return fragments.join(", ");
}

function getResultTone(result, activeStreamId) {
  if (result.error) {
    return "failed";
  }

  if (result.stream.id === activeStreamId) {
    return "running";
  }

  if (result.run) {
    return "success";
  }

  return "idle";
}

function getResultLabel(result, activeStreamId) {
  if (result.error) {
    return "Failed";
  }

  if (result.stream.id === activeStreamId) {
    return "Running";
  }

  if (result.run) {
    return "Done";
  }

  return "Queued";
}

function formatProviderEndpointLabel(endpoint = "default") {
  return `${endpoint || "default"}`
    .split(/[-_\s]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function buildCapabilityBadge(timeBoundarySupport) {
  if (timeBoundarySupport?.mode === "direct" && timeBoundarySupport?.precision === "date") {
    return "Direct date bounds";
  }

  if (timeBoundarySupport?.mode === "direct") {
    return "Direct datetime bounds";
  }

  if (timeBoundarySupport?.mode === "relative") {
    return "Relative lookback";
  }

  return "Local-only bounds";
}

function buildCapabilityDescription(timeBoundarySupport) {
  const defaultWindowLabel = `the previous ${DEFAULT_FETCH_WINDOW_HOURS} hours through the next ${DEFAULT_FETCH_WINDOW_FORWARD_MINUTES} minutes from now`;
  const forwardBufferClause =
    "The extra forward buffer helps NewsPub avoid missing the newest stories while providers finish indexing and the app completes API and processing work.";

  if (timeBoundarySupport?.mode === "direct" && timeBoundarySupport?.precision === "date") {
    return `${timeBoundarySupport.summary} NewsPub pre-fills ${defaultWindowLabel}, sends the nearest supported start and end dates upstream, and keeps the exact operator-visible buffer in local filtering. ${forwardBufferClause}`;
  }

  if (timeBoundarySupport?.mode === "direct") {
    return `${timeBoundarySupport.summary} NewsPub pre-fills ${defaultWindowLabel}, sends explicit start and end datetimes upstream, and keeps the exact operator-visible buffer in local filtering. ${forwardBufferClause}`;
  }

  if (timeBoundarySupport?.mode === "relative") {
    return `${timeBoundarySupport.summary} NewsPub still shows ${defaultWindowLabel}, maps it to the broadest supported relative lookback upstream, and then keeps exact local filtering active. ${forwardBufferClause}`;
  }

  return `${timeBoundarySupport?.summary || "This endpoint relies on local filtering."} NewsPub still defaults manual runs to ${defaultWindowLabel}, applies the exact boundary locally after fetching, and uses the forward buffer to protect against late-arriving provider items.`;
}

function buildProviderRequestValues(stream = {}) {
  return resolveStreamProviderRequestValues(stream?.activeProvider?.providerKey, {
    countryAllowlistJson: stream?.countryAllowlistJson,
    languageAllowlistJson: stream?.languageAllowlistJson,
    locale: stream?.locale,
    providerDefaults: stream?.activeProvider?.requestDefaultsJson,
    providerFilters: stream?.settingsJson?.providerFilters || {},
  });
}

/**
 * Builds the default manual-run state for the normalized NewsPub fetch-window
 * contract.
 *
 * @param {Date|string|number} [now=new Date()] - Time reference for the preset.
 * @returns {object} Default run-window state for admin controls.
 */
export function createDefaultRunWindowState(now = new Date()) {
  const previewWindow = createDefaultFetchWindowPreview({
    now,
  });

  return {
    endInputValue: formatFetchWindowInputValue(previewWindow.end),
    startInputValue: formatFetchWindowInputValue(previewWindow.start),
    writeCheckpointOnSuccess: false,
  };
}

/**
 * Converts client-side run-window inputs into the API payload used by manual
 * stream executions.
 *
 * @param {object} windowState - Client-side input state.
 * @returns {object} API-ready fetch window payload.
 */
export function createRunFetchWindowRequest(windowState = {}) {
  const start = parseFetchWindowInputValue(windowState.startInputValue);
  const end = parseFetchWindowInputValue(windowState.endInputValue);

  if (!start || !end) {
    throw new Error("run_window_boundaries_required");
  }

  if (start > end) {
    throw new Error("run_window_start_after_end");
  }

  return {
    end: end.toISOString(),
    start: start.toISOString(),
    writeCheckpointOnSuccess: Boolean(windowState.writeCheckpointOnSuccess),
  };
}

/**
 * Creates unique provider-capability notes for the selected stream scope so
 * operators can see how the normalized window maps to each provider endpoint.
 *
 * @param {Array<object>} streams - Stream records in the current run scope.
 * @returns {Array<object>} Unique capability rows for the admin UI.
 */
export function buildFetchWindowCapabilityDetails(streams = []) {
  const detailsByKey = new Map();

  for (const stream of streams) {
    const providerKey = `${stream?.activeProvider?.providerKey || ""}`.trim().toLowerCase();

    if (!providerKey) {
      continue;
    }

    const requestValues = buildProviderRequestValues(stream);
    const timeBoundarySupport = getProviderTimeBoundarySupport(providerKey, requestValues);
    const capabilityKey = [
      providerKey,
      timeBoundarySupport?.endpoint || "default",
      timeBoundarySupport?.mode || "local_only",
      timeBoundarySupport?.precision || "datetime",
    ].join(":");

    if (detailsByKey.has(capabilityKey)) {
      continue;
    }

    detailsByKey.set(capabilityKey, {
      badge: buildCapabilityBadge(timeBoundarySupport),
      description: buildCapabilityDescription(timeBoundarySupport),
      id: capabilityKey,
      label: `${stream?.activeProvider?.label || providerKey} | ${formatProviderEndpointLabel(
        timeBoundarySupport?.endpoint || "default",
      )}`,
      mode: timeBoundarySupport?.mode || "local_only",
      precision: timeBoundarySupport?.precision || "datetime",
    });
  }

  return [...detailsByKey.values()];
}

const preferredDestinationGroupOrder = Object.freeze(["WEBSITE", "FACEBOOK", "INSTAGRAM"]);

function compareDestinationGroupKeys(left, right) {
  const normalizedLeft = `${left || ""}`.trim().toUpperCase();
  const normalizedRight = `${right || ""}`.trim().toUpperCase();
  const leftIndex = preferredDestinationGroupOrder.indexOf(normalizedLeft);
  const rightIndex = preferredDestinationGroupOrder.indexOf(normalizedRight);

  if (leftIndex !== -1 || rightIndex !== -1) {
    if (leftIndex === -1) {
      return 1;
    }

    if (rightIndex === -1) {
      return -1;
    }

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }
  }

  return normalizedLeft.localeCompare(normalizedRight);
}

/**
 * Shared helper collection used by the stream management screen.
 */
export const streamManagementUtils = Object.freeze({
  buildFetchWindowCapabilityDetails,
  compareDestinationGroupKeys,
  createDefaultRunWindowState,
  createRunFetchWindowRequest,
  describeCompletedRun,
  getDestinationPlatformIcon,
  getResultLabel,
  getResultTone,
  getRunProgress,
  getStreamDeleteDescription,
  getTone,
  summarizeRunCounts,
});
