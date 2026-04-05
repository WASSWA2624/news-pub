import { createAuditEventRecord } from "@/lib/analytics";
import { createSlug, normalizeDisplayText } from "@/lib/normalization";
import { NewsPubError, resolvePrismaClient, trimText } from "@/lib/news/shared";
import { getStreamValidationIssues } from "@/lib/validation/configuration";

function normalizeKeywordList(value) {
  if (Array.isArray(value)) {
    return value.map((entry) => normalizeDisplayText(entry)).filter(Boolean);
  }

  return normalizeDisplayText(value)
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export async function getStreamManagementSnapshot(prisma) {
  const db = await resolvePrismaClient(prisma);
  const [streams, destinations, providers, templates, categories] = await Promise.all([
    db.publishingStream.findMany({
      include: {
        activeProvider: {
          select: {
            id: true,
            label: true,
            providerKey: true,
          },
        },
        categories: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
                slug: true,
              },
            },
          },
        },
        defaultTemplate: {
          select: {
            id: true,
            name: true,
            platform: true,
          },
        },
        destination: {
          select: {
            id: true,
            kind: true,
            name: true,
            platform: true,
            slug: true,
          },
        },
      },
      orderBy: [{ status: "asc" }, { name: "asc" }],
    }),
    db.destination.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
    }),
    db.newsProviderConfig.findMany({
      orderBy: [{ isDefault: "desc" }, { label: "asc" }],
      select: {
        id: true,
        isDefault: true,
        label: true,
        providerKey: true,
      },
    }),
    db.destinationTemplate.findMany({
      orderBy: [{ platform: "asc" }, { name: "asc" }],
      select: {
        id: true,
        locale: true,
        name: true,
        platform: true,
      },
    }),
    db.category.findMany({
      orderBy: [{ name: "asc" }],
      select: {
        id: true,
        name: true,
        slug: true,
      },
    }),
  ]);

  return {
    categories,
    destinations,
    providers,
    streams: streams.map((stream) => ({
      ...stream,
      includeKeywordsJson: stream.includeKeywordsJson || [],
      excludeKeywordsJson: stream.excludeKeywordsJson || [],
      streamCategories: stream.categories.map((entry) => entry.category),
      validationIssues: getStreamValidationIssues({
        destination: stream.destination,
        mode: stream.mode,
        template: stream.defaultTemplate,
      }),
    })),
    summary: {
      activeCount: streams.filter((stream) => stream.status === "ACTIVE").length,
      pausedCount: streams.filter((stream) => stream.status === "PAUSED").length,
      totalCount: streams.length,
    },
    templates,
  };
}

export async function saveStreamRecord(input, { actorId } = {}, prisma) {
  const db = await resolvePrismaClient(prisma);
  const name = trimText(input.name);
  const slug = trimText(input.slug) || createSlug(name, "stream");

  if (!name || !input.destinationId || !input.activeProviderId || !input.locale) {
    throw new NewsPubError("Stream name, destination, provider, and locale are required.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const [destination, defaultTemplate] = await Promise.all([
    db.destination.findUnique({
      select: {
        id: true,
        kind: true,
        name: true,
        platform: true,
        slug: true,
      },
      where: {
        id: input.destinationId,
      },
    }),
    input.defaultTemplateId
      ? db.destinationTemplate.findUnique({
          select: {
            id: true,
            name: true,
            platform: true,
          },
          where: {
            id: input.defaultTemplateId,
          },
        })
      : Promise.resolve(null),
  ]);

  if (!destination) {
    throw new NewsPubError("The selected destination could not be found.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  if (input.defaultTemplateId && !defaultTemplate) {
    throw new NewsPubError("The selected default template could not be found.", {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const validationIssues = getStreamValidationIssues({
    destination,
    mode: trimText(input.mode) || "REVIEW_REQUIRED",
    template: defaultTemplate,
  });

  if (validationIssues.length) {
    throw new NewsPubError(validationIssues[0].message, {
      status: "stream_validation_failed",
      statusCode: 400,
    });
  }

  const stream = await db.publishingStream.upsert({
    where: {
      slug,
    },
    update: {
      activeProviderId: input.activeProviderId,
      defaultTemplateId: input.defaultTemplateId || null,
      description: trimText(input.description) || null,
      destinationId: input.destinationId,
      duplicateWindowHours: Number.parseInt(`${input.duplicateWindowHours || 48}`, 10) || 48,
      excludeKeywordsJson: normalizeKeywordList(input.excludeKeywordsJson),
      includeKeywordsJson: normalizeKeywordList(input.includeKeywordsJson),
      locale: trimText(input.locale),
      maxPostsPerRun: Number.parseInt(`${input.maxPostsPerRun || 5}`, 10) || 5,
      mode: trimText(input.mode) || "REVIEW_REQUIRED",
      name,
      retryBackoffMinutes: Number.parseInt(`${input.retryBackoffMinutes || 15}`, 10) || 15,
      retryLimit: Number.parseInt(`${input.retryLimit || 3}`, 10) || 3,
      scheduleExpression: trimText(input.scheduleExpression) || null,
      scheduleIntervalMinutes: Number.parseInt(`${input.scheduleIntervalMinutes || 60}`, 10) || 60,
      status: trimText(input.status) || "ACTIVE",
      timezone: trimText(input.timezone) || "UTC",
    },
    create: {
      activeProviderId: input.activeProviderId,
      defaultTemplateId: input.defaultTemplateId || null,
      description: trimText(input.description) || null,
      destinationId: input.destinationId,
      duplicateWindowHours: Number.parseInt(`${input.duplicateWindowHours || 48}`, 10) || 48,
      excludeKeywordsJson: normalizeKeywordList(input.excludeKeywordsJson),
      includeKeywordsJson: normalizeKeywordList(input.includeKeywordsJson),
      locale: trimText(input.locale),
      maxPostsPerRun: Number.parseInt(`${input.maxPostsPerRun || 5}`, 10) || 5,
      mode: trimText(input.mode) || "REVIEW_REQUIRED",
      name,
      retryBackoffMinutes: Number.parseInt(`${input.retryBackoffMinutes || 15}`, 10) || 15,
      retryLimit: Number.parseInt(`${input.retryLimit || 3}`, 10) || 3,
      scheduleExpression: trimText(input.scheduleExpression) || null,
      scheduleIntervalMinutes: Number.parseInt(`${input.scheduleIntervalMinutes || 60}`, 10) || 60,
      slug,
      status: trimText(input.status) || "ACTIVE",
      timezone: trimText(input.timezone) || "UTC",
    },
  });

  await db.streamCategory.deleteMany({
    where: {
      streamId: stream.id,
    },
  });

  for (const categoryId of input.categoryIds || []) {
    await db.streamCategory.create({
      data: {
        categoryId,
        streamId: stream.id,
      },
    });
  }

  await db.providerFetchCheckpoint.upsert({
    where: {
      streamId_providerConfigId: {
        providerConfigId: input.activeProviderId,
        streamId: stream.id,
      },
    },
    update: {},
    create: {
      providerConfigId: input.activeProviderId,
      streamId: stream.id,
    },
  });

  await createAuditEventRecord(
    {
      action: "STREAM_SAVED",
      actorId,
      entityId: stream.id,
      entityType: "publishing_stream",
      payloadJson: {
        destinationId: stream.destinationId,
        mode: stream.mode,
        providerConfigId: stream.activeProviderId,
        status: stream.status,
      },
    },
    db,
  );

  return stream;
}
