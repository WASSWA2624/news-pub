import { describe, expect, it } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

import { parseServerEnv, parseSharedEnv } from "./runtime";

describe("environment runtime schema", () => {
  it("parses the Release 1 environment contract into typed config", () => {
    const env = parseServerEnv(createNewsPubTestEnv());

    expect(env.app.url).toBe("https://example.com");
    expect(env.i18n).toEqual({
      defaultLocale: "en",
      supportedLocales: ["en"],
    });
    expect(env.auth.session.maxAgeSeconds).toBe(3600);
    expect(env.destinations.encryptionKey).toBe("destination-secret");
    expect(env.meta).toEqual({
      allowedPageIds: [],
      app: {
        id: null,
        secret: null,
      },
      destinationCredentials: {},
      graphApiBaseUrl: "https://graph.facebook.com/v22.0",
      socialGuardrails: {
        duplicateCooldownHours: 72,
        facebookMaxPostsPer24Hours: 12,
        instagramMaxHashtags: 8,
        instagramMaxPostsPer24Hours: 20,
        minPostIntervalMinutes: 90,
      },
    });
    expect(env.media).toMatchObject({
      driver: "local",
      local: {
        basePath: "public/uploads",
        baseUrl: "/uploads",
      },
      maxRemoteFileBytes: 5242880,
      uploadAllowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
    expect(env.observability).toEqual({
      analyticsEnabled: true,
      metricsEnabled: true,
    });
    expect(env.scheduler).toEqual({
      defaultTimezone: "UTC",
      initialBackfillHours: 24,
    });
  });

  it("fails when a required variable is missing", () => {
    const env = createNewsPubTestEnv();

    delete env.DATABASE_URL;

    expect(() => parseServerEnv(env)).toThrow(/DATABASE_URL/);
    expect(() => parseServerEnv(env)).toThrow(/required/);
  });

  it("fails when the default locale is not part of the supported locale list", () => {
    const env = createNewsPubTestEnv({
      DEFAULT_LOCALE: "fr",
    });

    expect(() => parseSharedEnv(env)).toThrow(
      /DEFAULT_LOCALE must be included in SUPPORTED_LOCALES/,
    );
  });

  it("requires S3 settings only when the S3 driver is enabled", () => {
    const env = createNewsPubTestEnv({
      MEDIA_DRIVER: "s3",
    });

    expect(() => parseServerEnv(env)).toThrow(/S3_MEDIA_BUCKET is required when MEDIA_DRIVER=s3/);
  });

  it("parses optional Meta destination runtime credentials", () => {
    const env = parseServerEnv(
      createNewsPubTestEnv({
        META_APP_ID: "1234567890",
        META_APP_SECRET: "meta-secret",
        META_ALLOWED_PAGE_IDS: "123456789012345,234567890123456",
        META_DESTINATION_CREDENTIALS_JSON: JSON.stringify({
          "facebook-page": {
            accessToken: "page-token",
            pageId: "123456789012345",
          },
        }),
        META_FACEBOOK_MAX_POSTS_PER_24H: "10",
        META_GRAPH_API_BASE_URL: "https://graph.facebook.com/v22.0",
        META_INSTAGRAM_MAX_HASHTAGS: "6",
        META_INSTAGRAM_MAX_POSTS_PER_24H: "18",
        META_SOCIAL_DUPLICATE_COOLDOWN_HOURS: "48",
        META_SOCIAL_MIN_POST_INTERVAL_MINUTES: "120",
      }),
    );

    expect(env.meta).toEqual({
      allowedPageIds: ["123456789012345", "234567890123456"],
      app: {
        id: "1234567890",
        secret: "meta-secret",
      },
      destinationCredentials: {
        "facebook-page": {
          accessToken: "page-token",
          pageId: "123456789012345",
        },
      },
      graphApiBaseUrl: "https://graph.facebook.com/v22.0",
      socialGuardrails: {
        duplicateCooldownHours: 48,
        facebookMaxPostsPer24Hours: 10,
        instagramMaxHashtags: 6,
        instagramMaxPostsPer24Hours: 18,
        minPostIntervalMinutes: 120,
      },
    });
  });

  it("requires Meta app id and secret together", () => {
    const env = createNewsPubTestEnv({
      META_APP_ID: "1234567890",
    });

    expect(() => parseServerEnv(env)).toThrow(/META_APP_ID and META_APP_SECRET must be provided together/);
  });
});
