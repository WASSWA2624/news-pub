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
      count: vi.fn().mockResolvedValue(1),
      create: vi.fn(async ({ data }) => ({
        ...data,
        created_at: new Date("2026-04-03T10:00:00.000Z"),
        id: "asset_1",
        updated_at: new Date("2026-04-03T10:00:00.000Z"),
      })),
      findMany: vi.fn(async () => [
        {
          alt: "Stored story image",
          caption: "Story image",
          created_at: new Date("2026-04-03T10:00:00.000Z"),
          file_name: "story.png",
          file_size_bytes: 1024,
          height: 900,
          id: "asset_1",
          mime_type: "image/png",
          public_url: "/uploads/media/story.png",
          source_domain: "example.com",
          source_url: "https://example.com/story.png",
          storage_driver: "local",
          storage_key: "media/story.png",
          updated_at: new Date("2026-04-03T10:00:00.000Z"),
          _count: {
            variants: storedVariants.length,
          },
          width: 1600,
        },
      ]),
      update: vi.fn(async ({ data }) => ({
        alt: "Story image alt",
        attribution_text: "Example Source",
        caption: "Story image",
        created_at: new Date("2026-04-03T10:00:00.000Z"),
        file_name: "story.png",
        file_size_bytes: 1024,
        height: data.height,
        id: "asset_1",
        mime_type: "image/png",
        public_url: "/uploads/media/story.png",
        source_domain: "example.com",
        source_url: "https://example.com/story.png",
        storage_driver: "local",
        storage_key: "media/story.png",
        updated_at: new Date("2026-04-03T10:00:00.000Z"),
        variants: storedVariants,
        width: data.width,
      })),
    },
    mediaVariant: {
      count: vi.fn().mockResolvedValue(storedVariants.length),
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

  it("returns null and records observability when remote ingestion fails", async () => {
    const prisma = createMockPrisma();
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({
        ok: false,
        status: 502,
      })),
    );

    const { safeIngestRemoteMediaAsset } = await import("./index");
    const result = await safeIngestRemoteMediaAsset(
      {
        file_name: "story.png",
        source_url: "https://example.com/story.png",
      },
      {
        actor_id: "user_1",
      },
      prisma,
    );

    expect(result).toBeNull();
    expect(prisma.auditEvent.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "MEDIA_LIBRARY_FAILURE",
          entity_type: "media_asset",
        }),
      }),
    );
  });

  it("summarizes the current media library", async () => {
    const prisma = createMockPrisma();
    const { getMediaLibrarySnapshot } = await import("./index");

    const snapshot = await getMediaLibrarySnapshot(prisma);

    expect(snapshot.summary).toMatchObject({
      totalCount: 1,
    });
    expect(snapshot.assets[0]).toMatchObject({
      file_name: "story.png",
      source_domain: "example.com",
    });
  }, 15000);
});
