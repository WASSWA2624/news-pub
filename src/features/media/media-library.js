import crypto from "node:crypto";
import path from "node:path";

import sharp from "sharp";
import { z } from "zod";

import { env } from "@/lib/env/server";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import { sanitizeExternalUrl } from "@/lib/security";
import { createStorageAdapter } from "@/lib/storage";

const supportedImageMimeTypes = Object.freeze({
  "image/jpeg": Object.freeze({
    extension: "jpg",
    format: "jpeg",
  }),
  "image/png": Object.freeze({
    extension: "png",
    format: "png",
  }),
  "image/webp": Object.freeze({
    extension: "webp",
    format: "webp",
  }),
});

const extensionMimeTypes = Object.freeze({
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".png": "image/png",
  ".webp": "image/webp",
});

const sharpFormatMimeTypes = Object.freeze({
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
});

export const responsiveVariantDefinitions = Object.freeze([
  Object.freeze({
    key: "thumb",
    width: 320,
  }),
  Object.freeze({
    key: "medium",
    width: 640,
  }),
  Object.freeze({
    key: "large",
    width: 1280,
  }),
]);

const mediaUploadMetadataSchema = z
  .object({
    alt: z.string().optional(),
    attributionText: z.string().optional(),
    caption: z.string().optional(),
    fileName: z.string().trim().min(1),
    isAiGenerated: z.boolean().optional().default(false),
    licenseType: z.string().optional(),
    mimeType: z.string().optional(),
    sourceUrl: z.string().optional(),
    usageNotes: z.string().optional(),
  })
  .strict()
  .superRefine((value, context) => {
    const sourceUrl = normalizeOptionalText(value.sourceUrl);

    if (sourceUrl && !sanitizeExternalUrl(sourceUrl)) {
      context.addIssue({
        code: z.ZodIssueCode.custom,
        message: "sourceUrl must be a valid http or https URL when provided.",
        path: ["sourceUrl"],
      });
    }
  });

const mediaVariantScalarFields = Object.freeze([
  "createdAt",
  "fileSizeBytes",
  "format",
  "height",
  "id",
  "localPath",
  "mimeType",
  "publicUrl",
  "storageKey",
  "updatedAt",
  "variantKey",
  "width",
]);

const mediaAssetScalarFields = Object.freeze([
  "alt",
  "attributionText",
  "caption",
  "createdAt",
  "fileName",
  "fileSizeBytes",
  "height",
  "id",
  "isAiGenerated",
  "licenseType",
  "localPath",
  "mimeType",
  "publicUrl",
  "sourceDomain",
  "sourceUrl",
  "storageDriver",
  "storageKey",
  "updatedAt",
  "usageNotes",
  "width",
]);

export class MediaLibraryError extends Error {
  constructor(message, { status = "invalid_media_asset", statusCode = 400 } = {}) {
    super(message);
    this.name = "MediaLibraryError";
    this.status = status;
    this.statusCode = statusCode;
  }
}

async function resolvePrismaClient(prisma) {
  if (prisma) {
    return prisma;
  }

  const { getPrismaClient } = await import("@/lib/prisma");

  return getPrismaClient();
}

function serializeDate(value) {
  return value instanceof Date ? value.toISOString() : null;
}

function normalizeOptionalText(value) {
  const normalized = normalizeDisplayText(value);

  return normalized || null;
}

function getRuntimeModelFieldNames(db, modelName) {
  return db?._runtimeDataModel?.models?.[modelName]?.fields?.map((field) => field.name) || null;
}

function createRuntimeFieldPredicate(db, modelName) {
  const fieldNames = getRuntimeModelFieldNames(db, modelName);

  if (!fieldNames) {
    return () => true;
  }

  const fieldSet = new Set(fieldNames);

  return (fieldName) => fieldSet.has(fieldName);
}

function createMediaVariantSelect(db) {
  const hasField = createRuntimeFieldPredicate(db, "MediaVariant");

  return mediaVariantScalarFields.reduce((select, fieldName) => {
    if (hasField(fieldName)) {
      select[fieldName] = true;
    }

    return select;
  }, {});
}

