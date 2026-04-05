import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

describe("storage adapters", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("writes local media objects under the configured base path", async () => {
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "news-pub-media-"));

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
