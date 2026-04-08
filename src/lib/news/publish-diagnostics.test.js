import { describe, expect, it } from "vitest";

import {
  getPublishAttemptDiagnosticIssues,
  getPublishAttemptDiagnosticSummary,
} from "./publish-diagnostics";

describe("publish diagnostics helpers", () => {
  it("extracts issue codes and messages from nested destination error payloads", () => {
    const attempt = {
      diagnosticsJson: {
        errorDetails: {
          error: "destination_policy_guardrail_blocked",
          issues: [
            {
              code: "posting_interval_too_short",
              message: "Wait before publishing again.",
            },
          ],
        },
      },
      errorCode: "destination_policy_guardrail_blocked",
      errorMessage: "Meta publishing guardrails blocked this post.",
      responseJson: {
        status: "destination_policy_guardrail_blocked",
      },
    };

    expect(getPublishAttemptDiagnosticIssues(attempt)).toEqual([
      {
        code: "posting_interval_too_short",
        message: "Wait before publishing again.",
      },
    ]);
    expect(getPublishAttemptDiagnosticSummary(attempt)).toEqual({
      issueCodes: ["posting_interval_too_short"],
      issueMessages: ["Wait before publishing again."],
      reasonCode: "posting_interval_too_short",
      reasonMessage: "Wait before publishing again.",
    });
  });
});
