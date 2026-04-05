import { describe, expect, it } from "vitest";

import { parseServerEnv, parseSharedEnv } from "./runtime";

function createBaseEnv() {
  return {
    DATABASE_URL: "mysql://user:password@localhost:3306/med_blog",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    SESSION_SECRET: "change-me",
    SESSION_MAX_AGE_SECONDS: "28800",
    AI_PROVIDER_DEFAULT: "openai",
    AI_MODEL_DEFAULT: "gpt-5.4",
    AI_PROVIDER_FALLBACK: "openai",
    AI_MODEL_FALLBACK: "gpt-5.4-mini",
    OPENAI_API_KEY: "test-openai-key",
    MEDIA_DRIVER: "local",
    LOCAL_MEDIA_BASE_PATH: "public/uploads",
    LOCAL_MEDIA_BASE_URL: "/uploads",
    S3_MEDIA_BUCKET: "",
    S3_MEDIA_REGION: "",
    S3_MEDIA_BASE_URL: "",
    S3_ACCESS_KEY_ID: "",
    S3_SECRET_ACCESS_KEY: "",
    ADMIN_SEED_EMAIL: "admin@example.com",
    ADMIN_SEED_PASSWORD: "strong-password",
    COMMENT_RATE_LIMIT_WINDOW_MS: "60000",
    COMMENT_RATE_LIMIT_MAX: "5",
    COMMENT_CAPTCHA_ENABLED: "false",
    COMMENT_CAPTCHA_SECRET: "",
    UPLOAD_ALLOWED_MIME_TYPES: "image/jpeg,image/png,image/webp",
    REVALIDATE_SECRET: "change-me",
    CRON_SECRET: "change-me",
  };
}

describe("environment runtime schema", () => {
  it("parses the Release 1 local-driver contract into typed config", () => {
    const env = parseServerEnv(createBaseEnv());

    expect(env.app.url).toBe("https://example.com");
    expect(env.i18n).toEqual({
      defaultLocale: "en",
      supportedLocales: ["en"],
    });
    expect(env.auth.session.maxAgeSeconds).toBe(28800);
    expect(env.comments.rateLimit).toEqual({
      max: 5,
      windowMs: 60000,
    });
    expect(env.comments.captcha).toEqual({
      enabled: false,
      secret: null,
    });
    expect(env.media).toMatchObject({
      driver: "local",
      local: {
        basePath: "public/uploads",
        baseUrl: "/uploads",
      },
      uploadAllowedMimeTypes: ["image/jpeg", "image/png", "image/webp"],
    });
  });

  it("allows provider credentials to be managed outside environment variables", () => {
    const env = createBaseEnv();

    delete env.AI_PROVIDER_DEFAULT;
    delete env.AI_MODEL_DEFAULT;
    delete env.AI_PROVIDER_FALLBACK;
    delete env.AI_MODEL_FALLBACK;
    delete env.OPENAI_API_KEY;

    const parsedEnv = parseServerEnv(env);

    expect(parsedEnv.ai.default).toBeNull();
    expect(parsedEnv.ai.fallback).toBeNull();
    expect(parsedEnv.ai.openaiApiKey).toBeNull();
    expect(parsedEnv.ai.providerConfigSecret).toBe("change-me");
  });

  it("accepts any supported provider when bootstrapping default and fallback configs", () => {
    const env = createBaseEnv();

    env.AI_PROVIDER_DEFAULT = "anthropic";
    env.AI_MODEL_DEFAULT = "claude-sonnet-4-5-20250929";
    env.AI_PROVIDER_FALLBACK = "google";
    env.AI_MODEL_FALLBACK = "gemini-2.5-pro";

    const parsedEnv = parseServerEnv(env);

    expect(parsedEnv.ai.default).toEqual({
      model: "claude-sonnet-4-5-20250929",
      provider: "anthropic",
    });
    expect(parsedEnv.ai.fallback).toEqual({
      model: "gemini-2.5-pro",
      provider: "google",
    });
  });

  it("fails when a required variable is missing", () => {
    const env = createBaseEnv();

    delete env.DATABASE_URL;

    expect(() => parseServerEnv(env)).toThrow(/DATABASE_URL/);
    expect(() => parseServerEnv(env)).toThrow(/required/);
  });

  it("fails when the default locale is not part of the supported locale list", () => {
    const env = createBaseEnv();

    env.DEFAULT_LOCALE = "fr";

    expect(() => parseSharedEnv(env)).toThrow(
      /DEFAULT_LOCALE must be included in SUPPORTED_LOCALES/,
    );
  });

  it("requires S3 settings only when the S3 driver is enabled", () => {
    const env = createBaseEnv();

    env.MEDIA_DRIVER = "s3";

    expect(() => parseServerEnv(env)).toThrow(/S3_MEDIA_BUCKET is required when MEDIA_DRIVER=s3/);
  });

  it("requires the captcha secret only when captcha is enabled", () => {
    const env = createBaseEnv();

    env.COMMENT_CAPTCHA_ENABLED = "true";

    expect(() => parseServerEnv(env)).toThrow(
      /COMMENT_CAPTCHA_SECRET is required when COMMENT_CAPTCHA_ENABLED=true/,
    );
  });
});
