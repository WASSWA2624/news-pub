import sharp from "sharp";
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

function createMockPrisma() {
  const state = {
    asset: null,
  };

  function buildAssetRecord(data) {
    const createdAt = new Date("2026-04-03T10:00:00.000Z");

    return {
      alt: data.alt,
      attributionText: data.attributionText,
      caption: data.caption,
      createdAt,
      fileName: data.fileName,
      fileSizeBytes: data.fileSizeBytes,
      height: data.height,
      id: "asset_1",
      isAiGenerated: data.isAiGenerated,
      licenseType: data.licenseType,
      localPath: data.localPath,
      mimeType: data.mimeType,
      publicUrl: data.publicUrl,
      sourceDomain: data.sourceDomain,
      sourceUrl: data.sourceUrl,
      storageDriver: data.storageDriver,
      storageKey: data.storageKey,
      updatedAt: createdAt,
      usageNotes: data.usageNotes,
      variants: (data.variants?.create || []).map((variant, index) => ({
        createdAt,
        ...variant,
        id: `variant_${index + 1}`,
        updatedAt: createdAt,
      })),
      width: data.width,
    };
  }

  const prisma = {
    $transaction: async (callback) => callback(prisma),
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    mediaAsset: {
      count: vi.fn(async (args = {}) => {
        if (!state.asset) {
          return 0;
        }

        if (args.where?.isAiGenerated === true) {
          return state.asset.isAiGenerated ? 1 : 0;
        }

        return 1;
      }),
      create: vi.fn(async ({ data }) => {
        state.asset = buildAssetRecord(data);
        return {
          id: state.asset.id,
        };
      }),
      findMany: vi.fn(async () => (state.asset ? [state.asset] : [])),
      findUnique: vi.fn(async () => state.asset),
    },
    mediaVariant: {
      count: vi.fn(async () => state.asset?.variants.length || 0),
    },
    state,
  };

  return prisma;
}

function createSnapshotOnlyPrisma() {
  const createdAt = new Date("2026-04-03T10:00:00.000Z");

  return {
    mediaAsset: {
      count: vi.fn(async (args = {}) => {
        if (args.where?.isAiGenerated === true) {
          return 1;
        }

        return 1;
      }),
      findMany: vi.fn(async () => [
        {
          alt: "Stored microscope image",
          attributionText: "Example attribution",
          caption: "Microscope",
          createdAt,
          fileName: "microscope.png",
          fileSizeBytes: 1024,
          height: 600,
          id: "asset_1",
          isAiGenerated: true,
          licenseType: "editorial-use",
          localPath: "public/uploads/media/example/original.png",
          mimeType: "image/png",
          publicUrl: "/uploads/media/example/original.png",
          sourceDomain: "example.com",
          sourceUrl: "https://example.com/microscope.png",
          storageDriver: "local",
          storageKey: "media/example/original.png",
          updatedAt: createdAt,
          usageNotes: "Use in previews.",
          variants: [
            {
              createdAt,
              fileSizeBytes: 300,
              format: "webp",
              height: 320,
              id: "variant_1",
              localPath: "public/uploads/media/example/thumb.webp",
              mimeType: "image/webp",
              publicUrl: "/uploads/media/example/thumb.webp",
              storageKey: "media/example/thumb.webp",
              updatedAt: createdAt,
              variantKey: "thumb",
              width: 320,
            },
          ],
          width: 900,
        },
      ]),
      findUnique: vi.fn(async () => null),
    },
  };
}

function createLegacySnapshotPrisma() {
  const createdAt = new Date("2026-04-03T10:00:00.000Z");

  return {
    _runtimeDataModel: {
      models: {
        MediaAsset: {
          fields: [
            { name: "id" },
            { name: "alt" },
            { name: "caption" },
            { name: "createdAt" },
            { name: "updatedAt" },
            { name: "storageDriver" },
            { name: "storageKey" },
            { name: "publicUrl" },
            { name: "sourceDomain" },
            { name: "sourceUrl" },
            { name: "mimeType" },
            { name: "width" },
            { name: "height" },
            { name: "attributionText" },
            { name: "licenseType" },
            { name: "usageNotes" },
            { name: "isAiGenerated" },
            { name: "localPath" },
          ],
        },
      },
    },
    mediaAsset: {
      count: vi.fn(async () => 1),
      findMany: vi.fn(async (args) => {
        expect(args.select.fileName).toBeUndefined();
        expect(args.select.variants).toBeUndefined();
        expect(args.where?.OR?.some((entry) => Object.prototype.hasOwnProperty.call(entry, "fileName"))).toBe(
          false,
        );

        return [
          {
            alt: "Legacy microscope image",
            attributionText: "Legacy attribution",
            caption: "Legacy caption",
            createdAt,
            height: 480,
            id: "asset_legacy",
            isAiGenerated: false,
            licenseType: "legacy",
            localPath: "public/uploads/legacy.png",
            mimeType: "image/png",
            publicUrl: "/uploads/legacy.png",
            sourceDomain: "legacy.example.com",
            sourceUrl: "https://legacy.example.com/image.png",
            storageDriver: "local",
            storageKey: "legacy.png",
            updatedAt: createdAt,
            usageNotes: "Legacy asset",
            width: 640,
          },
        ];
      }),
      findUnique: vi.fn(async () => null),
    },
  };
}

