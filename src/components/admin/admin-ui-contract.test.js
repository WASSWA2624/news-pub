import { describe, expect, it } from "vitest";

import {
  adminUiLayoutContract,
  adminUiSizingContract,
  getAutoOpenDisclosureIds,
  hasBlockingDisclosureState,
} from "@/components/admin/admin-ui-contract";

describe("admin UI contract", () => {
  it("keeps button and field heights aligned under one shared sizing contract", () => {
    expect(adminUiSizingContract.buttonMinHeight).toBe(adminUiSizingContract.controlMinHeight);
    expect(adminUiSizingContract.iconButtonSize).toBe(adminUiSizingContract.controlMinHeight);
  });

  it("pins shared layout breakpoints and sticky sidebar offsets under one contract", () => {
    expect(adminUiLayoutContract.buttonRowCollapseMaxWidth).toBe(560);
    expect(adminUiLayoutContract.workspaceTwoColumnBreakpoint).toBe(1080);
    expect(adminUiLayoutContract.stickySidebarTop).toBe("5.7rem");
  });

  it("detects blocking disclosure state from errors, missing fields, or blocking warnings", () => {
    expect(
      hasBlockingDisclosureState({
        errorCount: 1,
      }),
    ).toBe(true);
    expect(
      hasBlockingDisclosureState({
        missingCount: 1,
      }),
    ).toBe(true);
    expect(
      hasBlockingDisclosureState({
        blockingWarningCount: 1,
      }),
    ).toBe(true);
    expect(
      hasBlockingDisclosureState({
        errorCount: 0,
        missingCount: 0,
      }),
    ).toBe(false);
  });

  it("auto-opens only the disclosure sections that contain blocking validation state", () => {
    expect(
      getAutoOpenDisclosureIds([
        {
          errorCount: 1,
          id: "routing",
        },
        {
          id: "identity",
        },
        {
          id: "advanced",
          missingCount: 1,
        },
      ]),
    ).toEqual(["routing", "advanced"]);
  });
});
