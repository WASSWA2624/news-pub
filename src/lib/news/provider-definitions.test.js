import { describe, expect, it } from "vitest";

import { getProviderFormDefinition } from "./provider-definitions";

describe("provider definition option metadata", () => {
  it("adds flag metadata to checkbox-based language catalogs", () => {
    const definition = getProviderFormDefinition("mediastack", "provider");
    const languageField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "languages");

    expect(languageField?.options).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          flagEmoji: "🇬🇧",
          flagImageUrl: "https://flagcdn.com/24x18/gb.png",
          label: "English",
          value: "en",
        }),
      ]),
    );
  });

  it("preserves language flag metadata through single-select wrappers", () => {
    const definition = getProviderFormDefinition("newsapi", "provider", {
      endpoint: "everything",
    });
    const languageField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "language");
    const englishOption = languageField?.options?.find((option) => option.value === "en");

    expect(englishOption).toMatchObject({
      flagEmoji: "🇬🇧",
      flagImageUrl: "https://flagcdn.com/24x18/gb.png",
      label: "English",
      value: "en",
    });
  });
});
