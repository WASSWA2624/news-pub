import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    NEXT_PUBLIC_APP_URL: "https://example.com",
  };
}

const originalEnv = process.env;

describe("locale routing helpers", () => {
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

  it("builds locale-prefixed public paths for Release 1", async () => {
    const { buildLocaleRootPath, buildLocalizedPath, publicRouteSegments } = await import(
      "./routing"
    );

    expect(buildLocaleRootPath()).toBe("/en");
    expect(buildLocalizedPath("en", publicRouteSegments.about)).toBe("/en/about");
    expect(buildLocalizedPath("en", publicRouteSegments.blogPost("microscope"))).toBe(
      "/en/blog/microscope",
    );
  });

  it("builds canonical metadata and alternate links for enabled locales only", async () => {
    const { buildPublicPageMetadata, publicRouteSegments } = await import("./routing");

    expect(
      buildPublicPageMetadata({
        description: "Search published content in the active locale.",
        locale: "en",
        segments: publicRouteSegments.search,
        title: "Search",
      }),
    ).toEqual({
      alternates: {
        canonical: "/en/search",
      },
      description: "Search published content in the active locale.",
      title: "Search",
    });
  });

  it("emits locale alternates only when additional locales are enabled", async () => {
    vi.resetModules();
    vi.doMock("@/features/i18n/config", () => ({
      defaultLocale: "en",
      isSupportedLocale: (locale) => ["en", "fr"].includes(locale),
      supportedLocales: ["en", "fr"],
    }));

    try {
      const { buildPublicPageMetadata, publicRouteSegments } = await import("./routing");

      expect(
        buildPublicPageMetadata({
          description: "About the project.",
          locale: "en",
          segments: publicRouteSegments.about,
          title: "About",
        }),
      ).toEqual({
        alternates: {
          canonical: "/en/about",
          languages: {
            en: "/en/about",
            fr: "/fr/about",
          },
        },
        description: "About the project.",
        title: "About",
      });
    } finally {
      vi.doUnmock("@/features/i18n/config");
    }
  });

  it("rejects unsupported locales and exposes unsupported prefixes safely", async () => {
    const { buildLocalizedPath, getPathLocalePrefix, publicRouteSegments } = await import(
      "./routing"
    );

    expect(() => buildLocalizedPath("fr", publicRouteSegments.about)).toThrow(
      /Unsupported locale "fr"/,
    );
    expect(getPathLocalePrefix("/fr/blog")).toEqual({
      kind: "unsupported",
      locale: "fr",
      rawLocale: "fr",
      remainingPath: "/blog",
    });
    expect(getPathLocalePrefix("/admin")).toEqual({
      kind: "none",
      locale: null,
      rawLocale: null,
      remainingPath: "/admin",
    });
  });
});
