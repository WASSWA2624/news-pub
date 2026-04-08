const { spawnSync } = require("node:child_process");
const { readdirSync } = require("node:fs");
const path = require("node:path");

const { config: loadEnv } = require("dotenv");

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

const NPX_COMMAND = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";

function trimEnvValue(value) {
  return `${value || ""}`.trim();
}

function looksLikePlaceholderEnvValue(value) {
  return /(^|[^a-z])(replace-with|change-this|example(?:\.|$)|your-)/i.test(trimEnvValue(value));
}

function parseDatabaseUrl(databaseUrl) {
  const normalizedUrl = trimEnvValue(databaseUrl);

  if (!normalizedUrl) {
    return null;
  }

  try {
    return new URL(normalizedUrl);
  } catch {
    return null;
  }
}

function describeDatabaseTarget(databaseUrl) {
  const parsedUrl = parseDatabaseUrl(databaseUrl);

  if (!parsedUrl) {
    return "unknown database target";
  }

  const database = parsedUrl.pathname.replace(/^\//, "") || "(missing database)";
  const user = decodeURIComponent(parsedUrl.username || "") || "(missing user)";
  const host = parsedUrl.hostname || "localhost";
  const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306;

  return `${user}@${host}:${port}/${database}`;
}

function assertLocalDatabaseUrlReady(databaseUrl = process.env.DATABASE_URL) {
  const normalizedUrl = trimEnvValue(databaseUrl);

  if (!normalizedUrl) {
    throw new Error(
      [
        "DATABASE_URL is missing.",
        "Copy .env.example to .env.local and point DATABASE_URL at a reachable local MySQL or MariaDB database before running database-backed workflows.",
      ].join("\n"),
    );
  }

  const parsedUrl = parseDatabaseUrl(normalizedUrl);

  if (!parsedUrl) {
    throw new Error(
      [
        "DATABASE_URL is not a valid database URL.",
        "Update .env.local so DATABASE_URL uses a local MySQL or MariaDB connection string such as mysql://user:password@localhost:3306/news_pub.",
      ].join("\n"),
    );
  }

  if (!["mariadb:", "mysql:"].includes(parsedUrl.protocol)) {
    throw new Error(
      [
        `DATABASE_URL must use the mysql:// or mariadb:// protocol for local NewsPub development.`,
        `Current target: ${describeDatabaseTarget(normalizedUrl)}.`,
      ].join("\n"),
    );
  }

  const database = parsedUrl.pathname.replace(/^\//, "");
  const username = decodeURIComponent(parsedUrl.username || "");
  const password = decodeURIComponent(parsedUrl.password || "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  if (!username) {
    throw new Error(
      [
        "DATABASE_URL must include a database username.",
        `Current target: ${describeDatabaseTarget(normalizedUrl)}.`,
      ].join("\n"),
    );
  }

  if ([username, password, database].some(looksLikePlaceholderEnvValue)) {
    throw new Error(
      [
        "DATABASE_URL in .env.local still contains placeholder credentials.",
        `Current target: ${describeDatabaseTarget(normalizedUrl)}.`,
        "Replace it with a real local MySQL or MariaDB connection string before running npm run dev.",
      ].join("\n"),
    );
  }
}

function loadRuntimeEnv() {
  loadEnv({ path: ".env.local", override: true });
  loadEnv();
}

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
  assertLocalDatabaseUrlReady();
  console.log("Applying Prisma migrations...");

  const migrateResult = runPrismaCommand(["migrate", "deploy"], {
    allowFailure: true,
  });

  if (migrateResult.status === 0) {
    return;
  }

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
  assertLocalDatabaseUrlReady(databaseUrl);
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

function generatePrismaClient() {
  console.log("Generating Prisma client...");
  runPrismaCommand(["generate"]);
}

module.exports = {
  applyPrismaMigrations,
  assertLocalDatabaseUrlReady,
  createAdapterFromDatabaseUrl,
  generatePrismaClient,
  loadRuntimeEnv,
  runPrismaCommand,
};