function createMediaAssetSelect(db) {
  const hasField = createRuntimeFieldPredicate(db, "MediaAsset");
  const select = mediaAssetScalarFields.reduce((result, fieldName) => {
    if (hasField(fieldName)) {
      result[fieldName] = true;
    }

    return result;
  }, {});

  if (hasField("variants")) {
    select.variants = {
      orderBy: {
        width: "asc",
      },
      select: createMediaVariantSelect(db),
    };
  }

  return select;
}

function normalizeBoolean(value) {
  if (typeof value === "boolean") {
    return value;
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase();

    return normalized === "true" || normalized === "1" || normalized === "on";
  }

  return false;
}

function normalizeMimeType(value) {
  const normalized = normalizeOptionalText(value);

  return normalized ? normalized.toLowerCase() : null;
}

function getFileNameBase(fileName) {
  return path.basename(fileName).replace(/\.[^.]+$/, "");
}

function toReadableLabel(value) {
  return value
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function createGeneratedAltText(fileName, isAiGenerated) {
  const readableBase = toReadableLabel(
    normalizeDisplayText(getFileNameBase(fileName).replace(/[-_]+/g, " ")) || "media asset",
  );

  return `${readableBase} ${isAiGenerated ? "illustration" : "image"}`;
}

function getSourceDomain(sourceUrl) {
  if (!sourceUrl) {
    return null;
  }

  try {
    return new URL(sourceUrl).hostname;
  } catch {
    return null;
  }
}

function resolveMimeType(inputMimeType, fileName, format) {
  const normalizedInputMimeType = normalizeMimeType(inputMimeType);

  if (normalizedInputMimeType) {
    return normalizedInputMimeType;
  }

  const extensionMimeType = extensionMimeTypes[path.extname(fileName).toLowerCase()];

  if (extensionMimeType) {
    return extensionMimeType;
  }

  return sharpFormatMimeTypes[format] || null;
}

function assertAllowedMimeType(mimeType, allowedMimeTypes) {
  if (!mimeType) {
    throw new MediaLibraryError("The uploaded file type could not be determined.", {
      status: "missing_mime_type",
      statusCode: 400,
    });
  }

  if (!allowedMimeTypes.includes(mimeType)) {
    throw new MediaLibraryError(`MIME type "${mimeType}" is not allowed for uploads.`, {
      status: "disallowed_mime_type",
      statusCode: 415,
    });
  }

  if (!supportedImageMimeTypes[mimeType]) {
    throw new MediaLibraryError(`MIME type "${mimeType}" is not supported by the media pipeline yet.`, {
      status: "unsupported_mime_type",
      statusCode: 415,
    });
  }
}

async function createPrimaryAssetBuffer(fileBuffer, mimeType) {
  const image = sharp(fileBuffer).rotate();
  const output = supportedImageMimeTypes[mimeType];

  if (!output) {
    throw new MediaLibraryError(`MIME type "${mimeType}" is not supported by the media pipeline yet.`, {
      status: "unsupported_mime_type",
      statusCode: 415,
    });
  }

  let bufferResult;

  if (output.format === "jpeg") {
    bufferResult = await image
      .jpeg({
        mozjpeg: true,
        quality: 82,
      })
      .toBuffer({ resolveWithObject: true });
  } else if (output.format === "png") {
    bufferResult = await image
      .png({
        compressionLevel: 9,
        palette: true,
      })
      .toBuffer({ resolveWithObject: true });
  } else {
    bufferResult = await image
      .webp({
        quality: 82,
      })
      .toBuffer({ resolveWithObject: true });
  }

  if (!bufferResult.info.width || !bufferResult.info.height) {
    throw new MediaLibraryError("The uploaded image is missing width or height metadata.", {
      status: "invalid_image_dimensions",
      statusCode: 400,
    });
  }

  return {
    buffer: bufferResult.data,
    extension: output.extension,
    fileSizeBytes: bufferResult.info.size,
    height: bufferResult.info.height,
    mimeType,
    width: bufferResult.info.width,
  };
}

async function createResponsiveVariants(fileBuffer, width) {
  const variants = [];

  for (const definition of responsiveVariantDefinitions) {
    if (definition.width >= width) {
      continue;
    }

    const bufferResult = await sharp(fileBuffer)
      .resize({
        fit: "inside",
        width: definition.width,
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
      })
      .toBuffer({ resolveWithObject: true });

    if (!bufferResult.info.width || !bufferResult.info.height) {
      continue;
    }

    variants.push({
      buffer: bufferResult.data,
      fileSizeBytes: bufferResult.info.size,
      format: "webp",
      height: bufferResult.info.height,
      mimeType: "image/webp",
      variantKey: definition.key,
      width: bufferResult.info.width,
    });
  }

  return variants;
}

function createStoragePrefix(fileName, now = new Date()) {
  const dateSegment = now.toISOString().slice(0, 10).replace(/-/g, "/");
  const baseName = createSlug(getFileNameBase(fileName), "media");

  return `media/${dateSegment}/${crypto.randomUUID()}-${baseName}`;
}

function createPreviewUrl(asset) {
  return asset.publicUrl || asset.variants?.[0]?.publicUrl || asset.sourceUrl || null;
}

function serializeMediaVariant(variant) {
  return {
    createdAt: serializeDate(variant.createdAt),
    fileSizeBytes: variant.fileSizeBytes,
    format: variant.format,
    height: variant.height,
    id: variant.id,
    localPath: variant.localPath,
    mimeType: variant.mimeType,
    publicUrl: variant.publicUrl,
    storageKey: variant.storageKey,
    updatedAt: serializeDate(variant.updatedAt),
    variantKey: variant.variantKey,
    width: variant.width,
  };
}

function serializeMediaAsset(asset) {
  const variants = Array.isArray(asset.variants) ? asset.variants : [];

  return {
    alt: asset.alt || null,
    attributionText: asset.attributionText || null,
    caption: asset.caption || null,
    createdAt: serializeDate(asset.createdAt),
    fileName: asset.fileName || null,
    fileSizeBytes: asset.fileSizeBytes,
    height: asset.height,
    id: asset.id,
    isAiGenerated: Boolean(asset.isAiGenerated),
    licenseType: asset.licenseType || null,
    localPath: asset.localPath || null,
    mimeType: asset.mimeType || null,
    previewUrl: createPreviewUrl(asset),
    publicUrl: asset.publicUrl || null,
    sourceDomain: asset.sourceDomain || null,
    sourceUrl: asset.sourceUrl || null,
    storageDriver: asset.storageDriver,
    storageKey: asset.storageKey || null,
    updatedAt: serializeDate(asset.updatedAt),
    usageNotes: asset.usageNotes || null,
    variants: variants.map(serializeMediaVariant),
    variantCount: variants.length,
    width: asset.width,
  };
}

function buildMediaLibraryWhere(db, query) {
  if (!query) {
    return undefined;
  }

  const hasField = createRuntimeFieldPredicate(db, "MediaAsset");
  const or = [
    hasField("alt")
      ? {
          alt: {
            contains: query,
          },
        }
      : null,
    hasField("attributionText")
      ? {
          attributionText: {
            contains: query,
          },
        }
      : null,
    hasField("caption")
      ? {
          caption: {
            contains: query,
          },
        }
      : null,
    hasField("fileName")
      ? {
          fileName: {
            contains: query,
          },
        }
      : null,
    hasField("sourceDomain")
      ? {
          sourceDomain: {
            contains: query,
          },
        }
      : null,
    hasField("storageKey")
      ? {
          storageKey: {
            contains: query,
          },
        }
      : null,
  ].filter(Boolean);

  return or.length ? { OR: or } : undefined;
}

function normalizeMediaUploadInput(input) {
  try {
    return mediaUploadMetadataSchema.parse({
      alt: input.alt,
      attributionText: input.attributionText,
      caption: input.caption,
      fileName: path.basename(`${input.fileName || "upload"}`),
      isAiGenerated: normalizeBoolean(input.isAiGenerated),
      licenseType: input.licenseType,
      mimeType: input.mimeType,
      sourceUrl: input.sourceUrl,
      usageNotes: input.usageNotes,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      throw new MediaLibraryError(error.issues[0]?.message || "Invalid media metadata.", {
        status: "invalid_media_metadata",
        statusCode: 400,
      });
    }

    throw error;
  }
}

export async function getMediaLibrarySnapshot({ assetId, query } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const normalizedQuery = normalizeDisplayText(query) || "";
  const where = buildMediaLibraryWhere(db, normalizedQuery);
  const mediaAssetSelect = createMediaAssetSelect(db);
  const [totalAssetCount, aiGeneratedCount, matchedCount, assets] = await Promise.all([
    db.mediaAsset.count(),
    db.mediaAsset.count({
      where: {
        isAiGenerated: true,
      },
    }),
    db.mediaAsset.count({
      where,
    }),
    db.mediaAsset.findMany({
      orderBy: {
        createdAt: "desc",
      },
      select: mediaAssetSelect,
      take: 24,
      where,
    }),
  ]);
  const totalVariantCount =
    typeof db.mediaVariant?.count === "function"
      ? await db.mediaVariant.count()
      : assets.reduce((count, asset) => count + (asset.variants?.length || 0), 0);
  const resolvedSelectedAsset =
    assets.find((asset) => asset.id === assetId) ||
    (assetId
      ? await db.mediaAsset.findUnique({
          select: mediaAssetSelect,
          where: {
            id: assetId,
          },
        })
      : null) ||
    assets[0] ||
    null;

  return {
    assets: assets.map(serializeMediaAsset),
    configuration: {
      driver: env.media.driver,
      uploadAllowedMimeTypes: env.media.uploadAllowedMimeTypes,
    },
    editor: {
      asset: resolvedSelectedAsset ? serializeMediaAsset(resolvedSelectedAsset) : null,
    },
    filters: {
      query: normalizedQuery,
    },
    selection: {
      assetId: resolvedSelectedAsset?.id || null,
    },
    summary: {
      aiGeneratedCount,
      matchedCount,
      sourceBackedCount: totalAssetCount - aiGeneratedCount,
      totalAssetCount,
      totalVariantCount,
    },
  };
}

export async function uploadMediaAsset(input, options = {}, prisma) {
  const parsedInput = normalizeMediaUploadInput(input);
  const fileBuffer = Buffer.isBuffer(input.fileBuffer) ? input.fileBuffer : Buffer.from(input.fileBuffer || []);

  if (!fileBuffer.length) {
    throw new MediaLibraryError("A file is required for media uploads.", {
      status: "missing_file",
      statusCode: 400,
    });
  }

  const allowedMimeTypes = options.allowedMimeTypes || env.media.uploadAllowedMimeTypes;
  const storageAdapter = options.storageAdapter || createStorageAdapter(options.mediaConfig);
  const primaryProbe = await sharp(fileBuffer)
    .metadata()
    .catch(() => null);
  const mimeType = resolveMimeType(parsedInput.mimeType, parsedInput.fileName, primaryProbe?.format);

  assertAllowedMimeType(mimeType, allowedMimeTypes);

  const primaryAsset = await createPrimaryAssetBuffer(fileBuffer, mimeType).catch((error) => {
    if (error instanceof MediaLibraryError) {
      throw error;
    }

    throw new MediaLibraryError("The uploaded file could not be processed as a supported image.", {
      status: "invalid_image_file",
      statusCode: 400,
    });
  });

  const responsiveVariants = await createResponsiveVariants(primaryAsset.buffer, primaryAsset.width);
  const storagePrefix = createStoragePrefix(parsedInput.fileName, options.now);
  const sourceUrl = sanitizeExternalUrl(parsedInput.sourceUrl);
  const altText = normalizeOptionalText(parsedInput.alt) || createGeneratedAltText(parsedInput.fileName, parsedInput.isAiGenerated);
  const storedObjects = [];

  try {
    const originalUpload = await storageAdapter.writeObject({
      body: primaryAsset.buffer,
      cacheControl: "public, max-age=31536000, immutable",
      contentType: primaryAsset.mimeType,
      key: `${storagePrefix}/original.${primaryAsset.extension}`,
    });

    storedObjects.push(originalUpload.storageKey);

    const uploadedVariants = [];

    for (const variant of responsiveVariants) {
      const uploadedVariant = await storageAdapter.writeObject({
        body: variant.buffer,
        cacheControl: "public, max-age=31536000, immutable",
        contentType: variant.mimeType,
        key: `${storagePrefix}/${variant.variantKey}.${variant.format}`,
      });

      storedObjects.push(uploadedVariant.storageKey);
      uploadedVariants.push({
        ...variant,
        ...uploadedVariant,
      });
    }

    const db = await resolvePrismaClient(prisma);
    const createdAsset = await db.$transaction(async (tx) => {
      const mediaAssetSelect = createMediaAssetSelect(tx);
      const asset = await tx.mediaAsset.create({
        data: {
          alt: altText,
          attributionText: normalizeOptionalText(parsedInput.attributionText),
          caption: normalizeOptionalText(parsedInput.caption),
          fileName: parsedInput.fileName,
          fileSizeBytes: primaryAsset.fileSizeBytes,
          height: primaryAsset.height,
          isAiGenerated: parsedInput.isAiGenerated,
          licenseType: normalizeOptionalText(parsedInput.licenseType),
          localPath: originalUpload.localPath,
          mimeType: primaryAsset.mimeType,
          publicUrl: originalUpload.publicUrl,
          sourceDomain: getSourceDomain(sourceUrl),
          sourceUrl,
          storageDriver: storageAdapter.driver,
          storageKey: originalUpload.storageKey,
          usageNotes: normalizeOptionalText(parsedInput.usageNotes),
          variants: {
            create: uploadedVariants.map((variant) => ({
              fileSizeBytes: variant.fileSizeBytes,
              format: variant.format,
              height: variant.height,
              localPath: variant.localPath,
              mimeType: variant.mimeType,
              publicUrl: variant.publicUrl,
              storageKey: variant.storageKey,
              variantKey: variant.variantKey,
              width: variant.width,
            })),
          },
          width: primaryAsset.width,
        },
        select: {
          id: true,
        },
      });

      if (options.actorId) {
        await tx.auditEvent.create({
          data: {
            action: "MEDIA_ASSET_UPLOADED",
            actorId: options.actorId,
            entityId: asset.id,
            entityType: "media_asset",
            payloadJson: {
              isAiGenerated: parsedInput.isAiGenerated,
              sourceUrl,
              storageDriver: storageAdapter.driver,
              variantCount: uploadedVariants.length,
            },
          },
        });
      }

      return tx.mediaAsset.findUnique({
        select: mediaAssetSelect,
        where: {
          id: asset.id,
        },
      });
    });

    return {
      asset: serializeMediaAsset(createdAsset),
      snapshot: await getMediaLibrarySnapshot(
        {
          assetId: createdAsset.id,
        },
        db,
      ),
    };
  } catch (error) {
    await Promise.all(
      storedObjects.map((storageKey) =>
        storageAdapter.deleteObject(storageKey).catch(() => {}),
      ),
    );

    throw error;
  }
}

export function createMediaLibraryErrorPayload(error) {
  if (error instanceof MediaLibraryError) {
    return {
      body: {
        message: error.message,
        status: error.status,
        success: false,
      },
      statusCode: error.statusCode,
    };
  }

  console.error(error);

  return {
    body: {
      message: "An unexpected media-library error occurred.",
      status: "internal_error",
      success: false,
    },
    statusCode: 500,
  };
}
