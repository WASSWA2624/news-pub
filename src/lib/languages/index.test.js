import { describe, expect, it } from "vitest";

import {
  formatLanguageFlagEmoji,
  formatLanguageFlagImageUrl,
  getRepresentativeCountryCodeForLanguage,
  normalizeLanguageCode,
} from "./index";

describe("language flag helpers", () => {
  it("normalizes language codes consistently", () => {
    expect(normalizeLanguageCode(" EN_us ")).toBe("en-us");
  });

  it("maps representative flags for provider language codes", () => {
    expect(getRepresentativeCountryCodeForLanguage("en")).toBe("gb");
    expect(getRepresentativeCountryCodeForLanguage("vi")).toBe("vn");
    expect(getRepresentativeCountryCodeForLanguage("zht")).toBe("tw");
    expect(formatLanguageFlagEmoji("fr")).toBe("🇫🇷");
    expect(formatLanguageFlagImageUrl("fr")).toBe("https://flagcdn.com/24x18/fr.png");
  });

  it("prefers explicit locale regions when they are present", () => {
    expect(getRepresentativeCountryCodeForLanguage("en-US")).toBe("us");
    expect(formatLanguageFlagImageUrl("pt-BR")).toBe("https://flagcdn.com/24x18/br.png");
  });
});
