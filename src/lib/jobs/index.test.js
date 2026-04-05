import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

function createBaseEnv() {
  return {
    ADMIN_SEED_EMAIL: "admin@example.com",
    ADMIN_SEED_PASSWORD: "password123",
    AI_MODEL_DEFAULT: "gpt-5.4",
    AI_MODEL_FALLBACK: "gpt-5.4-mini",
    AI_PROVIDER_DEFAULT: "openai",
    AI_PROVIDER_FALLBACK: "openai",
    COMMENT_CAPTCHA_ENABLED: "false",
    COMMENT_RATE_LIMIT_MAX: "5",
    COMMENT_RATE_LIMIT_WINDOW_MS: "60000",
    CRON_SECRET: "cron-secret",
    DATABASE_URL: "mysql://user:pass@localhost:3306/equip_blog",
    DEFAULT_LOCALE: "en",
    LOCAL_MEDIA_BASE_PATH: "d:/coding/apps/equip-blog/public/uploads",
    LOCAL_MEDIA_BASE_URL: "/uploads",
    MEDIA_DRIVER: "local",
    NEXT_PUBLIC_APP_URL: "https://example.com",
    OPENAI_API_KEY: "test-openai-key",
    REVALIDATE_SECRET: "revalidate-secret",
    SESSION_MAX_AGE_SECONDS: "3600",
    SESSION_SECRET: "session-secret",
    SUPPORTED_LOCALES: "en",
    UPLOAD_ALLOWED_MIME_TYPES: "image/png,image/jpeg",
  };
}

const originalEnv = process.env;

describe("generation job logging", () => {
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

  it("writes created, warning, and completed audit events for generation jobs", async () => {
    const auditEventCreate = vi.fn().mockResolvedValue(null);
    const prisma = {
      auditEvent: {
        create: auditEventCreate,
      },
      generationJob: {
        create: vi.fn().mockResolvedValue({
          currentStage: "duplicate_check",
          equipmentName: "Microscope",
          id: "job_1",
          locale: "en",
          providerConfigId: "provider_cfg_default_generation",
          replaceExistingPost: false,
          schedulePublishAt: null,
          status: "PENDING",
        }),
        update: vi.fn().mockResolvedValue({
          currentStage: "draft_saved",
          finishedAt: new Date("2026-04-03T11:10:00.000Z"),
          id: "job_1",
          postId: "post_1",
          status: "COMPLETED",
        }),
      },
    };
    const {
      completeGenerationJob,
      createGenerationJobRecord,
    } = await import("./index");

    await createGenerationJobRecord(
      {
        actorId: "user_1",
        currentStage: "duplicate_check",
        equipmentName: "Microscope",
        locale: "en",
        providerConfigId: "provider_cfg_default_generation",
        replaceExistingPost: false,
        requestJson: {},
        status: "PENDING",
      },
      prisma,
    );
    await completeGenerationJob(
      "job_1",
      {
        actorId: "user_1",
        currentStage: "draft_saved",
        postId: "post_1",
        warningJson: ["Used fixture-backed research payload."],
      },
      prisma,
    );

    expect(prisma.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          actorId: expect.anything(),
        }),
      }),
    );
    expect(auditEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GENERATION_JOB_CREATED",
          entityId: "job_1",
          entityType: "generation_job",
        }),
      }),
    );
    expect(auditEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GENERATION_JOB_WARNING",
          entityId: "job_1",
        }),
      }),
    );
    expect(auditEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GENERATION_JOB_COMPLETED",
          entityId: "job_1",
        }),
      }),
    );
  });

  it("writes failed audit events without leaking actorId into the prisma update payload", async () => {
    const auditEventCreate = vi.fn().mockResolvedValue(null);
    const prisma = {
      auditEvent: {
        create: auditEventCreate,
      },
      generationJob: {
        update: vi.fn().mockResolvedValue({
          currentStage: "failed",
          finishedAt: new Date("2026-04-03T11:20:00.000Z"),
          id: "job_2",
          postId: null,
          status: "FAILED",
        }),
      },
    };
    const { failGenerationJob } = await import("./index");

    await failGenerationJob(
      "job_2",
      new Error("SEO payload generation failed."),
      {
        actorId: "user_1",
        currentStage: "failed",
      },
      prisma,
    );

    expect(prisma.generationJob.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.not.objectContaining({
          actorId: expect.anything(),
        }),
      }),
    );
    expect(auditEventCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          action: "GENERATION_JOB_FAILED",
          entityId: "job_2",
          payloadJson: expect.objectContaining({
            errorMessage: "SEO payload generation failed.",
          }),
        }),
      }),
    );
  });
});
