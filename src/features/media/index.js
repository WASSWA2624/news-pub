/**
 * Feature services for uploading, listing, and validating NewsPub media assets.
 */

import path from "node:path";

import sharp from "sharp";

import { createAuditEventRecord, recordObservabilityEvent } from "@/lib/analytics";
import { env } from "@/lib/env/server";
import { createStorageAdapter } from "@/lib/storage";
import { sanitizeExternalUrl } from "@/lib/security";
import { NewsPubError, createContentHash, resolvePrismaClient, trimText } from "@/lib/news/shared";

/**
 * NewsPub media ingestion pipeline for uploaded and remote story assets.
 */
const responsiveVariantDefinitions = Object.freeze([
  { key: "xl", width: 1600 },
  { key: "lg", width: 1200 },
  { key: "md", width: 800 },
  { key: "sm", width: 480 },
]);
const mediaLibrarySnapshotLimit = 100;
const remoteMediaRequestTimeoutMs = 10000;
const sharpConcurrency = Math.max(1, Number.parseInt(process.env.SHARP_CONCURRENCY || "1", 10) || 1);

sharp.concurrency(sharpConcurrency);

function guessFileExtension(mime_type) {
  if (mime_type === "image/jpeg") {
    return "jpg";
  }

  if (mime_type === "image/png") {
    return "png";
  }

  if (mime_type === "image/webp") {
    return "webp";
  }

  return "bin";
}

function getStorageKey(prefix, mime_type, source) {
  const extension = guessFileExtension(mime_type);
  const date = new Date();
  const datePrefix = `${date.getUTCFullYear()}/${`${date.getUTCMonth() + 1}`.padStart(2, "0")}`;

  return `${prefix}/${datePrefix}/${createContentHash(source, date.toISOString()).slice(0, 24)}.${extension}`;
}

async function createMediaVariants(storageAdapter, buffer, mime_type, storageKeyBase, assetId) {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || null;
  const height = metadata.height || null;
  const variants = [];

  for (const definition of responsiveVariantDefinitions) {
    if (!width || width <= definition.width) {
      continue;
    }

    const { data: nextBuffer, info: nextInfo } = await image
      .clone()
      .resize({
        fit: "inside",
        width: definition.width,
        withoutEnlargement: true,
      })
      .toBuffer({
        resolveWithObject: true,
      });
    const nextStorageKey = storageKeyBase.replace(/\.[^.]+$/, `-${definition.key}.${guessFileExtension(mime_type)}`);
    const storedVariant = await storageAdapter.writeObject({
      body: nextBuffer,
      contentType: mime_type,
      key: nextStorageKey,
    });

    variants.push({
      file_size_bytes: nextBuffer.length,
      format: nextInfo.format || guessFileExtension(mime_type),
      height: nextInfo.height || height || definition.width,
      local_path: storedVariant.local_path,
      media_asset_id: assetId,
      mime_type,
      public_url: storedVariant.public_url,
      storage_key: storedVariant.storage_key,
      variant_key: definition.key,
      width: nextInfo.width || definition.width,
    });
  }

  return {
    height,
    variants,
    width,
  };
}

async function storeMediaAssetRecord({
  actor_id,
  alt,
  attribution_text,
  buffer,
  caption,
  file_name,
  mime_type,
  prisma,
  source_url,
}) {
  const db = await resolvePrismaClient(prisma);
  const storageAdapter = createStorageAdapter();
  const safeSourceUrl = source_url ? sanitizeExternalUrl(source_url) : null;
  const storage_key = getStorageKey("media", mime_type, safeSourceUrl || file_name || mime_type);
  const storedFile = await storageAdapter.writeObject({
    body: buffer,
    contentType: mime_type,
    key: storage_key,
  });
  const asset = await db.mediaAsset.create({
    data: {
      alt: trimText(alt) || null,
      attribution_text: trimText(attribution_text) || null,
      caption: trimText(caption) || null,
      file_name: trimText(file_name) || path.basename(storage_key),
      file_size_bytes: buffer.length,
      local_path: storedFile.local_path,
      mime_type,
      public_url: storedFile.public_url,
      source_domain: safeSourceUrl ? new URL(safeSourceUrl).hostname : null,
      source_url: safeSourceUrl,
      storage_driver: storageAdapter.driver,
      storage_key: storedFile.storage_key,
    },
  });
  const { height, variants, width } = await createMediaVariants(
    storageAdapter,
    buffer,
    mime_type,
    storage_key,
    asset.id,
  );

  if (variants.length) {
    await db.mediaVariant.createMany({
      data: variants,
    });
  }

  const updatedAsset = await db.mediaAsset.update({
    where: { id: asset.id },
    data: {
      height,
      width,
    },
    include: {
      variants: true,
    },
  });

  await createAuditEventRecord(
    {
      action: "MEDIA_ASSET_STORED",
      actor_id,
      entity_id: updatedAsset.id,
      entity_type: "media_asset",
      payload_json: {
        source_url: updatedAsset.source_url,
        storage_key: updatedAsset.storage_key,
        variantCount: updatedAsset.variants.length,
      },
    },
    db,
  );

  return updatedAsset;
}

function ensureAllowedMimeType(mime_type) {
  if (!env.media.uploadAllowedMimeTypes.includes(mime_type)) {
    throw new NewsPubError(`Unsupported media type "${mime_type}".`, {
      status: "media_type_not_allowed",
      statusCode: 400,
    });
  }
}

