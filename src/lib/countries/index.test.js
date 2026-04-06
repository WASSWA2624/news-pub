import { describe, expect, it } from "vitest";

import {
  formatCountryFlagEmoji,
  formatCountryFlagImageUrl,
  normalizeCountryCode,
} from "./index";

describe("country helpers", () => {
  it("normalizes country filters consistently", () => {
    expect(normalizeCountryCode(" US ")).toBe("us");
    expect(normalizeCountryCode("all")).toBe("");
  });

  it("builds country flag metadata for two-letter codes", () => {
    expect(formatCountryFlagEmoji("us")).toBe("🇺🇸");
    expect(formatCountryFlagEmoji("all")).toBe("");
    expect(formatCountryFlagImageUrl("us")).toBe("https://flagcdn.com/24x18/us.png");
    expect(formatCountryFlagImageUrl("usa")).toBe("");
  });
});
