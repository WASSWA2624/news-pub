const {
  applyPrismaMigrations,
  createAdapterFromDatabaseUrl,
  generatePrismaClient,
  loadRuntimeEnv,
  runPrismaCommand,
} = require("./prisma-runtime");

loadRuntimeEnv();

const {
  DEFAULT_DESTINATIONS,
  DEFAULT_LOCALES,
  DEFAULT_PROVIDERS,
  DEFAULT_STREAMS,
  DEFAULT_TEMPLATES,
  getDefaultCategories,
} = require("../prisma/defaults");

function requiredEnv(name) {
  const value = `${process.env[name] || ""}`.trim();

  if (!value) {
    throw new Error(`${name} is required for database reset.`);
  }

  return value;
}

function buildTemplateKey({ locale, name, platform }) {
  return [name, platform, locale || ""].join("::");
}

function createNotInWhere(field, values) {
  return values.length ? { [field]: { notIn: values } } : {};
}

async function deleteRecordsByField(delegate, field, values) {
  const where = createNotInWhere(field, values);

  if (Object.keys(where).length === 0) {
    await delegate.deleteMany();
    return;
  }

  await delegate.deleteMany({ where });
}

async function resetDatabase(prisma) {
  const adminEmail = requiredEnv("ADMIN_SEED_EMAIL").toLowerCase();
  const defaultCategories = await getDefaultCategories();

  const defaultCategorySlugSet = new Set(defaultCategories.map(({ slug }) => slug));
  const defaultDestinationBySlug = new Map(DEFAULT_DESTINATIONS.map((destination) => [destination.slug, destination]));
  const defaultDestinationSlugSet = new Set(DEFAULT_DESTINATIONS.map(({ slug }) => slug));
  const defaultLocaleCodeSet = new Set(DEFAULT_LOCALES.map(({ code }) => code));
  const defaultProviderKeySet = new Set(DEFAULT_PROVIDERS.map(({ providerKey }) => providerKey));
  const defaultStreamSlugSet = new Set(DEFAULT_STREAMS.map(({ slug }) => slug));
  const defaultTemplateKeySet = new Set(DEFAULT_TEMPLATES.map(buildTemplateKey));

  console.log("Clearing NewsPub runtime data...");
  await prisma.publishAttempt.deleteMany();
  await prisma.fetchRun.deleteMany();
  await prisma.viewEvent.deleteMany();
  await prisma.auditEvent.deleteMany();
  await prisma.providerFetchCheckpoint.deleteMany();
  await prisma.articleMatch.deleteMany();
  await prisma.sEORecord.deleteMany();
  await prisma.postCategory.deleteMany();
  await prisma.streamCategory.deleteMany();
  await prisma.postTranslation.deleteMany();
  await prisma.post.deleteMany();
  await prisma.optimizationCache.deleteMany();
  await prisma.fetchedArticle.deleteMany();
  await prisma.mediaVariant.deleteMany();
  await prisma.mediaAsset.deleteMany();
  await prisma.adminSession.deleteMany();

  console.log("Reconciling seeded defaults...");
  const [providers, destinations, templates, streams, categories, locales, users] = await Promise.all([
    prisma.newsProviderConfig.findMany({
      select: { id: true, providerKey: true },
    }),
    prisma.destination.findMany({
      select: { id: true, slug: true },
    }),
    prisma.destinationTemplate.findMany({
      select: { id: true, locale: true, name: true, platform: true },
    }),
    prisma.publishingStream.findMany({
      select: { id: true, slug: true },
    }),
    prisma.category.findMany({
      select: { id: true, slug: true },
    }),
    prisma.locale.findMany({
      select: { code: true },
    }),
    prisma.user.findMany({
      select: { email: true, id: true },
    }),
  ]);

  const providerIdsToKeep = providers
    .filter(({ providerKey }) => defaultProviderKeySet.has(providerKey))
    .map(({ id }) => id);
  const destinationIdsToKeep = destinations
    .filter(({ slug }) => defaultDestinationSlugSet.has(slug))
    .map(({ id }) => id);
  const templateIdsToKeep = templates
    .filter((template) => defaultTemplateKeySet.has(buildTemplateKey(template)))
    .map(({ id }) => id);
  const categoryIdsToKeep = categories
    .filter(({ slug }) => defaultCategorySlugSet.has(slug))
    .map(({ id }) => id);
  const localeCodesToKeep = locales
    .filter(({ code }) => defaultLocaleCodeSet.has(code))
    .map(({ code }) => code);
  const userIdsToKeep = users
    .filter(({ email }) => `${email}`.toLowerCase() === adminEmail)
    .map(({ id }) => id);

  const providerIdByKey = new Map(
    providers
      .filter(({ providerKey }) => defaultProviderKeySet.has(providerKey))
      .map((provider) => [provider.providerKey, provider.id]),
  );
  const destinationIdBySlug = new Map(
    destinations
      .filter(({ slug }) => defaultDestinationSlugSet.has(slug))
      .map((destination) => [destination.slug, destination.id]),
  );
  const templateIdByKey = new Map(
    templates
      .filter((template) => defaultTemplateKeySet.has(buildTemplateKey(template)))
      .map((template) => [buildTemplateKey(template), template.id]),
  );
  const streamIdBySlug = new Map(
    streams
      .filter(({ slug }) => defaultStreamSlugSet.has(slug))
      .map((stream) => [stream.slug, stream.id]),
  );
  const localeCodeLookup = new Set(localeCodesToKeep);

  const streamIdsToKeep = [];

  // Keep matching seeded stream rows when their seeded dependencies still exist.
  for (const stream of DEFAULT_STREAMS) {
    const streamId = streamIdBySlug.get(stream.slug);

    if (!streamId) {
      continue;
    }

    const providerId = providerIdByKey.get(stream.providerKey);
    const destinationId = destinationIdBySlug.get(stream.destinationSlug);
    const destination = defaultDestinationBySlug.get(stream.destinationSlug);
    const template = DEFAULT_TEMPLATES.find(
      (item) => (
        item.name === stream.defaultTemplateName
        && item.locale === stream.locale
        && item.platform === destination?.platform
      ),
    );
    const templateId = template ? templateIdByKey.get(buildTemplateKey(template)) || null : null;

    if (!providerId || !destinationId || !localeCodeLookup.has(stream.locale)) {
      await prisma.publishingStream.delete({
        where: { id: streamId },
      });
      continue;
    }

    await prisma.publishingStream.update({
      where: { id: streamId },
      data: {
        activeProviderId: providerId,
        consecutiveFailureCount: 0,
        defaultTemplateId: templateId,
        description: null,
        destinationId,
        excludeKeywordsJson: null,
        lastFailureAt: null,
        lastRunCompletedAt: null,
        lastRunStartedAt: null,
        locale: stream.locale,
        regionAllowlistJson: null,
        scheduleExpression: null,
      },
    });

    streamIdsToKeep.push(streamId);
  }

  await deleteRecordsByField(prisma.publishingStream, "id", streamIdsToKeep);

  if (templateIdsToKeep.length > 0) {
    await prisma.destinationTemplate.updateMany({
      where: {
        id: { in: templateIdsToKeep },
      },
      data: {
        categoryId: null,
      },
    });
  }

  await deleteRecordsByField(prisma.destinationTemplate, "id", templateIdsToKeep);

  if (destinationIdsToKeep.length > 0) {
    await prisma.destination.updateMany({
      where: {
        id: { in: destinationIdsToKeep },
      },
      data: {
        connectionError: null,
        encryptedTokenCiphertext: null,
        encryptedTokenIv: null,
        encryptedTokenTag: null,
        externalAccountId: null,
        lastCheckedAt: null,
        lastConnectedAt: null,
        tokenHint: null,
      },
    });
  }

  await deleteRecordsByField(prisma.destination, "id", destinationIdsToKeep);
  await deleteRecordsByField(prisma.newsProviderConfig, "id", providerIdsToKeep);
  await deleteRecordsByField(prisma.category, "id", categoryIdsToKeep);
  await deleteRecordsByField(prisma.locale, "code", localeCodesToKeep);
  await deleteRecordsByField(prisma.user, "id", userIdsToKeep);
}

async function main() {
  generatePrismaClient();
  applyPrismaMigrations();

  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(requiredEnv("DATABASE_URL")),
  });

  try {
    console.log("Resetting NewsPub data to seeded defaults...");
    await resetDatabase(prisma);

    console.log("Reseeding NewsPub baseline data...");
    runPrismaCommand(["db", "seed"]);
    console.log("NewsPub database reset complete.");
  } catch (error) {
    console.error("NewsPub database reset failed.");
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

main();
