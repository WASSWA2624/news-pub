import { describe, expect, it, vi } from "vitest";

describe("duplicate equipment detection", () => {
  it("detects duplicates from canonical equipment identity plus locale", async () => {
    const prisma = {
      equipment: {
        findUnique: vi.fn().mockResolvedValue({
          id: "equipment_1",
          name: "Microscope",
          normalizedName: "microscope",
          slug: "microscope",
        }),
      },
      post: {
        findMany: vi.fn().mockResolvedValue([
          {
            createdAt: new Date("2026-04-03T07:00:00.000Z"),
            editorialStage: "GENERATED",
            id: "post_1",
            publishedAt: null,
            scheduledPublishAt: null,
            slug: "microscope",
            status: "DRAFT",
            translations: [
              {
                id: "translation_1",
                title: "Microscope",
              },
            ],
            updatedAt: new Date("2026-04-03T08:00:00.000Z"),
          },
        ]),
      },
    };
    const { detectDuplicateEquipmentPost } = await import("./duplicates");

    const result = await detectDuplicateEquipmentPost(
      {
        equipmentName: "  Microscope  ",
        locale: " en ",
      },
      prisma,
    );

    expect(prisma.equipment.findUnique).toHaveBeenCalledWith({
      select: {
        id: true,
        name: true,
        normalizedName: true,
        slug: true,
      },
      where: {
        normalizedName: "microscope",
      },
    });
    expect(prisma.post.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          equipmentId: "equipment_1",
          status: {
            in: ["DRAFT", "SCHEDULED", "PUBLISHED"],
          },
          translations: {
            some: {
              locale: "en",
            },
          },
        }),
      }),
    );
    expect(result).toMatchObject({
      canonicalEquipment: {
        normalizedName: "microscope",
        slug: "microscope",
      },
      duplicateDetected: true,
      duplicateMatch: {
        locale: "en",
        postId: "post_1",
        slug: "microscope",
      },
      locale: "en",
      matchCount: 1,
    });
  });

  it("returns no duplicate when the canonical equipment record does not exist yet", async () => {
    const prisma = {
      equipment: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      post: {
        findMany: vi.fn(),
      },
    };
    const { detectDuplicateEquipmentPost } = await import("./duplicates");

    const result = await detectDuplicateEquipmentPost(
      {
        equipmentName: "Microscope",
        locale: "en",
      },
      prisma,
    );

    expect(result).toMatchObject({
      duplicateDetected: false,
      duplicateMatch: null,
      matchCount: 0,
    });
    expect(prisma.post.findMany).not.toHaveBeenCalled();
  });
});
