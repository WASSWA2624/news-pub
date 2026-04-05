import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  };
}

const originalEnv = process.env;

describe("locale scaffold", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("registers english for Release 1", async () => {
    const { getLocaleDefinition, supportedLocales } = await import("./config");

    expect(supportedLocales).toContain("en");
    expect(getLocaleDefinition("en")).toMatchObject({
      label: "English",
    });
  });

  it("keeps the default locale within the supported registry", async () => {
    const { defaultLocale, supportedLocales } = await import("./config");

    expect(supportedLocales).toContain(defaultLocale);
  });

  it("can expose registered but inactive locales for future activation planning", async () => {
    const { getInactiveLocaleDefinitions, localeRegistry } = await import("./config");

    localeRegistry.fr = {
      label: "French",
      loadMessages: async () => ({
        default: {
          post: {
            defaultDisclaimer: "French disclaimer",
          },
        },
      }),
    };

    expect(getInactiveLocaleDefinitions()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          code: "fr",
          isActive: false,
          label: "French",
        }),
      ]),
    );

    delete localeRegistry.fr;
  });

  it("fails when an enabled locale has no registered definition", async () => {
    process.env.SUPPORTED_LOCALES = "en,fr";
    vi.resetModules();

    await expect(import("./config")).rejects.toThrow(/Register locale definitions for: fr/);
  });
});
