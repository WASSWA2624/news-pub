import { describe, expect, it, vi } from "vitest";

describe("template feature validation", () => {
  it("rejects platform changes that would break linked stream destinations", async () => {
    const { saveTemplateRecord } = await import("./index");
    const prisma = {
      destinationTemplate: {
        findUnique: vi.fn().mockResolvedValue({
          id: "template_1",
          streams: [
            {
              destination: {
                id: "destination_1",
                kind: "WEBSITE",
                name: "Local Website",
                platform: "WEBSITE",
                slug: "local-website",
              },
            },
          ],
        }),
      },
    };

    await expect(
      saveTemplateRecord(
        {
          bodyTemplate: "{{title}}",
          id: "template_1",
          name: "Website Template",
          platform: "FACEBOOK",
        },
        {},
        prisma,
      ),
    ).rejects.toMatchObject({
      status: "template_validation_failed",
    });
  });
});
