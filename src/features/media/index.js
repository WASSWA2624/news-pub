import path from "node:path";

import sharp from "sharp";

import { createAuditEventRecord, recordObservabilityEvent } from "@/lib/analytics";
import { env } from "@/lib/env/server";
import { createStorageAdapter } from "@/lib/storage";
import { sanitizeExternalUrl } from "@/lib/security";
import { NewsPubError, createContentHash, resolvePrismaClient, trimText } from "@/lib/news/shared";

const responsiveVariantDefinitions = Object.freeze([
  { key: "xl", width: 1600 },
  { key: "lg", width: 1200 },
  { key: "md", width: 800 },
  { key: "sm", width: 480 },
]);

function guessFileExtension(mimeType) {
  if (mimeType === "image/jpeg") {
    return "jpg";
  }

  if (mimeType === "image/png") {
    return "png";
  }

  if (mimeType === "image/webp") {
    return "webp";
  }

  return "bin";
}

function getStorageKey(prefix, mimeType, source) {
  const extension = guessFileExtension(mimeType);
  const date = new Date();
  const datePrefix = `${date.getUTCFullYear()}/${`${date.getUTCMonth() + 1}`.padStart(2, "0")}`;

  return `${prefix}/${datePrefix}/${createContentHash(source, date.toISOString()).slice(0, 24)}.${extension}`;
}

async function createMediaVariants(storageAdapter, buffer, mimeType, storageKeyBase, assetId) {
  const image = sharp(buffer);
  const metadata = await image.metadata();
  const width = metadata.width || null;
  const height = metadata.height || null;
  const variants = [];

  for (const definition of responsiveVariantDefinitions) {
    if (!width || width <= definition.width) {
      continue;
    }

    const nextBuffer = await sharp(buffer)
      .resize({
        fit: "inside",
        width: definition.width,
        withoutEnlargement: true,
      })
      .toBuffer();
    const nextMetadata = await sharp(nextBuffer).metadata();
    const nextStorageKey = storageKeyBase.replace(/\.[^.]+$/, `-${definition.key}.${guessFileExtension(mimeType)}`);
    const storedVariant = await storageAdapter.writeObject({
      body: nextBuffer,
      contentType: mimeType,
      key: nextStorageKey,
    });

    variants.push({
      fileSizeBytes: nextBuffer.length,
      format: nextMetadata.format || guessFileExtension(mimeType),
      height: nextMetadata.height || height || definition.width,
      localPath: storedVariant.localPath,
      mediaAssetId: assetId,
      mimeType,
      publicUrl: storedVariant.publicUrl,
      storageKey: storedVariant.storageKey,
      variantKey: definition.key,
      width: nextMetadata.width || definition.width,
    });
  }

  return {
    height,
    variants,
    width,
  };
}

async function storeMediaAssetRecord({
  actorId,
  alt,
  attributionText,
  buffer,
  caption,
  fileName,
  mimeType,
  prisma,
  sourceUrl,
}) {
  const db = await resolvePrismaClient(prisma);
  const storageAdapter = createStorageAdapter();
  const safeSourceUrl = sourceUrl ? sanitizeExternalUrl(sourceUrl) : null;
  const storageKey = getStorageKey("media", mimeType, safeSourceUrl || fileName || mimeType);
  const storedFile = await storageAdapter.writeObject({
    body: buffer,
    contentType: mimeType,
    key: storageKey,
  });
  const asset = await db.mediaAsset.create({
    data: {
      alt: trimText(alt) || null,
      attributionText: trimText(attributionText) || null,
      caption: trimText(caption) || null,
      fileName: trimText(fileName) || path.basename(storageKey),
      fileSizeBytes: buffer.length,
      localPath: storedFile.localPath,
      mimeType,
      publicUrl: storedFile.publicUrl,
      sourceDomain: safeSourceUrl ? new URL(safeSourceUrl).hostname : null,
      sourceUrl: safeSourceUrl,
      storageDriver: storageAdapter.driver,
      storageKey: storedFile.storageKey,
    },
  });
  const { height, variants, width } = await createMediaVariants(
    storageAdapter,
    buffer,
    mimeType,
    storageKey,
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
      actorId,
      entityId: updatedAsset.id,
      entityType: "media_asset",
      payloadJson: {
        sourceUrl: updatedAsset.sourceUrl,
        storageKey: updatedAsset.storageKey,
        variantCount: updatedAsset.variants.length,
      },
    },
    db,
  );

  return updatedAsset;
}

function ensureAllowedMimeType(mimeType) {
  if (!env.media.uploadAllowedMimeTypes.includes(mimeType)) {
    throw new NewsPubError(`Unsupported media type "${mimeType}".`, {
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

export async function ingestRemoteMediaAsset(input, options = {}, prisma) {
  const safeUrl = sanitizeExternalUrl(input.sourceUrl);

  if (!safeUrl) {
    throw new NewsPubError("Remote media URL must use http or https.", {
      status: "media_url_invalid",
      statusCode: 400,
    });
  }

  const response = await fetch(safeUrl, {
    headers: {
      accept: env.media.uploadAllowedMimeTypes.join(","),
    },
    next: {
      revalidate: 0,
    },
  });

  if (!response.ok) {
    throw new NewsPubError(`Remote media request failed with status ${response.status}.`, {
      status: "media_download_failed",
      statusCode: 502,
    });
  }

  const mimeType = trimText(response.headers.get("content-type") || "").split(";")[0];
  ensureAllowedMimeType(mimeType);
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  ensureSafeMediaSize(buffer.length);

  return storeMediaAssetRecord(
    {
      actorId: options.actorId,
      alt: input.alt,
      attributionText: input.attributionText,
      buffer,
      caption: input.caption,
      fileName: input.fileName || path.basename(new URL(safeUrl).pathname) || "remote-image",
      mimeType,
      sourceUrl: safeUrl,
    },
    options,
    prisma,
  );
}

export async function uploadMediaAsset(input, options = {}, prisma) {
  const mimeType = trimText(input.mimeType);
  const buffer = input.buffer instanceof Buffer ? input.buffer : Buffer.from(input.buffer || []);

  ensureAllowedMimeType(mimeType);
  ensureSafeMediaSize(buffer.length);

  return storeMediaAssetRecord(
    {
      actorId: options.actorId,
      alt: input.alt,
      attributionText: input.attributionText,
      buffer,
      caption: input.caption,
      fileName: input.fileName || "upload",
      mimeType,
      sourceUrl: input.sourceUrl || null,
    },
    options,
    prisma,
  );
}

export async function getMediaLibrarySnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const assets = await db.mediaAsset.findMany({
    include: {
      variants: {
        orderBy: {
          width: "desc",
        },
      },
    },
    orderBy: [{ createdAt: "desc" }],
  });

  return {
    assets,
    summary: {
      totalCount: assets.length,
      variantCount: assets.reduce((total, asset) => total + asset.variants.length, 0),
    },
  };
}

export async function safeIngestRemoteMediaAsset(input, options = {}, prisma) {
  try {
    return await ingestRemoteMediaAsset(input, options, prisma);
  } catch (error) {
    await recordObservabilityEvent(
      {
        action: "MEDIA_LIBRARY_FAILURE",
        entityId: input.sourceUrl || input.fileName || "remote_media",
        entityType: "media_asset",
        error,
        message: error instanceof Error ? error.message : "Media ingestion failed.",
      },
      prisma,
    );

    return null;
  }
}

export { responsiveVariantDefinitions };
