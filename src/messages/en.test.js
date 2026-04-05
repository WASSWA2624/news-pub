import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { ADMIN_NAV_ITEMS } from "@/lib/auth/rbac";

const messages = JSON.parse(readFileSync(new URL("./en.json", import.meta.url), "utf8"));

describe("English locale messages", () => {
  it("defines a non-empty label for every admin navigation item", () => {
    const navigationMessages = messages.admin?.navigation || {};

    for (const item of ADMIN_NAV_ITEMS) {
      expect(navigationMessages[item.key]).toEqual(expect.any(String));
      expect(navigationMessages[item.key].trim()).not.toBe("");
    }
  });
});
