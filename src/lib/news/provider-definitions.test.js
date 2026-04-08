import { describe, expect, it } from "vitest";

import {
  getProviderEndpointShape,
  getProviderFormDefinition,
  getProviderTimeBoundarySupport,
} from "./provider-definitions";

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

  it("reports endpoint-specific time-boundary support for each provider surface", () => {
    expect(getProviderEndpointShape("mediastack")).toBe("default");
    expect(getProviderTimeBoundarySupport("mediastack")).toMatchObject({
      endKey: "dateTo",
      mode: "direct",
      precision: "date",
      startKey: "dateFrom",
    });

    expect(getProviderEndpointShape("newsdata", { endpoint: "archive" })).toBe("archive");
    expect(getProviderTimeBoundarySupport("newsdata", { endpoint: "archive" })).toMatchObject({
      endKey: "toDate",
      mode: "direct",
      precision: "date",
      startKey: "fromDate",
    });

    expect(getProviderEndpointShape("newsdata", { endpoint: "latest" })).toBe("latest");
    expect(getProviderTimeBoundarySupport("newsdata", { endpoint: "latest" })).toMatchObject({
      mode: "relative",
      timeframeKey: "timeframe",
    });

    expect(getProviderEndpointShape("newsapi", { endpoint: "everything" })).toBe("everything");
    expect(getProviderTimeBoundarySupport("newsapi", { endpoint: "everything" })).toMatchObject({
      endKey: "toDate",
      mode: "direct",
      precision: "datetime",
      startKey: "fromDate",
    });

    expect(getProviderEndpointShape("newsapi", { endpoint: "top-headlines" })).toBe("top-headlines");
    expect(getProviderTimeBoundarySupport("newsapi", { endpoint: "top-headlines" })).toMatchObject({
      mode: "local_only",
    });
  });

  it("marks provider-managed date fields with the correct admin input precision", () => {
    const definition = getProviderFormDefinition("newsapi", "stream", {
      endpoint: "everything",
    });
    const fromDateField = definition.sections
      .flatMap((section) => section.fields)
      .find((field) => field.key === "fromDate");

    expect(fromDateField).toMatchObject({
      input: "date",
      precision: "datetime",
    });
  });
});
