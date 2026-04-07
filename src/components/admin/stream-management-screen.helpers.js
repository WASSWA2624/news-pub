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
  compareDestinationGroupKeys,
  describeCompletedRun,
  getDestinationPlatformIcon,
  getResultLabel,
  getResultTone,
  getRunProgress,
  getStreamDeleteDescription,
  getTone,
  summarizeRunCounts,
});
