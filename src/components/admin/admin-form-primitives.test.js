import { describe, expect, it } from "vitest";

import {
  createDisclosureAriaIds,
  createDisclosureAriaProps,
} from "./admin-form-primitives.helpers";

describe("admin form primitives", () => {
  it("builds linked disclosure ids for toggle and region elements", () => {
    expect(createDisclosureAriaIds("provider-notes")).toEqual({
      bodyId: "provider-notes-body",
      toggleId: "provider-notes-toggle",
    });
  });

  it("returns the aria props that link disclosure buttons to their regions", () => {
    expect(createDisclosureAriaProps("provider-notes")).toEqual({
      bodyProps: {
        "aria-labelledby": "provider-notes-toggle",
        id: "provider-notes-body",
        role: "region",
      },
      toggleProps: {
        "aria-controls": "provider-notes-body",
        id: "provider-notes-toggle",
      },
    });
  });
});
