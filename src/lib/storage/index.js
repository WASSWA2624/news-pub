import { DeleteObjectCommand, PutObjectCommand, S3Client } from "@aws-sdk/client-s3";
import fs from "node:fs/promises";
import path from "node:path";

import { env } from "@/lib/env/server";

function normalizeStorageKey(key) {
  return `${key || ""}`
    .trim()
    .replace(/\\/g, "/")
    .replace(/^\/+/, "")
    .replace(/\/{2,}/g, "/");
}

function normalizeBaseUrl(baseUrl) {
  if (baseUrl === "/") {
    return "";
  }

  return `${baseUrl || ""}`.replace(/\/+$/, "");
}

function normalizeStoredPath(basePath, key) {
  const normalizedBasePath = `${basePath || ""}`.replace(/\\/g, "/").replace(/\/+$/, "");

  return normalizedBasePath ? `${normalizedBasePath}/${key}` : key;
}

function resolveAbsoluteBasePath(basePath) {
  if (!basePath) {
    throw new Error("Local media base path is not configured.");
  }

  return path.isAbsolute(basePath)
    ? basePath
    : path.resolve(/* turbopackIgnore: true */ process.cwd(), basePath);
}

function createLocalStorageAbsolutePath(basePath, key) {
  return path.join(resolveAbsoluteBasePath(basePath), ...key.split("/"));
}

function createPublicUrl(baseUrl, key) {
  return `${normalizeBaseUrl(baseUrl)}/${key}`;
}

export function createLocalStorageAdapter(config) {
  return {
    driver: "local",
    async deleteObject(key) {
      const storageKey = normalizeStorageKey(key);

      if (!storageKey) {
        return;
      }

      await fs.rm(createLocalStorageAbsolutePath(config.basePath, storageKey), {
        force: true,
      });
    },
    async writeObject({ body, key }) {
      const storageKey = normalizeStorageKey(key);

      if (!storageKey) {
        throw new Error("Storage key is required.");
      }

      const absolutePath = createLocalStorageAbsolutePath(config.basePath, storageKey);

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, body);

      return {
        localPath: normalizeStoredPath(config.basePath, storageKey),
        publicUrl: createPublicUrl(config.baseUrl, storageKey),
        storageKey,
      };
    },
  };
}

export function createS3StorageAdapter(config, overrides = {}) {
  const client =
    overrides.client ||
    new S3Client({
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
      region: config.region,
    });

  return {
    driver: "s3",
    async deleteObject(key) {
      const storageKey = normalizeStorageKey(key);

      if (!storageKey) {
        return;
      }

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: storageKey,
        }),
      );
    },
    async writeObject({ body, cacheControl, contentType, key }) {
      const storageKey = normalizeStorageKey(key);

      if (!storageKey) {
        throw new Error("Storage key is required.");
      }

      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: config.bucket,
          CacheControl: cacheControl,
          ContentType: contentType,
          Key: storageKey,
        }),
      );

      return {
        localPath: null,
        publicUrl: createPublicUrl(config.baseUrl, storageKey),
        storageKey,
      };
    },
  };
}

export function createStorageAdapter(mediaConfig = env.media, overrides = {}) {
  if (mediaConfig.driver === "local") {
    return createLocalStorageAdapter(mediaConfig.local);
  }

  if (mediaConfig.driver === "s3") {
    return createS3StorageAdapter(mediaConfig.s3, overrides.s3 || {});
  }

  throw new Error(`Unsupported media driver "${mediaConfig.driver}".`);
}
