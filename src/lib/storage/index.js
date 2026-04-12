/**
 * Storage adapter helpers for local and S3-backed NewsPub media persistence.
 */

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

function normalizeBaseUrl(base_url) {
  if (base_url === "/") {
    return "";
  }

  return `${base_url || ""}`.replace(/\/+$/, "");
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

function createPublicUrl(base_url, key) {
  return `${normalizeBaseUrl(base_url)}/${key}`;
}
/**
 * Creates the local-filesystem storage adapter used by NewsPub media uploads.
 */

export function createLocalStorageAdapter(config) {
  return {
    driver: "local",
    async deleteObject(key) {
      const storage_key = normalizeStorageKey(key);

      if (!storage_key) {
        return;
      }

      await fs.rm(createLocalStorageAbsolutePath(config.basePath, storage_key), {
        force: true,
      });
    },
    async writeObject({ body, key }) {
      const storage_key = normalizeStorageKey(key);

      if (!storage_key) {
        throw new Error("Storage key is required.");
      }

      const absolutePath = createLocalStorageAbsolutePath(config.basePath, storage_key);

      await fs.mkdir(path.dirname(absolutePath), { recursive: true });
      await fs.writeFile(absolutePath, body);

      return {
        local_path: normalizeStoredPath(config.basePath, storage_key),
        public_url: createPublicUrl(config.base_url, storage_key),
        storage_key,
      };
    },
  };
}
/**
 * Creates the S3-compatible storage adapter used by NewsPub media uploads.
 */

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
      const storage_key = normalizeStorageKey(key);

      if (!storage_key) {
        return;
      }

      await client.send(
        new DeleteObjectCommand({
          Bucket: config.bucket,
          Key: storage_key,
        }),
      );
    },
    async writeObject({ body, cacheControl, contentType, key }) {
      const storage_key = normalizeStorageKey(key);

      if (!storage_key) {
        throw new Error("Storage key is required.");
      }

      await client.send(
        new PutObjectCommand({
          Body: body,
          Bucket: config.bucket,
          CacheControl: cacheControl,
          ContentType: contentType,
          Key: storage_key,
        }),
      );

      return {
        local_path: null,
        public_url: createPublicUrl(config.base_url, storage_key),
        storage_key,
      };
    },
  };
}
/**
 * Creates the active NewsPub storage adapter from the configured media settings.
 */

export function createStorageAdapter(mediaConfig = env.media, overrides = {}) {
  if (mediaConfig.driver === "local") {
    return createLocalStorageAdapter(mediaConfig.local);
  }

  if (mediaConfig.driver === "s3") {
    return createS3StorageAdapter(mediaConfig.s3, overrides.s3 || {});
  }

  throw new Error(`Unsupported media driver "${mediaConfig.driver}".`);
}
