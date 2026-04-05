const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const { config: loadEnv } = require("dotenv");

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

loadEnv({ path: ".env.local", override: true });
loadEnv();

const NPX_COMMAND = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";

function formatOutput(result) {
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
}

function runPrismaCommand(args, { allowFailure = false, printOutput = true } = {}) {
  const result = spawnSync(
    NPX_COMMAND,
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx prisma ${args.join(" ")}`]
      : ["prisma", ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.error) {
    throw result.error;
  }

  const output = formatOutput(result);

  if (printOutput && output) {
    console.log(output);
  }

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status || 1);
  }

  return {
    output,
    status: result.status || 0,
  };
}

function getMigrationNames() {
  return readdirSync(path.join(process.cwd(), "prisma", "migrations"), {
    withFileTypes: true,
  })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

function isP3005Error(output) {
  return /\bP3005\b/.test(output);
}

function databaseMatchesCurrentSchema() {
  const diffResult = runPrismaCommand(
    ["migrate", "diff", "--from-config-datasource", "--to-schema", "prisma/schema.prisma", "--exit-code"],
    { allowFailure: true, printOutput: false },
  );

  if (diffResult.status === 0) {
    return true;
  }

  if (diffResult.status === 2) {
    return false;
  }

  if (diffResult.output) {
    console.error(diffResult.output);
  }

  process.exit(diffResult.status || 1);
}

function baselineExistingDatabase() {
  const migrationNames = getMigrationNames();

  if (migrationNames.length === 0) {
    console.error("Prisma found no checked-in migrations to use for baselining.");
    return false;
  }

  console.log("Checking whether the existing database already matches the current Prisma schema...");

  if (!databaseMatchesCurrentSchema()) {
    return false;
  }

  console.log("Existing database matches the current schema. Recording Prisma migration history...");

  for (const migrationName of migrationNames) {
    runPrismaCommand(["migrate", "resolve", "--applied", migrationName]);
  }

  return true;
}

function applyPrismaMigrations() {
  console.log("Applying Prisma migrations...");

  const migrateResult = runPrismaCommand(["migrate", "deploy"], {
    allowFailure: true,
  });

  if (migrateResult.status === 0) {
    return;
  }

  // Local databases created via the old `db push` flow have the right schema
  // but no migration history yet. Baseline only when the schema already matches.
  if (!isP3005Error(migrateResult.output)) {
    process.exit(migrateResult.status || 1);
  }

  if (!baselineExistingDatabase()) {
    console.error(
      [
        "Prisma reported a non-empty database without migration history, and the current schema does not match the checked-in migrations.",
        "Reset the local database or baseline it manually before running the dev server again.",
      ].join(" "),
    );
    process.exit(migrateResult.status || 1);
  }

  console.log("Retrying Prisma migrations after baselining the existing database...");
  runPrismaCommand(["migrate", "deploy"]);
}

function createAdapterFromDatabaseUrl(databaseUrl) {
  const parsedUrl = new URL(databaseUrl);
  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return new PrismaMariaDb({
    connectionLimit: Number.parseInt(parsedUrl.searchParams.get("connection_limit") || "5", 10),
    database,
    host: parsedUrl.hostname,
    password: decodeURIComponent(parsedUrl.password),
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedUrl.username),
  });
}

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
  console.log("Generating Prisma client...");
  runPrismaCommand(["generate"]);

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
