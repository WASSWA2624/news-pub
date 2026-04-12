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

const PASSWORD_HASH_KEY_LENGTH = 64;
const DEFAULT_PASSWORD_HASH_COST = 32768;
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

function parsePositiveIntegerEnv(name, fallbackValue) {
  const rawValue = `${process.env[name] || ""}`.trim();

  if (!rawValue) {
    return fallbackValue;
  }

  const parsedValue = Number.parseInt(rawValue, 10);

  if (!Number.isInteger(parsedValue) || parsedValue <= 0) {
    throw new Error(`${name} must be a positive integer when provided.`);
  }

  return parsedValue;
}

function getPasswordHashConfig() {
  return {
    blockSize: PASSWORD_HASH_BLOCK_SIZE,
    cost: parsePositiveIntegerEnv("ADMIN_PASSWORD_HASH_COST", DEFAULT_PASSWORD_HASH_COST),
    maxMemory: parsePositiveIntegerEnv("ADMIN_PASSWORD_HASH_MAX_MEMORY_BYTES", PASSWORD_HASH_MAX_MEMORY),
    parallelization: PASSWORD_HASH_PARALLELIZATION,
  };
}

function createPasswordHash(password) {
  const passwordHashConfig = getPasswordHashConfig();
  const salt = crypto.randomBytes(16);
  const derivedKey = crypto.scryptSync(password, salt, PASSWORD_HASH_KEY_LENGTH, {
    maxmem: passwordHashConfig.maxMemory,
    N: passwordHashConfig.cost,
    p: passwordHashConfig.parallelization,
    r: passwordHashConfig.blockSize,
  });

  return [
    "scrypt",
    passwordHashConfig.cost,
    passwordHashConfig.blockSize,
    passwordHashConfig.parallelization,
    salt.toString("base64url"),
    derivedKey.toString("base64url"),
  ].join("$");
}

function createSeedPrismaClient() {
  try {
    return new PrismaClient({
      adapter: createAdapterFromDatabaseUrl(requiredEnv("DATABASE_URL")),
    });
  } catch (error) {
    throw new Error(
      [
        "Unable to initialize Prisma for the NewsPub seed.",
        error instanceof Error ? error.message : `${error}`,
        "Confirm DATABASE_URL is valid, Prisma Client is generated, and the uploaded package includes the full prisma/ and scripts/ directories.",
      ].join(" "),
    );
  }
}

async function runSeedPhase(label, task) {
  console.log(`- ${label}`);
  await task();
}

async function seedLocales(db) {
  for (const locale of DEFAULT_LOCALES) {
    await db.locale.upsert({
      where: { code: locale.code },
      update: {
        is_active: true,
        is_default: locale.is_default,
        name: locale.name,
      },
      create: locale,
    });
  }
}

async function seedAdminUser(db) {
  const email = requiredEnv("ADMIN_SEED_EMAIL").toLowerCase();
  const password_hash = createPasswordHash(requiredEnv("ADMIN_SEED_PASSWORD"));

  const user = await db.user.upsert({
    where: { email },
    update: {
      is_active: true,
      name: "NewsPub Admin",
      password_hash,
      role: "SUPER_ADMIN",
    },
    create: {
      email,
      is_active: true,
      name: "NewsPub Admin",
      password_hash,
      role: "SUPER_ADMIN",
    },
  });

  await db.adminSession.updateMany({
    data: {
      invalidated_at: new Date(),
    },
    where: {
      invalidated_at: null,
      user_id: user.id,
    },
  });
}

async function seedCategories(db, categories) {
  for (const category of categories) {
    await db.category.upsert({
      where: { slug: category.slug },
      update: category,
      create: category,
    });
  }
}

async function seedProviders(db) {
  for (const provider of DEFAULT_PROVIDERS) {
    await db.newsProviderConfig.upsert({
      where: { provider_key: provider.provider_key },
      update: provider,
      create: provider,
    });
  }
}

async function seedDestinations(db) {
  for (const destination of DEFAULT_DESTINATIONS) {
    await db.destination.upsert({
      where: { slug: destination.slug },
      update: destination,
      create: destination,
    });
  }
}