function ensureSafeMediaSize(byteLength) {
  if (byteLength > env.media.maxRemoteFileBytes) {
    throw new NewsPubError(
      `Media asset exceeds the ${env.media.maxRemoteFileBytes} byte limit for remote ingestion.`,
      {
        status: "media_too_large",
        statusCode: 400,
      },
    );
  }
}

function createTimeoutSignal(timeoutMs) {
  if (typeof AbortSignal !== "undefined" && typeof AbortSignal.timeout === "function") {
    return AbortSignal.timeout(timeoutMs);
  }

  return undefined;
}

function parseContentLength(response) {
  const contentLength = Number.parseInt(response.headers.get("content-length") || "", 10);

  return Number.isFinite(contentLength) && contentLength >= 0 ? contentLength : null;
}

async function readResponseBodyWithLimit(response, maxBytes) {
  const contentLength = parseContentLength(response);

  if (contentLength !== null) {
    ensureSafeMediaSize(contentLength);
  }

  if (!response.body?.getReader) {
    const buffer = Buffer.from(await response.arrayBuffer());

    ensureSafeMediaSize(buffer.length);
    return buffer;
  }

  const reader = response.body.getReader();
  const chunks = [];
  let receivedBytes = 0;

  try {
    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      const chunk = Buffer.from(value);
      receivedBytes += chunk.length;

      if (receivedBytes > maxBytes) {
        await reader.cancel();
        ensureSafeMediaSize(receivedBytes);
      }

      chunks.push(chunk);
    }
  } finally {
    reader.releaseLock();
  }

  return Buffer.concat(chunks, receivedBytes);
}
/**
 * Ingests a remote media asset into the NewsPub media library.
 */

export async function ingestRemoteMediaAsset(input, options = {}, prisma) {
  const safeUrl = sanitizeExternalUrl(input.source_url);

  if (!safeUrl) {
    throw new NewsPubError("Remote media URL must use http or https.", {
      status: "media_url_invalid",
      statusCode: 400,
    });
  }

  let response;

  try {
    response = await fetch(safeUrl, {
      headers: {
        accept: env.media.uploadAllowedMimeTypes.join(","),
      },
      next: {
        revalidate: 0,
      },
      signal: createTimeoutSignal(remoteMediaRequestTimeoutMs),
    });
  } catch (error) {
    throw new NewsPubError(
      error?.name === "TimeoutError" || error?.name === "AbortError"
        ? "Remote media request timed out."
        : "Remote media request failed before the file could be inspected.",
      {
        status: "media_download_failed",
        statusCode: 502,
      },
    );
  }

  if (!response.ok) {
    throw new NewsPubError(`Remote media request failed with status ${response.status}.`, {
      status: "media_download_failed",
      statusCode: 502,
    });
  }

  const mime_type = trimText(response.headers.get("content-type") || "").split(";")[0];
  ensureAllowedMimeType(mime_type);
  const buffer = await readResponseBodyWithLimit(response, env.media.maxRemoteFileBytes);

  return storeMediaAssetRecord(
    {
      actor_id: options.actor_id,
      alt: input.alt,
      attribution_text: input.attribution_text,
      buffer,
      caption: input.caption,
      file_name: input.file_name || path.basename(new URL(safeUrl).pathname) || "remote-image",
      mime_type,
      source_url: safeUrl,
    },
    options,
    prisma,
  );
}

/** Stores a locally uploaded media asset and derives responsive variants. */
export async function uploadMediaAsset(input, options = {}, prisma) {
  const mime_type = trimText(input.mime_type);
  const buffer = input.buffer instanceof Buffer ? input.buffer : Buffer.from(input.buffer || []);

  ensureAllowedMimeType(mime_type);
  ensureSafeMediaSize(buffer.length);

  return storeMediaAssetRecord(
    {
      actor_id: options.actor_id,
      alt: input.alt,
      attribution_text: input.attribution_text,
      buffer,
      caption: input.caption,
      file_name: input.file_name || "upload",
      mime_type,
      source_url: input.source_url || null,
    },
    options,
    prisma,
  );
}

/** Returns the current media-library inventory with variants included. */
export async function getMediaLibrarySnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [assets, totalCount, variantCount] = await Promise.all([
    db.mediaAsset.findMany({
      orderBy: [{ created_at: "desc" }],
      select: {
        _count: {
          select: {
            variants: true,
          },
        },
        alt: true,
        caption: true,
        created_at: true,
        file_name: true,
        file_size_bytes: true,
        id: true,
        mime_type: true,
        public_url: true,
        source_domain: true,
        source_url: true,
        storage_driver: true,
        storage_key: true,
        updated_at: true,
      },
      take: mediaLibrarySnapshotLimit,
    }),
    db.mediaAsset.count(),
    db.mediaVariant.count(),
  ]);

  const mappedAssets = assets.map((asset) => {
    const { _count, ...assetFields } = asset;

    return {
      ...assetFields,
      variantCount: _count.variants,
    };
  });

  return {
    assets: mappedAssets,
    summary: {
      returnedCount: mappedAssets.length,
      totalCount,
      variantCount,
    },
  };
}

/** Wraps remote media ingestion so workflow callers can continue after recoverable failures. */
export async function safeIngestRemoteMediaAsset(input, options = {}, prisma) {
  try {
    return await ingestRemoteMediaAsset(input, options, prisma);
  } catch (error) {
    await recordObservabilityEvent(
      {
        action: "MEDIA_LIBRARY_FAILURE",
        entity_id: input.source_url || input.file_name || "remote_media",
        entity_type: "media_asset",
        error,
        message: error instanceof Error ? error.message : "Media ingestion failed.",
      },
      prisma,
    );

    return null;
  }
}

export { responsiveVariantDefinitions };
