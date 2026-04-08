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

  it("defines the public story-detail labels needed by the localized article route", () => {
    const commonMessages = messages.public?.common || {};
    const storyMessages = messages.public?.story || {};

    for (const value of [
      commonMessages.loadingAction,
      commonMessages.loadingMoreStatus,
      commonMessages.readMoreAction,
      storyMessages.additionalMediaKicker,
      storyMessages.additionalMediaTitle,
      storyMessages.articleSectionLabel,
      storyMessages.breadcrumbHomeLabel,
      storyMessages.breadcrumbLabel,
      storyMessages.breadcrumbNewsLabel,
      storyMessages.categoryFallback,
      storyMessages.jumpToArticleAction,
      storyMessages.minuteReadLabel,
      storyMessages.publishedStatusLabel,
      storyMessages.readSourceAction,
      storyMessages.sourceAttributionFallback,
      storyMessages.sourceFallback,
    ]) {
      expect(value).toEqual(expect.any(String));
      expect(value.trim()).not.toBe("");
    }
  });
});