async function seedTemplates(db) {
  for (const template of DEFAULT_TEMPLATES) {
    await db.destinationTemplate.upsert({
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

async function loadSeedRelationMaps(db) {
  const [providers, destinations, templates, categories] = await Promise.all([
    db.newsProviderConfig.findMany({
      select: { id: true, provider_key: true },
    }),
    db.destination.findMany({
      select: { id: true, slug: true },
    }),
    db.destinationTemplate.findMany({
      select: { id: true, name: true },
    }),
    db.category.findMany({
      select: { id: true, slug: true },
    }),
  ]);

  return {
    categoryBySlug: new Map(categories.map((category) => [category.slug, category])),
    destinationBySlug: new Map(destinations.map((destination) => [destination.slug, destination])),
    providerByKey: new Map(providers.map((provider) => [provider.provider_key, provider])),
    templateByName: new Map(templates.map((template) => [template.name, template])),
  };
}

async function seedStreams(db) {
  const relationMaps = await loadSeedRelationMaps(db);

  for (const stream of DEFAULT_STREAMS) {
    const provider = relationMaps.providerByKey.get(stream.provider_key);
    const destination = relationMaps.destinationBySlug.get(stream.destinationSlug);
    const template = relationMaps.templateByName.get(stream.defaultTemplateName);

    if (!provider || !destination || !template) {
      throw new Error(`Unable to resolve relations for stream "${stream.slug}".`);
    }

    const categoryIds = stream.categorySlugs
      .map((slug) => relationMaps.categoryBySlug.get(slug)?.id || null)
      .filter(Boolean);

    await db.$transaction(async (tx) => {
      const seededStream = await tx.publishingStream.upsert({
        where: { slug: stream.slug },
        update: {
          active_provider_id: provider.id,
          country_allowlist_json: stream.country_allowlist_json || [],
          default_template_id: template.id,
          destination_id: destination.id,
          duplicate_window_hours: stream.duplicate_window_hours,
          include_keywords_json: stream.include_keywords_json,
          language_allowlist_json: stream.language_allowlist_json || [],
          locale: stream.locale,
          max_posts_per_run: stream.max_posts_per_run,
          mode: stream.mode,
          name: stream.name,
          retry_backoff_minutes: stream.retry_backoff_minutes,
          retry_limit: stream.retry_limit,
          schedule_interval_minutes: stream.schedule_interval_minutes,
          settings_json: stream.settings_json || {},
          status: stream.status,
          timezone: stream.timezone,
        },
        create: {
          active_provider_id: provider.id,
          country_allowlist_json: stream.country_allowlist_json || [],
          default_template_id: template.id,
          destination_id: destination.id,
          duplicate_window_hours: stream.duplicate_window_hours,
          include_keywords_json: stream.include_keywords_json,
          language_allowlist_json: stream.language_allowlist_json || [],
          locale: stream.locale,
          max_posts_per_run: stream.max_posts_per_run,
          mode: stream.mode,
          name: stream.name,
          retry_backoff_minutes: stream.retry_backoff_minutes,
          retry_limit: stream.retry_limit,
          schedule_interval_minutes: stream.schedule_interval_minutes,
          settings_json: stream.settings_json || {},
          slug: stream.slug,
          status: stream.status,
          timezone: stream.timezone,
        },
      });

      await tx.streamCategory.deleteMany({
        where: {
          stream_id: seededStream.id,
        },
      });

      if (categoryIds.length > 0) {
        await tx.streamCategory.createMany({
          data: categoryIds.map((category_id) => ({
            category_id,
            stream_id: seededStream.id,
          })),
          skipDuplicates: true,
        });
      }

      await tx.providerFetchCheckpoint.upsert({
        where: {
          stream_id_provider_config_id: {
            provider_config_id: provider.id,
            stream_id: seededStream.id,
          },
        },
        update: {},
        create: {
          provider_config_id: provider.id,
          stream_id: seededStream.id,
        },
      });
    });
  }
}

async function main() {
  const prisma = createSeedPrismaClient();

  try {
    console.log("Seeding NewsPub baseline data...");
    const defaultCategories = await getDefaultCategories();

    await runSeedPhase("Seeding locales and admin access", async () => {
      await seedLocales(prisma);
      await seedAdminUser(prisma);
    });
    await runSeedPhase("Seeding taxonomy and provider defaults", async () => {
      await seedCategories(prisma, defaultCategories);
      await seedProviders(prisma);
    });
    await runSeedPhase("Seeding destinations and templates", async () => {
      await seedDestinations(prisma);
      await seedTemplates(prisma);
    });
    await runSeedPhase("Seeding publishing streams", async () => {
      await seedStreams(prisma);
    });

    console.log("NewsPub seed complete.");
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error("Prisma seed failed.");
  console.error(error instanceof Error && error.stack ? error.stack : error);
  process.exitCode = 1;
});
