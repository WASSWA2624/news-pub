import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    DEFAULT_LOCALE: "en",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    SUPPORTED_LOCALES: "en",
  };
}

const originalEnv = process.env;

describe("validation contracts", () => {
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

  it("applies the Release 1 generation defaults from the write-up", async () => {
    const { generationTargetAudienceValues, parseGenerationRequest } = await import("./index");

    expect(
      parseGenerationRequest({
        equipmentName: "microscope",
        providerConfigId: "provider_cfg_default_generation",
      }),
    ).toEqual({
      articleDepth: "complete",
      equipmentName: "microscope",
      includeFaults: true,
      includeImages: true,
      includeManualLinks: true,
      includeManufacturers: true,
      includeModels: true,
      locale: "en",
      providerConfigId: "provider_cfg_default_generation",
      replaceExistingPost: false,
      schedulePublishAt: null,
      targetAudience: generationTargetAudienceValues,
    });
  });

  it("keeps the admin and API generation parsers aligned to the same payload shape", async () => {
    const { generationRequestSchema } = await import("./index");
    const { validateAdminGenerationInput } = await import("@/features/generator");

    const payload = {
      equipmentName: "microscope",
      providerConfigId: "provider_cfg_default_generation",
    };

    const adminResult = validateAdminGenerationInput(payload);
    const apiResult = generationRequestSchema.safeParse(payload);

    expect(adminResult.success).toBe(true);
    expect(apiResult.success).toBe(true);

    if (adminResult.success && apiResult.success) {
      expect(adminResult.data).toEqual(apiResult.data);
    }
  });

  it("rejects invalid generation payloads with stable field errors", async () => {
    const { safeParseGenerationRequest } = await import("./index");

    const result = safeParseGenerationRequest(
      {
        equipmentName: "microscope",
        locale: "fr",
        providerConfigId: "provider_cfg_default_generation",
        replaceExistingPost: true,
        schedulePublishAt: "2026-04-03T09:00:00.000Z",
      },
      {
        now: new Date("2026-04-03T10:00:00.000Z"),
      },
    );

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected the invalid generation payload to fail validation.");
    }

    const flattened = result.error.flatten();

    expect(flattened.fieldErrors.locale).toEqual(["locale must be one of: en."]);
    expect(flattened.fieldErrors.replaceExistingPost).toEqual([
      "replaceExistingPost may only be true after duplicate detection.",
    ]);
    expect(flattened.fieldErrors.schedulePublishAt).toEqual([
      "schedulePublishAt must be in the future.",
    ]);
  });

  it("rejects generation payload keys outside the fixed contract", async () => {
    const { safeParseGenerationRequest } = await import("./index");

    const result = safeParseGenerationRequest({
      equipmentName: "microscope",
      providerConfigId: "provider_cfg_default_generation",
      unexpected: true,
    });

    expect(result.success).toBe(false);

    if (result.success) {
      throw new Error("Expected the unexpected generation key to fail validation.");
    }

    expect(result.error.flatten().formErrors).toEqual(
      expect.arrayContaining([expect.stringContaining("unexpected")]),
    );
  });

  it("allows replacement only after duplicate detection and keeps future schedules intact", async () => {
    const { parseGenerationRequest } = await import("./index");

    expect(
      parseGenerationRequest(
        {
          equipmentName: "microscope",
          providerConfigId: "provider_cfg_default_generation",
          replaceExistingPost: true,
          schedulePublishAt: "2026-04-03T11:00:00.000Z",
        },
        {
          duplicateDetected: true,
          now: new Date("2026-04-03T10:00:00.000Z"),
        },
      ),
    ).toMatchObject({
      replaceExistingPost: true,
      schedulePublishAt: "2026-04-03T11:00:00.000Z",
    });
  });

  it("validates shared comment submission and moderation payloads", async () => {
    const {
      commentDeletionSchema,
      commentModerationUpdateSchema,
      commentSubmissionSchema,
    } = await import("./index");

    expect(
      commentSubmissionSchema.parse({
        body: " Helpful note ",
        captchaAnswer: " 7 ",
        captchaToken: " token ",
        email: "  ",
        name: " Alice ",
        parentId: "  ",
        postId: " post_1 ",
      }),
    ).toEqual({
      body: "Helpful note",
      captchaAnswer: "7",
      captchaToken: "token",
      email: undefined,
      name: "Alice",
      parentId: undefined,
      postId: "post_1",
    });

    expect(
      commentModerationUpdateSchema.parse({
        moderationStatus: "APPROVED",
        notes: " Looks good ",
      }),
    ).toEqual({
      moderationStatus: "APPROVED",
      notes: "Looks good",
    });

    expect(
      commentDeletionSchema.parse({
        notes: " Remove from public view ",
      }),
    ).toEqual({
      notes: "Remove from public view",
    });
  });

  it("rejects invalid comment payloads with stable field errors", async () => {
    const { commentBodyMaxLength, commentModerationUpdateSchema, commentSubmissionSchema } =
      await import("./index");

    const createResult = commentSubmissionSchema.safeParse({
      body: "x".repeat(commentBodyMaxLength + 1),
      email: "not-an-email",
      name: " ",
      postId: " ",
    });

    expect(createResult.success).toBe(false);

    if (createResult.success) {
      throw new Error("Expected the invalid comment submission to fail validation.");
    }

    const createErrors = createResult.error.flatten();

    expect(createErrors.fieldErrors.body).toEqual([
      `body must be at most ${commentBodyMaxLength} characters.`,
    ]);
    expect(createErrors.fieldErrors.email).toEqual(["email must be a valid email address."]);
    expect(createErrors.fieldErrors.name).toEqual(["name is required."]);
    expect(createErrors.fieldErrors.postId).toEqual(["postId is required."]);

    const moderationResult = commentModerationUpdateSchema.safeParse({
      moderationStatus: "ARCHIVED",
    });

    expect(moderationResult.success).toBe(false);

    if (moderationResult.success) {
      throw new Error("Expected the invalid moderation payload to fail validation.");
    }

    expect(moderationResult.error.flatten().fieldErrors.moderationStatus).toEqual([
      "moderationStatus must be one of: PENDING, APPROVED, REJECTED, SPAM.",
    ]);
  });
});
