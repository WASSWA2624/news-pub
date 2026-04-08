const crypto = require("node:crypto");

const { PrismaClient } = require("@prisma/client");

const { createAdapterFromDatabaseUrl } = require("../scripts/prisma-runtime");
const {
  DEFAULT_DESTINATIONS,
  DEFAULT_LOCALES,
  DEFAULT_PROVIDERS,
  DEFAULT_STREAMS,
  DEFAULT_TEMPLATES,
  getDefaultCategories,
} = require("./defaults");

const prisma = new PrismaClient({
  adapter: createAdapterFromDatabaseUrl(requiredEnv("DATABASE_URL")),
});

const PASSWORD_HASH_KEY_LENGTH = 64;
const PASSWORD_HASH_COST = 32768;
const PASSWORD_HASH_BLOCK_SIZE = 8;
const PASSWORD_HASH_PARALLELIZATION = 1;
const PASSWORD_HASH_MAX_MEMORY = 128 * 1024 * 1024;

function requiredEnv(name) {
  const value = `${process.env[name] || ""}`.trim();

  if (!value) {
    throw new Error(`${name} is required for prisma seeding.`);
  }

  return value;
}

function createPasswordHash(password) {
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH, {
    maxmem: PASSWORD_HASH_MAX_MEMORY,
    N: PASSWORD_HASH_COST,
    p: PASSWORD_HASH_PARALLELIZATION,
    r: PASSWORD_HASH_BLOCK_SIZE,
  });

  return [
    "scrypt",
    PASSWORD_HASH_COST,
    PASSWORD_HASH_BLOCK_SIZE,
    PASSWORD_HASH_PARALLELIZATION,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

async function seedLocales(tx) {
  for (const locale of DEFAULT_LOCALES) {
    await tx.locale.upsert({
      where: { code: locale.code },
      update: {
        isActive: true,
        isDefault: locale.isDefault,
        name: locale.name,
      },
      create: locale,
    });
  }
}

async function seedAdminUser(tx) {
  const email = requiredEnv("ADMIN_SEED_EMAIL").toLowerCase();
  const passwordHash = createPasswordHash(requiredEnv("ADMIN_SEED_PASSWORD"));

  const user = await tx.user.upsert({
    where: { email },
    update: {
      isActive: true,
      name: "NewsPub Admin",
      passwordHash,
      role: "SUPER_ADMIN",
    },
    create: {
      email,
      isActive: true,
      name: "NewsPub Admin",
      passwordHash,
      role: "SUPER_ADMIN",
    },
  });

  await tx.adminSession.updateMany({
    data: {
      invalidatedAt: new Date(),
    },
    where: {
      invalidatedAt: null,
      userId: user.id,
    },
  });
}

async function seedCategories(tx, categories) {
  for (const category of categories) {
    await tx.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }
}

async function seedProviders(tx) {
  for (const provider of DEFAULT_PROVIDERS) {
    await tx.newsProviderConfig.upsert({
      where: { providerKey: provider.providerKey },
      update: provider,
      create: provider,
    });
  }
}

async function seedDestinations(tx) {
  for (const destination of DEFAULT_DESTINATIONS) {
    await tx.destination.upsert({
      where: { slug: destination.slug },
      update: destination,
      create: destination,
    });
  }
}

async function seedTemplates(tx) {
  for (const template of DEFAULT_TEMPLATES) {
    await tx.destinationTemplate.upsert({
      where: {
        name_platform_locale: {
          locale: template.locale,
          name: template.name,
          platform: template.platform,
        },
      },
      update: template,
      create: template,
    });
  }
}

async function seedStreams(tx) {
  const [providers, destinations, templates, categories] = await Promise.all([
    tx.newsProviderConfig.findMany({
      select: { id: true, providerKey: true },
    }),
    tx.destination.findMany({
      select: { id: true, slug: true },
    }),
    tx.destinationTemplate.findMany({
      select: { id: true, name: true },
    }),
    tx.category.findMany({
      select: { id: true, slug: true },
    }),
  ]);

  const providerByKey = new Map(providers.map((provider) => [provider.providerKey, provider]));
  const destinationBySlug = new Map(destinations.map((destination) => [destination.slug, destination]));
  const templateByName = new Map(templates.map((template) => [template.name, template]));
  const categoryBySlug = new Map(categories.map((category) => [category.slug, category]));

  for (const stream of DEFAULT_STREAMS) {
    const provider = providerByKey.get(stream.providerKey);
    const destination = destinationBySlug.get(stream.destinationSlug);
    const template = templateByName.get(stream.defaultTemplateName);

    if (!provider || !destination || !template) {
      throw new Error(`Unable to resolve relations for stream "${stream.slug}".`);
    }

    const seededStream = await tx.publishingStream.upsert({
      where: { slug: stream.slug },
      update: {
        activeProviderId: provider.id,
        countryAllowlistJson: stream.countryAllowlistJson || [],
        defaultTemplateId: template.id,
        destinationId: destination.id,
        duplicateWindowHours: stream.duplicateWindowHours,
        includeKeywordsJson: stream.includeKeywordsJson,
        languageAllowlistJson: stream.languageAllowlistJson || [],
        locale: stream.locale,
        maxPostsPerRun: stream.maxPostsPerRun,
        mode: stream.mode,
        name: stream.name,
        retryBackoffMinutes: stream.retryBackoffMinutes,
        retryLimit: stream.retryLimit,
        scheduleIntervalMinutes: stream.scheduleIntervalMinutes,
        settingsJson: stream.settingsJson || {},
        status: stream.status,
        timezone: stream.timezone,
      },
      create: {
        activeProviderId: provider.id,
        countryAllowlistJson: stream.countryAllowlistJson || [],
        defaultTemplateId: template.id,
        destinationId: destination.id,
        duplicateWindowHours: stream.duplicateWindowHours,
        includeKeywordsJson: stream.includeKeywordsJson,
        languageAllowlistJson: stream.languageAllowlistJson || [],
        locale: stream.locale,
        maxPostsPerRun: stream.maxPostsPerRun,
        mode: stream.mode,
        name: stream.name,
        retryBackoffMinutes: stream.retryBackoffMinutes,
        retryLimit: stream.retryLimit,
        scheduleIntervalMinutes: stream.scheduleIntervalMinutes,
        settingsJson: stream.settingsJson || {},
        slug: stream.slug,
        status: stream.status,
        timezone: stream.timezone,
      },
    });

    await tx.streamCategory.deleteMany({
      where: {
        streamId: seededStream.id,
      },
    });

    for (const slug of stream.categorySlugs) {
      const category = categoryBySlug.get(slug);

      if (!category) {
        continue;
      }

      await tx.streamCategory.create({
        data: {
          categoryId: category.id,
          streamId: seededStream.id,
        },
      });
    }

    await tx.providerFetchCheckpoint.upsert({
      where: {
        streamId_providerConfigId: {
          providerConfigId: provider.id,
          streamId: seededStream.id,
        },
      },
      update: {},
      create: {
        providerConfigId: provider.id,
        streamId: seededStream.id,
      },
    });
  }
}

async function main() {
  console.log("Seeding NewsPub baseline data...");
  const defaultCategories = await getDefaultCategories();

  await prisma.$transaction(async (tx) => {
    await seedLocales(tx);
    await seedAdminUser(tx);
    await seedCategories(tx, defaultCategories);
    await seedProviders(tx);
    await seedDestinations(tx);
    await seedTemplates(tx);
    await seedStreams(tx);
  });

  console.log("NewsPub seed complete.");
}

main()
  .catch((error) => {
    console.error("Prisma seed failed.");
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
