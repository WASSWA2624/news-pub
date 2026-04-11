#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  formatDatabaseConnectionFailure,
  formatPrismaTableCaseNormalizationPlan,
  normalizePrismaTableCase,
} = require("./cpanel-db-utils");

const rootDir = process.cwd();

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
      "Generated Prisma client was not found. Rebuild and upload the latest cPanel package, then run NPM Install again.",
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
    throw new Error(`Prisma seed failed with exit code ${result.status || 1}.`);
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
    const normalizationPlan = await normalizePrismaTableCase(connection, databaseConfig.database);

    if (normalizationPlan.renames.length > 0) {
      console.log(
        `Normalized imported Prisma table names for cPanel: ${formatPrismaTableCaseNormalizationPlan(normalizationPlan.renames)}.`,
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
