import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;

describe("generate post admin snapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      DATABASE_URL: "mysql://user:password@localhost:3306/med_blog",
      DEFAULT_LOCALE: "en",
      NEXT_PUBLIC_APP_URL: "https://example.com",
      SUPPORTED_LOCALES: "en",
      SESSION_SECRET: "change-me",
      SESSION_MAX_AGE_SECONDS: "28800",
      MEDIA_DRIVER: "local",
      LOCAL_MEDIA_BASE_PATH: "public/uploads",
      LOCAL_MEDIA_BASE_URL: "/uploads",
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
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("derives provider defaults and permission flags for the generate screen", async () => {
    const prisma = {
      modelProviderConfig: {
        findMany: vi.fn().mockResolvedValue([
          {
            apiKeyEncrypted: "enc.v1.abc.def.ghi",
            apiKeyEnvName: "OPENAI_API_KEY",
            apiKeyLast4: "1234",
            apiKeyUpdatedAt: new Date("2026-04-03T08:15:00.000Z"),
            id: "provider_cfg_default_generation",
            isDefault: true,
            model: "gpt-5.4",
            provider: "openai",
            purpose: "draft_generation",
            updatedAt: new Date("2026-04-03T08:00:00.000Z"),
          },
          {
            apiKeyEncrypted: null,
            apiKeyEnvName: "OPENAI_API_KEY",
            apiKeyLast4: null,
            apiKeyUpdatedAt: null,
            id: "provider_cfg_fallback_generation",
            isDefault: false,
            model: "gpt-5.4-mini",
            provider: "openai",
            purpose: "draft_generation_fallback",
            updatedAt: new Date("2026-04-03T07:00:00.000Z"),
          },
        ]),
      },
    };
    const { getAdminGeneratePostSnapshot } = await import("./admin-screen");

    const snapshot = await getAdminGeneratePostSnapshot(
      {
        role: "EDITOR",
      },
      prisma,
    );

    expect(snapshot.defaults).toMatchObject({
      articleDepth: "complete",
      locale: "en",
      providerConfigId: "provider_cfg_default_generation",
      replaceExistingPost: false,
      schedulePublishAt: null,
    });
    expect(snapshot.localeOptions).toEqual([
      {
        code: "en",
        isDefault: true,
        label: "EN",
        name: "English",
      },
    ]);
    expect(snapshot.permissions).toEqual({
      canEditDrafts: true,
      canManageProviders: false,
      canPublish: false,
      canSchedule: true,
    });
    expect(snapshot.providerConfigs.map((providerConfig) => providerConfig.id)).toEqual([
      "provider_cfg_default_generation",
      "provider_cfg_fallback_generation",
    ]);
    expect(snapshot.stageOrder).toEqual([
      "duplicate_check",
      "composing_draft",
      "saving_draft",
      "draft_saved",
    ]);
  });
});
