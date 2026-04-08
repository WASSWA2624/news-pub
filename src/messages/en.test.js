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

  it("defines the localized search and footer copy used by public discovery surfaces", () => {
    const siteMessages = messages.site || {};
    const searchMessages = messages.public?.search || {};

    for (const value of [
      siteMessages.footer,
      siteMessages.footerBottom,
      siteMessages.footerNavigation?.browse,
      siteMessages.footerNavigation?.company,
      siteMessages.footerNavigation?.discover,
      siteMessages.footerNavigation?.legal,
      siteMessages.accessibility?.closeMenu,
      siteMessages.accessibility?.closeSearch,
      siteMessages.accessibility?.mobileMenu,
      siteMessages.accessibility?.openMenu,
      siteMessages.accessibility?.searchDialog,
      searchMessages.formTitle,
      searchMessages.formDescription,
      searchMessages.emptyQueryTitle,
      searchMessages.emptyQueryDescription,
      searchMessages.filteredTitle,
      searchMessages.filteredDescription,
      searchMessages.resultsTitle,
      searchMessages.resultDescription,
      searchMessages.noResultsTitle,
      searchMessages.noResultsDescription,
      searchMessages.browseCategoriesTitle,
      searchMessages.browseCountriesTitle,
      searchMessages.browseLatestAction,
      searchMessages.clearCountryAction,
      searchMessages.clearQueryAction,
      searchMessages.resultCountSingular,
      searchMessages.resultCountPlural,
      searchMessages.matchReasons?.body,
      searchMessages.matchReasons?.category,
      searchMessages.matchReasons?.slug,
      searchMessages.matchReasons?.source,
      searchMessages.matchReasons?.summary,
      searchMessages.matchReasons?.title,
    ]) {
      expect(value).toEqual(expect.any(String));
      expect(value.trim()).not.toBe("");
    }
  });
});
