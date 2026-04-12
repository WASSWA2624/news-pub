#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  formatDatabaseConnectionFailure,
  formatPrismaColumnNormalizationPlan,
  formatPrismaTableNormalizationPlan,
  normalizePrismaSchemaNaming,
} = require("./cpanel-db-utils");

const rootDir = process.cwd();
const generatedClientEntryRelativePath = path.join("node_modules", ".prisma", "client", "default.js");

function parseEnvValue(value) {
  const trimmed = (value || "").trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const unquoted = trimmed.slice(1, -1);

    return quote === '"' ? unquoted.replace(/\\n/g, "\n").replace(/\\r/g, "\r") : unquoted;
  }

  return trimmed.replace(/\s+#.*$/, "");
}

function loadEnvFile(fileName) {
  const envPath = path.join(rootDir, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const match = line.match(/^\s*(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)?\s*$/);

    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      continue;
    }

    process.env[match[1]] = parseEnvValue(match[2]);
  }
}

function loadRuntimeEnv() {
  [".env.production", ".env"].forEach(loadEnvFile);
}

function requiredEnv(name) {
  const value = `${process.env[name] || ""}`.trim();

  if (!value) {
    throw new Error(`${name} is required. Add it to cPanel environment variables, .env.production, or .env.`);
  }

  return value;
}

function assertRuntimeFile(relativePath, failureMessage) {
  const absolutePath = path.join(rootDir, relativePath);

  if (!fs.existsSync(absolutePath)) {
    throw new Error(failureMessage);
  }
}

function parseDatabaseUrl() {
  const databaseUrl = requiredEnv("DATABASE_URL");
  const parsedUrl = new URL(databaseUrl);
  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!["mysql:", "mariadb:"].includes(parsedUrl.protocol)) {
    throw new Error("DATABASE_URL must use mysql:// or mariadb://.");
  }

  if (!database || !parsedUrl.username) {
    throw new Error("DATABASE_URL must include a database name and username.");
  }

  return {
    database,
    host: parsedUrl.hostname || "localhost",
    password: decodeURIComponent(parsedUrl.password || ""),
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedUrl.username),
  };
}

function ensureRequiredSeedEnv() {
  requiredEnv("DATABASE_URL");
  requiredEnv("ADMIN_SEED_EMAIL");
  requiredEnv("ADMIN_SEED_PASSWORD");
}

function ensureRootGeneratedPrismaClient() {
  assertRuntimeFile(
    path.join("prisma", "seed.js"),
    "prisma/seed.js is missing from this cPanel package. Rebuild with npm run build:cpanel and upload the full dist/cpanel folder.",
  );
  assertRuntimeFile(
    path.join("scripts", "cpanel-db-utils.js"),
    "scripts/cpanel-db-utils.js is missing from this cPanel package. Rebuild with npm run build:cpanel and upload the full dist/cpanel folder.",
  );

  const rootGeneratedClient = path.join(rootDir, "node_modules", ".prisma");
  const rootGeneratedClientEntry = path.join(rootGeneratedClient, "client", "default.js");
  const bundledGeneratedClient = path.join(rootDir, ".next", "node_modules", ".prisma");

  if (!fs.existsSync(rootGeneratedClientEntry) && fs.existsSync(bundledGeneratedClient)) {
    fs.mkdirSync(path.dirname(rootGeneratedClient), { recursive: true });
    fs.cpSync(bundledGeneratedClient, rootGeneratedClient, {
      force: true,
      recursive: true,
    });
  }

  if (!fs.existsSync(rootGeneratedClientEntry)) {
    throw new Error(
      [
        `Generated Prisma client was not found at ${generatedClientEntryRelativePath}.`,
        "Run cPanel NPM Install again or rebuild and upload the latest cPanel package before seeding.",
      ].join(" "),
    );
  }
}

function runSeed() {
  console.log("Seeding NewsPub baseline data only...");

  const result = spawnSync(process.execPath, ["prisma/seed.js"], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(
      `Prisma seed failed with exit code ${result.status || 1}. Review the seed output above, fix the reported issue, then rerun npm run cpanel:db:seed.`,
    );
  }
}

async function normalizeImportedPrismaTables() {
  const databaseConfig = parseDatabaseUrl();
  let mariadb;

  try {
    mariadb = require("mariadb");
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND") {
      throw new Error("The mariadb dependency is missing. Run cPanel NPM Install before running the data seed.");
    }

    throw error;
  }

  let connection;

  try {
    connection = await mariadb.createConnection(databaseConfig);
  } catch (error) {
    throw new Error(formatDatabaseConnectionFailure(error));
  }

  try {
    const normalizationPlan = await normalizePrismaSchemaNaming(connection, databaseConfig.database);

    if (normalizationPlan.tablePlan.renames.length > 0) {
      console.log(
        `Normalized legacy Prisma table names for cPanel: ${formatPrismaTableNormalizationPlan(normalizationPlan.tablePlan.renames)}.`,
      );
    }

    if (normalizationPlan.columnPlan.renames.length > 0) {
      console.log(
        `Normalized legacy Prisma column names for cPanel: ${formatPrismaColumnNormalizationPlan(normalizationPlan.columnPlan.renames)}.`,
      );
    }
  } finally {
    await connection.end();
  }
}

async function main() {
  loadRuntimeEnv();
  ensureRequiredSeedEnv();
  await normalizeImportedPrismaTables();
  ensureRootGeneratedPrismaClient();
  runSeed();
  console.log("cPanel data seed complete.");
}

main().catch((error) => {
  console.error("cPanel data seed failed.");
  console.error(error);
  process.exitCode = 1;
});
