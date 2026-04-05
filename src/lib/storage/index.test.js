import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

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
    S3_MEDIA_BUCKET: "bucket",
    S3_MEDIA_REGION: "us-east-1",
    S3_MEDIA_BASE_URL: "https://cdn.example.com",
    S3_ACCESS_KEY_ID: "key",
    S3_SECRET_ACCESS_KEY: "secret",
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

describe("storage adapters", () => {
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

  it("writes local media objects under the configured base path", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "equip-media-"));

    try {
      const { createStorageAdapter } = await import("./index");
      const adapter = createStorageAdapter({
        driver: "local",
        local: {
          basePath: tempDir,
          baseUrl: "/uploads",
        },
      });

      const result = await adapter.writeObject({
        body: Buffer.from("example"),
        key: "media/2026/04/03/example.txt",
      });
      const savedFile = await fs.readFile(path.join(tempDir, "media", "2026", "04", "03", "example.txt"), "utf8");

      expect(savedFile).toBe("example");
      expect(result).toEqual({
        localPath: `${tempDir.replace(/\\/g, "/")}/media/2026/04/03/example.txt`,
        publicUrl: "/uploads/media/2026/04/03/example.txt",
        storageKey: "media/2026/04/03/example.txt",
      });
    } finally {
      await fs.rm(tempDir, { force: true, recursive: true });
    }
  });

  it("uploads S3 objects through the shared adapter contract", async () => {
    const client = {
      send: vi.fn().mockResolvedValue({}),
    };
    const { createStorageAdapter } = await import("./index");
    const adapter = createStorageAdapter(
      {
        driver: "s3",
        s3: {
          accessKeyId: "key",
          baseUrl: "https://cdn.example.com",
          bucket: "bucket",
          region: "us-east-1",
          secretAccessKey: "secret",
        },
      },
      {
        s3: {
          client,
        },
      },
    );

    const result = await adapter.writeObject({
      body: Buffer.from("example"),
      contentType: "text/plain",
      key: "media/example.txt",
    });

    expect(client.send).toHaveBeenCalledTimes(1);
    expect(client.send.mock.calls[0][0].input).toMatchObject({
      Bucket: "bucket",
      ContentType: "text/plain",
      Key: "media/example.txt",
    });
    expect(result).toEqual({
      localPath: null,
      publicUrl: "https://cdn.example.com/media/example.txt",
      storageKey: "media/example.txt",
    });
  });
});
