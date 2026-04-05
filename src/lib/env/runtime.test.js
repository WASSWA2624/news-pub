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
});
