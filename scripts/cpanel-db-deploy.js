#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  formatDatabaseConnectionFailure,
  formatPrismaTableCaseNormalizationPlan,
  normalizePrismaTableCase,
} = require("./cpanel-db-utils");

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "prisma", "migrations");
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

function isTruthyEnvValue(value) {
  return ["1", "true", "yes", "on"].includes(`${value || ""}`.trim().toLowerCase());
}

function shouldRunSeedAfterDeploy() {
  if (isTruthyEnvValue(process.env.SKIP_DB_SEED_ON_DEPLOY)) {
    return false;
  }

  return isTruthyEnvValue(process.env.RUN_DB_SEED_ON_DEPLOY);
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

function splitSqlStatements(sql) {
  const statements = [];
  let current = "";
  let quote = "";
  let lineComment = false;
  let blockComment = false;
  let escaped = false;

  for (let index = 0; index < sql.length; index += 1) {
    const char = sql[index];
    const next = sql[index + 1];

    if (lineComment) {
      current += char;

      if (char === "\n") {
        lineComment = false;
      }

      continue;
    }

    if (blockComment) {
      current += char;

      if (char === "*" && next === "/") {
        current += next;
        blockComment = false;
        index += 1;
      }

      continue;
    }

    if (quote) {
      current += char;

      if ((quote === "'" || quote === '"') && char === "\\" && !escaped) {
        escaped = true;
        continue;
      }

      if (char === quote && !escaped) {
        quote = "";
      }

      escaped = false;
      continue;
    }

    if (char === "-" && next === "-" && /\s/.test(sql[index + 2] || "")) {
      current += char + next;
      lineComment = true;
      index += 1;
      continue;
    }

    if (char === "/" && next === "*") {
      current += char + next;
      blockComment = true;
      index += 1;
      continue;
    }

    if (char === "'" || char === '"' || char === "`") {
      quote = char;
      current += char;
      continue;
    }

    if (char === ";") {
      const statement = current.trim();

      if (statement) {
        statements.push(statement);
      }

      current = "";
      continue;
    }

    current += char;
  }

  const finalStatement = current.trim();

  if (finalStatement) {
    statements.push(finalStatement);
  }

  return statements.filter((statement) => statement.replace(/^\s*--.*$/gm, "").trim());
}

function getMigrationNames() {
  assertRuntimeFile(
    path.join("scripts", "cpanel-db-utils.js"),
    "scripts/cpanel-db-utils.js is missing from this cPanel package. Rebuild with npm run build:cpanel and upload the full dist/cpanel folder.",
  );

  if (!fs.existsSync(migrationsDir)) {
    throw new Error(`Prisma migrations were not found at ${migrationsDir}. Rebuild the cPanel package.`);
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(migrationsDir, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}

async function ensureMigrationTable(connection) {
  await connection.query(`
CREATE TABLE IF NOT EXISTS \`_prisma_migrations\` (
  \`id\` VARCHAR(36) NOT NULL,
  \`checksum\` VARCHAR(64) NOT NULL,
  \`finished_at\` DATETIME(3) NULL,
  \`migration_name\` VARCHAR(255) NOT NULL,
  \`logs\` TEXT NULL,
  \`rolled_back_at\` DATETIME(3) NULL,
  \`started_at\` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  \`applied_steps_count\` INTEGER UNSIGNED NOT NULL DEFAULT 0,
  PRIMARY KEY (\`id\`),
  UNIQUE INDEX \`_prisma_migrations_migration_name_key\`(\`migration_name\`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci
`);
}

async function isMigrationApplied(connection, migrationName) {
  const rows = await connection.query(
    "SELECT `migration_name` FROM `_prisma_migrations` WHERE `migration_name` = ? AND `finished_at` IS NOT NULL AND `rolled_back_at` IS NULL LIMIT 1",
    [migrationName],
  );

  return rows.length > 0;
}

async function applyMigration(connection, migrationName) {
  const migrationPath = path.join(migrationsDir, migrationName, "migration.sql");
  const migrationSql = fs.readFileSync(migrationPath, "utf8");
  const statements = splitSqlStatements(migrationSql);
  const checksum = crypto.createHash("sha256").update(migrationSql).digest("hex");
  const startedAt = new Date();

  console.log(`Applying migration ${migrationName} (${statements.length} statements)...`);

  for (const statement of statements) {
    await connection.query(statement);
  }

  await connection.query(
    "INSERT INTO `_prisma_migrations` (`id`, `checksum`, `finished_at`, `migration_name`, `logs`, `rolled_back_at`, `started_at`, `applied_steps_count`) VALUES (?, ?, NOW(3), ?, NULL, NULL, ?, ?)",
    [crypto.randomUUID(), checksum, migrationName, startedAt, statements.length],
  );
}

async function applyMigrations() {
  const databaseConfig = parseDatabaseUrl();
  let mariadb;

  try {
    mariadb = require("mariadb");
  } catch (error) {
    if (error?.code === "MODULE_NOT_FOUND") {
      throw new Error("The mariadb dependency is missing. Run cPanel NPM Install before running database setup.");
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
        `Normalized legacy Prisma table names for cPanel: ${formatPrismaTableCaseNormalizationPlan(normalizationPlan.renames)}.`,
      );
    }

    await ensureMigrationTable(connection);

    for (const migrationName of getMigrationNames()) {
      if (await isMigrationApplied(connection, migrationName)) {
        console.log(`Skipping already-applied migration ${migrationName}.`);
        continue;
      }

      await applyMigration(connection, migrationName);
    }
  } finally {
    await connection.end();
  }
}

function ensureRootGeneratedPrismaClient() {
  assertRuntimeFile(
    path.join("prisma", "seed.js"),
    "prisma/seed.js is missing from this cPanel package. Rebuild with npm run build:cpanel and upload the full dist/cpanel folder.",
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
  console.log("Seeding baseline NewsPub records...");

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

async function main() {
  loadRuntimeEnv();
  await applyMigrations();
  console.log("Prisma migrations are up to date.");

  if (shouldRunSeedAfterDeploy()) {
    console.log("RUN_DB_SEED_ON_DEPLOY=1 detected. Seeding baseline NewsPub records...");
    ensureRootGeneratedPrismaClient();
    runSeed();
    console.log("cPanel database deploy and seed complete.");
    return;
  }

  console.log(
    "cPanel database deploy complete. Baseline seed was skipped. Run npm run cpanel:db:seed when you want to upsert the default data set.",
  );
}

main().catch((error) => {
  console.error("cPanel database setup failed.");
  console.error(error);
  process.exitCode = 1;
});
