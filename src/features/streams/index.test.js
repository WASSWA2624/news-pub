import { describe, expect, it, vi } from "vitest";

describe("stream feature validation", () => {
  it("rejects default templates that do not match the selected destination platform", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = {
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "FACEBOOK_PAGE",
          name: "Facebook Page",
          platform: "FACEBOOK",
          slug: "facebook-page",
        }),
      },
      destinationTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          id: "template_1",
          name: "Website Default",
          platform: "WEBSITE",
        }),
      },
    };

    await expect(
      saveStreamRecord(
        {
          activeProviderId: "provider_1",
          defaultTemplateId: "template_1",
          destinationId: "destination_1",
          locale: "en",
          mode: "REVIEW_REQUIRED",
          name: "Mismatch stream",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });
  });

  it("rejects auto-publish streams for instagram personal destinations", async () => {
    const { saveStreamRecord } = await import("./index");
    const prisma = {
      destination: {
        findUnique: vi.fn().mockResolvedValue({
          id: "destination_1",
          kind: "INSTAGRAM_PERSONAL",
          name: "Instagram Personal",
          platform: "INSTAGRAM",
          slug: "instagram-personal",
        }),
      },
    };

    await expect(
      saveStreamRecord(
        {
          activeProviderId: "provider_1",
          destinationId: "destination_1",
          locale: "en",
          mode: "AUTO_PUBLISH",
          name: "Instagram auto stream",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "stream_validation_failed",
    });
  });
});
