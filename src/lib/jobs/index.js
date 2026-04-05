import { createAuditEventRecord } from "@/lib/analytics";

export class GenerationJobError extends Error {
  constructor(message, { status = "generation_job_error", statusCode = 500 } = {}) {
    super(message);
    this.name = "GenerationJobError";
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

function normalizeWarnings(warningJson) {
  return Array.isArray(warningJson)
    ? warningJson.map((warning) => `${warning}`.trim()).filter(Boolean)
    : [];
}

async function recordGenerationJobAuditEvent(action, jobId, payloadJson, prisma, actorId = null) {
  return createAuditEventRecord(
    {
      action,
      actorId,
      entityId: jobId,
      entityType: "generation_job",
      payloadJson: {
        ...payloadJson,
        occurredAt: new Date().toISOString(),
      },
    },
    prisma,
  );
}

export async function createGenerationJobRecord(input, prisma) {
  const db = await resolvePrismaClient(prisma);
  const job = await db.generationJob.create({
    data: {
      currentStage: input.currentStage || "request_received",
      equipmentName: input.equipmentName,
      locale: input.locale,
      providerConfigId: input.providerConfigId,
      replaceExistingPost: Boolean(input.replaceExistingPost),
      requestJson: input.requestJson,
      schedulePublishAt: input.schedulePublishAt || null,
      status: input.status || "PENDING",
    },
  });

  await recordGenerationJobAuditEvent(
    "GENERATION_JOB_CREATED",
    job.id,
    {
      currentStage: job.currentStage,
      equipmentName: job.equipmentName,
      locale: job.locale,
      providerConfigId: job.providerConfigId,
      replaceExistingPost: job.replaceExistingPost,
      schedulePublishAt: serializeDate(job.schedulePublishAt),
      status: job.status,
    },
    db,
    input.actorId,
  ).catch(() => {});

  return job;
}

export async function updateGenerationJobRecord(jobId, data, prisma) {
  const db = await resolvePrismaClient(prisma);

  return db.generationJob.update({
    where: {
      id: jobId,
    },
    data,
  });
}

export async function markGenerationJobRunning(jobId, currentStage, prisma) {
  const startedAt = new Date();
  const job = await updateGenerationJobRecord(
    jobId,
    {
      currentStage,
      startedAt,
      status: "RUNNING",
    },
    prisma,
  );

  await recordGenerationJobAuditEvent(
    "GENERATION_JOB_STAGE_CHANGED",
    jobId,
    {
      currentStage,
      startedAt: serializeDate(job?.startedAt || startedAt),
      status: "RUNNING",
    },
    prisma,
  ).catch(() => {});

  return job;
}

export async function completeGenerationJob(jobId, data, prisma) {
  const { actorId = null, warningJson, ...updateData } = data;
  const warnings = normalizeWarnings(warningJson);
  const job = await updateGenerationJobRecord(
    jobId,
    {
      ...updateData,
      finishedAt: new Date(),
      status: "COMPLETED",
      warningJson: warnings.length ? warnings : warningJson || null,
    },
    prisma,
  );

  if (warnings.length) {
    await recordGenerationJobAuditEvent(
      "GENERATION_JOB_WARNING",
      jobId,
      {
        currentStage: job?.currentStage || updateData.currentStage || null,
        status: "COMPLETED",
        warningCount: warnings.length,
        warnings,
      },
      prisma,
      actorId,
    ).catch(() => {});
  }

  await recordGenerationJobAuditEvent(
    "GENERATION_JOB_COMPLETED",
    jobId,
    {
      currentStage: job?.currentStage || updateData.currentStage || null,
      finishedAt: serializeDate(job?.finishedAt),
      postId: job?.postId || updateData.postId || null,
      status: "COMPLETED",
      warningCount: warnings.length,
    },
    prisma,
    actorId,
  ).catch(() => {});

  return job;
}

export async function cancelGenerationJob(jobId, data = {}, prisma) {
  const { actorId = null, warningJson, ...updateData } = data;
  const warnings = normalizeWarnings(warningJson);
  const job = await updateGenerationJobRecord(
    jobId,
    {
      ...updateData,
      finishedAt: new Date(),
      status: "CANCELLED",
      warningJson: warnings.length ? warnings : warningJson || null,
    },
    prisma,
  );

  if (warnings.length) {
    await recordGenerationJobAuditEvent(
      "GENERATION_JOB_WARNING",
      jobId,
      {
        currentStage: job?.currentStage || updateData.currentStage || null,
        status: "CANCELLED",
        warningCount: warnings.length,
        warnings,
      },
      prisma,
      actorId,
    ).catch(() => {});
  }

  await recordGenerationJobAuditEvent(
    "GENERATION_JOB_CANCELLED",
    jobId,
    {
      currentStage: job?.currentStage || updateData.currentStage || null,
      finishedAt: serializeDate(job?.finishedAt),
      postId: job?.postId || updateData.postId || null,
      status: "CANCELLED",
      warningCount: warnings.length,
    },
    prisma,
    actorId,
  ).catch(() => {});

  return job;
}

export async function failGenerationJob(jobId, error, data = {}, prisma) {
  const failure = error instanceof Error ? error : new Error(`${error}`);
  const { actorId = null, warningJson, ...updateData } = data;
  const warnings = normalizeWarnings(warningJson);

  const job = await updateGenerationJobRecord(
    jobId,
    {
      ...updateData,
      errorMessage: failure.message,
      finishedAt: new Date(),
      status: "FAILED",
      warningJson: warnings.length ? warnings : warningJson || null,
    },
    prisma,
  );

  if (warnings.length) {
    await recordGenerationJobAuditEvent(
      "GENERATION_JOB_WARNING",
      jobId,
      {
        currentStage: job?.currentStage || updateData.currentStage || null,
        status: "FAILED",
        warningCount: warnings.length,
        warnings,
      },
      prisma,
      actorId,
    ).catch(() => {});
  }

  await recordGenerationJobAuditEvent(
    "GENERATION_JOB_FAILED",
    jobId,
    {
      currentStage: job?.currentStage || updateData.currentStage || null,
      errorMessage: failure.message,
      finishedAt: serializeDate(job?.finishedAt),
      status: "FAILED",
      warningCount: warnings.length,
    },
    prisma,
    actorId,
  ).catch(() => {});

  return job;
}

export { runScheduledPublishingWorker } from "./scheduled-publishing";
