const {
  applyPrismaMigrations,
  createAdapterFromDatabaseUrl,
  generatePrismaClient,
  loadRuntimeEnv,
  runPrismaCommand,
} = require("./prisma-runtime");

loadRuntimeEnv();

async function shouldSeedBaselineData() {
  const { PrismaClient } = require("@prisma/client");

  const prisma = new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(`${process.env.DATABASE_URL || ""}`),
  });

  try {
    const [localeCount, providerCount, destinationCount] = await Promise.all([
      prisma.locale.count(),
      prisma.newsProviderConfig.count(),
      prisma.destination.count(),
    ]);

    return localeCount === 0 || providerCount === 0 || destinationCount === 0;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  generatePrismaClient();
  applyPrismaMigrations();

  if (await shouldSeedBaselineData()) {
    console.log("Seeding NewsPub baseline data...");
    runPrismaCommand(["db", "seed"]);
  } else {
    console.log("Baseline data already present. Skipping seed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
