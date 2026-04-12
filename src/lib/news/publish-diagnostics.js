/**
 * Helpers that flatten publish-attempt diagnostics into one consistent
 * operator-facing reason model for jobs, post history, and audit events.
 */

function trimText(value) {
  return typeof value === "string" ? value.trim() : "";
}

function normalizeIssue(issue, index) {
  const code = trimText(issue?.code || "");
  const message = trimText(issue?.message || "");

  if (!code && !message) {
    return null;
  }

  return {
    code: code || `issue_${index + 1}`,
    message: message || code || "Publish diagnostics issue",
  };
}

/**
 * Extracts normalized publish-diagnostic issues from a publish attempt record
 * or one of its nested diagnostics payloads.
 *
 * @param {object} source - Publish attempt or diagnostics container.
 * @returns {Array<object>} Normalized issue objects.
 */
export function getPublishAttemptDiagnosticIssues(source = {}) {
  const errorDetails = source?.diagnostics_json?.errorDetails || source?.response_json || null;

  if (!Array.isArray(errorDetails?.issues)) {
    return [];
  }

  return errorDetails.issues
    .map((issue, index) => normalizeIssue(issue, index))
    .filter(Boolean);
}

/**
 * Produces one operator-facing reason code and message for publish attempts so
 * jobs, post history, and audit logs all describe pacing or policy blocks in
 * the same way.
 *
 * @param {object} source - Publish attempt or diagnostics container.
 * @returns {object} Flattened reason details for admin views.
 */
export function getPublishAttemptDiagnosticSummary(source = {}) {
  const issues = getPublishAttemptDiagnosticIssues(source);
  const responseError = trimText(
    source?.diagnostics_json?.errorDetails?.error
      || source?.response_json?.error
      || source?.last_error_code,
  );
  const primaryIssue = issues[0] || null;

  return {
    issueCodes: issues.map((issue) => issue.code),
    issueMessages: issues.map((issue) => issue.message),
    reasonCode: primaryIssue?.code || responseError || null,
    reasonMessage:
      primaryIssue?.message
      || trimText(source?.last_error_message)
      || trimText(source?.response_json?.status)
      || null,
  };
}
