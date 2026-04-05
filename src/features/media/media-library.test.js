import sharp from "sharp";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { createNewsPubTestEnv } from "@/test/test-env";

const originalEnv = process.env;

function createMockPrisma() {
  const storedVariants = [];

  return {
    auditEvent: {
      create: vi.fn().mockResolvedValue({}),
    },
    mediaAsset: {
      create: vi.fn(async ({ data }) => ({
        ...data,
        createdAt: new Date("2026-04-03T10:00:00.000Z"),
        id: "asset_1",
        updatedAt: new Date("2026-04-03T10:00:00.000Z"),
      })),
      findMany: vi.fn(async () => [
        {
          alt: "Stored story image",
          caption: "Story image",
          createdAt: new Date("2026-04-03T10:00:00.000Z"),
          fileName: "story.png",
          fileSizeBytes: 1024,
          height: 900,
          id: "asset_1",
          mimeType: "image/png",
          publicUrl: "/uploads/media/story.png",
          sourceDomain: "example.com",
          sourceUrl: "https://example.com/story.png",
          storageDriver: "local",
          storageKey: "media/story.png",
          updatedAt: new Date("2026-04-03T10:00:00.000Z"),
          variants: storedVariants,
          width: 1600,
        },
      ]),
      update: vi.fn(async ({ data }) => ({
        alt: "Story image alt",
        attributionText: "Example Source",
        caption: "Story image",
        createdAt: new Date("2026-04-03T10:00:00.000Z"),
        fileName: "story.png",
        fileSizeBytes: 1024,
        height: data.height,
        id: "asset_1",
        mimeType: "image/png",
        publicUrl: "/uploads/media/story.png",
        sourceDomain: "example.com",
        sourceUrl: "https://example.com/story.png",
        storageDriver: "local",
        storageKey: "media/story.png",
        updatedAt: new Date("2026-04-03T10:00:00.000Z"),
        variants: storedVariants,
        width: data.width,
      })),
    },
    mediaVariant: {
      createMany: vi.fn(async ({ data }) => {
        storedVariants.push(...data);
        return {
          count: data.length,
        };
      }),
    },
  };
}

describe("media library pipeline", () => {
  beforeEach(() => {
    vi.resetModules();
    process.env = {
      ...originalEnv,
      ...createNewsPubTestEnv(),
    };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
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
    const prisma = createMockPrisma();
    const storageAdapter = {
      driver: "local",
      writeObject: vi.fn(async ({ key }) => ({
        localPath: `public/uploads/${key}`,
        publicUrl: `/uploads/${key}`,
        storageKey: key,
      })),
    };

    vi.doMock("@/lib/storage", () => ({
      createStorageAdapter: () => storageAdapter,
    }));

    const { uploadMediaAsset } = await import("./index");
    const result = await uploadMediaAsset(
      {
        alt: "Story image alt",
        attributionText: "Example Source",
        buffer: imageBuffer,
        caption: "Story image",
        fileName: "story.png",
        mimeType: "image/png",
        sourceUrl: "https://example.com/story.png",
      },
      {
        actorId: "user_1",
      },
      prisma,
    );

    expect(storageAdapter.writeObject).toHaveBeenCalled();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MEDIA_ASSET_STORED",
          actorId: "user_1",
          entityType: "media_asset",
        }),
      }),
    );
    expect(result.variants.length).toBeGreaterThan(0);
    expect(result.width).toBe(1600);
  });

  it("summarizes the current media library", async () => {
    const prisma = createMockPrisma();
    const { getMediaLibrarySnapshot } = await import("./index");

    const snapshot = await getMediaLibrarySnapshot(prisma);

    expect(snapshot.summary).toMatchObject({
      totalCount: 1,
    });
    expect(snapshot.assets[0]).toMatchObject({
      fileName: "story.png",
      sourceDomain: "example.com",
    });
  });
});