const originalEnv = process.env;

describe("media library pipeline", () => {
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

  it("persists media metadata and responsive variants for uploaded assets", async () => {
    const imageBuffer = await sharp({
      create: {
        background: {
          b: 190,
          g: 120,
          r: 25,
        },
        channels: 3,
        height: 900,
        width: 1600,
      },
    })
      .png()
      .toBuffer();
    const storageAdapter = {
      deleteObject: vi.fn().mockResolvedValue(undefined),
      driver: "local",
      writeObject: vi.fn(async ({ key }) => ({
        localPath: `public/uploads/${key}`,
        publicUrl: `/uploads/${key}`,
        storageKey: key,
      })),
    };
    const prisma = createMockPrisma();
    const { uploadMediaAsset } = await import("./index");

    const result = await uploadMediaAsset(
      {
        attributionText: "Example source credit",
        caption: "Microscope overview",
        fileBuffer: imageBuffer,
        fileName: "portable-microscope.png",
        isAiGenerated: false,
        licenseType: "editorial-use",
        mimeType: "image/png",
        sourceUrl: "https://example.com/microscope.png",
        usageNotes: "Use for hero image slots.",
      },
      {
        actorId: "user_1",
        allowedMimeTypes: ["image/png"],
        now: new Date("2026-04-03T10:00:00.000Z"),
        storageAdapter,
      },
      prisma,
    );

    expect(storageAdapter.writeObject).toHaveBeenCalledTimes(4);
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MEDIA_ASSET_UPLOADED",
          actorId: "user_1",
          entityType: "media_asset",
        }),
      }),
    );
    expect(result.asset).toMatchObject({
      alt: "Portable Microscope image",
      attributionText: "Example source credit",
      caption: "Microscope overview",
      fileName: "portable-microscope.png",
      isAiGenerated: false,
      licenseType: "editorial-use",
      mimeType: "image/png",
      sourceDomain: "example.com",
      sourceUrl: "https://example.com/microscope.png",
      storageDriver: "local",
      usageNotes: "Use for hero image slots.",
      variantCount: 3,
      width: 1600,
    });
    expect(result.snapshot.summary).toMatchObject({
      aiGeneratedCount: 0,
      totalAssetCount: 1,
      totalVariantCount: 3,
    });
  });

  it("blocks uploads when the MIME type is not on the allowlist", async () => {
    const imageBuffer = await sharp({
      create: {
        background: {
          b: 190,
          g: 120,
          r: 25,
        },
        channels: 3,
        height: 300,
        width: 300,
      },
    })
      .png()
      .toBuffer();
    const { MediaLibraryError, uploadMediaAsset } = await import("./index");

    await expect(
      uploadMediaAsset(
        {
          fileBuffer: imageBuffer,
          fileName: "blocked-image.png",
          mimeType: "image/png",
        },
        {
          allowedMimeTypes: ["image/jpeg"],
          storageAdapter: {
            deleteObject: vi.fn(),
            driver: "local",
            writeObject: vi.fn(),
          },
        },
      ),
    ).rejects.toBeInstanceOf(MediaLibraryError);
  });

  it("rejects non-http source URLs before storing upload metadata", async () => {
    const imageBuffer = await sharp({
      create: {
        background: {
          b: 190,
          g: 120,
          r: 25,
        },
        channels: 3,
        height: 300,
        width: 300,
      },
    })
      .png()
      .toBuffer();
    const { MediaLibraryError, uploadMediaAsset } = await import("./index");

    await expect(
      uploadMediaAsset(
        {
          fileBuffer: imageBuffer,
          fileName: "microscope.png",
          mimeType: "image/png",
          sourceUrl: "javascript:alert(1)",
        },
        {
          allowedMimeTypes: ["image/png"],
          storageAdapter: {
            deleteObject: vi.fn(),
            driver: "local",
            writeObject: vi.fn(),
          },
        },
      ),
    ).rejects.toBeInstanceOf(MediaLibraryError);
  });

  it("builds the media snapshot even when the prisma surface does not expose mediaVariant directly", async () => {
    const prisma = createSnapshotOnlyPrisma();
    const { getMediaLibrarySnapshot } = await import("./index");

    const snapshot = await getMediaLibrarySnapshot({}, prisma);

    expect(snapshot.summary).toMatchObject({
      aiGeneratedCount: 1,
      matchedCount: 1,
      totalAssetCount: 1,
      totalVariantCount: 1,
    });
    expect(snapshot.assets[0]).toMatchObject({
      fileName: "microscope.png",
      variantCount: 1,
    });
  });

  it("adapts snapshot selects and search filters to a legacy prisma media model shape", async () => {
    const prisma = createLegacySnapshotPrisma();
    const { getMediaLibrarySnapshot } = await import("./index");

    const snapshot = await getMediaLibrarySnapshot(
      {
        query: "legacy",
      },
      prisma,
    );

    expect(snapshot.summary).toMatchObject({
      matchedCount: 1,
      totalAssetCount: 1,
      totalVariantCount: 0,
    });
    expect(snapshot.assets[0]).toMatchObject({
      fileName: null,
      variantCount: 0,
    });
  });
});
