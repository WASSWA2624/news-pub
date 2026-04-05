import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DATABASE_URL: "mysql://user:password@localhost:3306/med_blog",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    DEFAULT_LOCALE: "en",
    SUPPORTED_LOCALES: "en",
    SESSION_SECRET: "change-me",
    SESSION_MAX_AGE_SECONDS: "28800",
    AI_PROVIDER_CONFIG_SECRET: "provider-secret",
    AI_PROVIDER_DEFAULT: "openai",
    AI_MODEL_DEFAULT: "gpt-5.4",
    AI_PROVIDER_FALLBACK: "openai",
    AI_MODEL_FALLBACK: "gpt-5.4-mini",
    OPENAI_API_KEY: "env-openai-key",
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

describe("provider configuration helpers", () => {
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

  it("encrypts and decrypts stored provider API keys", async () => {
    const { decryptProviderApiKey, encryptProviderApiKey } = await import("./provider-configs");
    const encryptedValue = encryptProviderApiKey("sk-test-1234567890");

    expect(encryptedValue).toMatch(/^enc\.v1\./);
    expect(decryptProviderApiKey(encryptedValue)).toBe("sk-test-1234567890");
  });

  it("uses stored credentials when a saved provider key is available", async () => {
    const { encryptProviderApiKey, resolveProviderApiKey } = await import("./provider-configs");

    const resolvedCredential = resolveProviderApiKey({
      apiKeyEncrypted: encryptProviderApiKey("sk-db-123456"),
      apiKeyEnvName: "OPENAI_API_KEY",
      provider: "openai",
    });

    expect(resolvedCredential).toMatchObject({
      apiKey: "sk-db-123456",
      envName: "OPENAI_API_KEY",
      source: "stored",
    });
  });

  it("does not fall back to environment credentials for provider configs", async () => {
    const { resolveProviderApiKey } = await import("./provider-configs");
    const resolvedCredential = resolveProviderApiKey({
      apiKeyEncrypted: null,
      apiKeyEnvName: "ANTHROPIC_API_KEY",
      provider: "anthropic",
    });

    expect(resolvedCredential).toMatchObject({
      apiKey: null,
      envName: "ANTHROPIC_API_KEY",
      source: "missing",
    });
  });

  it("requires one default primary config and one enabled fallback config", async () => {
    const { saveProviderConfigurationsSchema } = await import("./provider-configs");

    const result = saveProviderConfigurationsSchema.safeParse({
      configs: [
        {
          clearApiKey: false,
          id: "provider_cfg_default_generation",
          isDefault: true,
          isEnabled: true,
          model: "gpt-5.4",
          provider: "openai",
          purpose: "draft_generation",
        },
      ],
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.message)).toContain(
      "Exactly one enabled fallback generation config is required.",
    );
  });

  it("builds masked provider snapshots without exposing raw keys", async () => {
    const prisma = {
      modelProviderConfig: {
        findMany: vi.fn().mockResolvedValue([
          {
            apiKeyEncrypted: "enc.v1.example.payload",
            apiKeyEnvName: "OPENAI_API_KEY",
            apiKeyLast4: "7890",
            apiKeyUpdatedAt: new Date("2026-04-03T09:00:00.000Z"),
            id: "provider_cfg_default_generation",
            isDefault: true,
            isEnabled: true,
            model: "gpt-5.4",
            provider: "openai",
            purpose: "draft_generation",
            updatedAt: new Date("2026-04-03T09:10:00.000Z"),
          },
          {
            apiKeyEncrypted: null,
            apiKeyEnvName: "OPENAI_API_KEY",
            apiKeyLast4: null,
            apiKeyUpdatedAt: null,
            id: "provider_cfg_fallback_generation",
            isDefault: false,
            isEnabled: true,
            model: "gpt-5.4-mini",
            provider: "openai",
            purpose: "draft_generation_fallback",
            updatedAt: new Date("2026-04-03T08:10:00.000Z"),
          },
        ]),
      },
    };
    const { getProviderConfigurationSnapshot } = await import("./provider-configs");

    const snapshot = await getProviderConfigurationSnapshot(prisma);

    expect(snapshot.summary).toMatchObject({
      configCount: 2,
      enabledCount: 2,
      environmentFallbackCount: 0,
      storedCredentialCount: 1,
    });
    expect(snapshot.configs[0]).toMatchObject({
      credentialLabel: "Stored key ending in 7890",
      credentialState: "stored",
      hasStoredApiKey: true,
    });
    expect(snapshot.configs[1]).toMatchObject({
      credentialLabel: "No stored key is configured for this provider config",
      credentialState: "missing",
      hasStoredApiKey: false,
    });
    expect(snapshot.configs[0].apiKey).toBeUndefined();
  });
});
