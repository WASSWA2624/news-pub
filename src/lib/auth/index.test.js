import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

const originalEnv = process.env;

describe("auth helpers", () => {
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

  it("creates scrypt password hashes that verify correctly", async () => {
    const { createPasswordHash, verifyPassword } = await import("./index");
    const hash = createPasswordHash("strong-password");

    expect(hash).toMatch(/^scrypt\$32768\$8\$1\$/);
    expect(verifyPassword("strong-password", hash)).toBe(true);
    expect(verifyPassword("wrong-password", hash)).toBe(false);
    expect(verifyPassword("strong-password", "invalid-format")).toBe(false);
  });

  it("normalizes emails and hashes session tokens deterministically", async () => {
    const { hashSessionToken, normalizeEmail } = await import("./index");

    expect(normalizeEmail(" Admin@Example.com ")).toBe("admin@example.com");
    expect(hashSessionToken("session-token")).toBe(hashSessionToken("session-token"));
    expect(hashSessionToken("session-token")).not.toBe(hashSessionToken("other-token"));
  });
});
