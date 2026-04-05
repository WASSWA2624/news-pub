import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const originalEnv = process.env;
const originalFetch = global.fetch;

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

function createJsonResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return payload;
    },
    async text() {
      return JSON.stringify(payload);
    },
  };
}

function createTextResponse(payload, status = 200) {
  return {
    ok: status >= 200 && status < 300,
    status,
    async json() {
      return JSON.parse(payload);
    },
    async text() {
      return payload;
    },
  };
}

describe("provider catalog helpers", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createBaseEnv(),
    };
    global.fetch = vi.fn();
  });

  afterEach(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it("loads catalog models from trusted public provider docs", async () => {
    global.fetch.mockResolvedValue(
      createTextResponse(`
        <html>
          <body>
            <code>claude-sonnet-4-5-20250929</code>
            <code>claude-opus-4-1-20250805</code>
            <code>claude-prompting-best-practices</code>
          </body>
        </html>
      `),
    );
    const { searchAiProviderModels } = await import("./provider-catalog");

    const result = await searchAiProviderModels("anthropic", "sonnet", {
      forceRefresh: true,
    });

    expect(result.provider.label).toBe("Anthropic");
    expect(result.models.map((model) => model.id)).toEqual(["claude-sonnet-4-5-20250929"]);
  });

  it("loads authenticated provider catalogs from provider API credentials", async () => {
    global.fetch.mockResolvedValue(
      createJsonResponse({
        data: [
          { id: "gpt-5.4" },
          { id: "gpt-5.4-mini" },
          { id: "text-embedding-3-large" },
        ],
      }),
    );
    const prisma = {
      modelProviderConfig: {
        findFirst: vi.fn().mockResolvedValue({
          apiKeyEncrypted: null,
          apiKeyEnvName: "OPENAI_API_KEY",
          id: "provider_cfg_default_generation",
          provider: "openai",
        }),
      },
    };
    const { searchAiProviderModels } = await import("./provider-catalog");

    const result = await searchAiProviderModels(
      "openai",
      "gpt-5",
      {
        forceRefresh: true,
      },
      prisma,
    );

    expect(prisma.modelProviderConfig.findFirst).toHaveBeenCalled();
    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.openai.com/v1/models",
      expect.objectContaining({
        headers: expect.objectContaining({
          authorization: "Bearer env-openai-key",
        }),
      }),
    );
    expect(result.models.map((model) => model.id)).toEqual(["gpt-5.4", "gpt-5.4-mini"]);
  });

  it("summarizes every supported provider for the admin catalog UI", async () => {
    const { getAiProviderCatalogSummary } = await import("./provider-catalog");

    const summary = getAiProviderCatalogSummary();

    expect(summary.supportedProviderCount).toBe(20);
    expect(summary.providers.some((provider) => provider.value === "huggingface")).toBe(true);
    expect(summary.providers.some((provider) => provider.value === "amazon")).toBe(true);
  });
});
