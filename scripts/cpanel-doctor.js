#!/usr/bin/env node

const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "prisma", "migrations");

const requiredEnvNames = [
  "DATABASE_URL",
  "NEXT_PUBLIC_APP_URL",
  "DEFAULT_LOCALE",
  "SUPPORTED_LOCALES",
  "SESSION_SECRET",
  "SESSION_MAX_AGE_SECONDS",
  "ADMIN_SEED_EMAIL",
  "ADMIN_SEED_PASSWORD",
  "DESTINATION_TOKEN_ENCRYPTION_KEY",
  "MEDIA_DRIVER",
  "UPLOAD_ALLOWED_MIME_TYPES",
  "MEDIA_MAX_REMOTE_FILE_BYTES",
  "REVALIDATE_SECRET",
  "CRON_SECRET",
  "ENABLE_ANALYTICS",
  "ENABLE_METRICS",
  "DEFAULT_SCHEDULE_TIMEZONE",
  "INITIAL_BACKFILL_HOURS",
];

const passwordHashOptions = {
  maxmem: 128 * 1024 * 1024,
};

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
  [".env.production.local", ".env.local", ".env.production", ".env"].forEach(loadEnvFile);
}

function getEnvValue(name) {
  return `${process.env[name] || ""}`.trim();
}

function parseDatabaseUrl(databaseUrl) {
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

function getMigrationNames() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && fs.existsSync(path.join(migrationsDir, entry.name, "migration.sql")))
    .map((entry) => entry.name)
    .sort();
}

function getPasswordHashParameters(passwordHash) {
  const [algorithm, cost, blockSize, parallelization, salt, derivedKey] = `${passwordHash || ""}`.split("$");

  if (algorithm !== "scrypt" || !cost || !blockSize || !parallelization || !salt || !derivedKey) {
    return null;
  }

  const parsedCost = Number.parseInt(cost, 10);
  const parsedBlockSize = Number.parseInt(blockSize, 10);
  const parsedParallelization = Number.parseInt(parallelization, 10);

  if (
    !Number.isInteger(parsedCost) ||
    !Number.isInteger(parsedBlockSize) ||
    !Number.isInteger(parsedParallelization)
  ) {
    return null;
  }

  return {
    blockSize: parsedBlockSize,
    cost: parsedCost,
    derivedKey,
    parallelization: parsedParallelization,
    salt,
  };
}

function verifyPassword(password, passwordHash) {
  const params = getPasswordHashParameters(passwordHash);

  if (!params) {
    return false;
  }

  const expectedKey = Buffer.from(params.derivedKey, "base64url");
  const actualKey = crypto.scryptSync(password, Buffer.from(params.salt, "base64url"), expectedKey.length, {
    ...passwordHashOptions,
    N: params.cost,
    p: params.parallelization,
    r: params.blockSize,
  });

  return crypto.timingSafeEqual(expectedKey, actualKey);
}

function hasGeneratedPrismaClient() {
  return [
    path.join(rootDir, "node_modules", ".prisma", "client", "default.js"),
    path.join(rootDir, ".next", "node_modules", ".prisma", "client", "default.js"),
  ].some((clientEntryPath) => fs.existsSync(clientEntryPath));
}

function checkRuntimePackage(failures, warnings) {
  const isStandalonePackage = fs.existsSync(path.join(rootDir, "server.js")) && fs.existsSync(path.join(rootDir, ".next"));

  if (!isStandalonePackage) {
    warnings.push("This does not look like the extracted dist/cpanel app root. Run this from the cPanel app folder after upload.");
    return;
  }

  if (!fs.existsSync(path.join(rootDir, "app.js"))) {
    failures.push("app.js is missing. Rebuild with npm run build:cpanel and upload the full dist/cpanel folder.");
  }

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));

    if (packageJson.scripts?.start !== "node app.js") {
      failures.push("package.json start script must be \"node app.js\" in the cPanel package. Rebuild and upload the latest package.");
    }
  } catch {
    failures.push("package.json could not be read from the cPanel app root.");
  }

  if (!hasGeneratedPrismaClient()) {
    failures.push("Generated Prisma client is missing. Run cPanel NPM Install or rebuild and upload the latest package.");
  }
}

async function hasTable(connection, database, tableName) {
  const rows = await connection.query(
    "SELECT `TABLE_NAME` FROM `information_schema`.`TABLES` WHERE `TABLE_SCHEMA` = ? AND `TABLE_NAME` = ? LIMIT 1",
    [database, tableName],
  );

  return rows.length > 0;
}

async function checkDatabase(connection, databaseConfig, failures) {
  const requiredTables = ["_prisma_migrations", "User", "AdminSession", "AuditEvent"];

  for (const tableName of requiredTables) {
    if (!(await hasTable(connection, databaseConfig.database, tableName))) {
      failures.push(`Database table ${tableName} is missing. Run npm run cpanel:db:deploy in the cPanel app root.`);
    }
  }

  if (failures.some((failure) => failure.includes("Database table"))) {
    return;
  }

  const migrationNames = getMigrationNames();

  if (!migrationNames.length) {
    failures.push("Prisma migrations were not found in the uploaded package. Rebuild and upload the full dist/cpanel folder.");
  }

  for (const migrationName of migrationNames) {
    const rows = await connection.query(
      "SELECT `migration_name` FROM `_prisma_migrations` WHERE `migration_name` = ? AND `finished_at` IS NOT NULL AND `rolled_back_at` IS NULL LIMIT 1",
      [migrationName],
    );

    if (!rows.length) {
      failures.push(`Migration ${migrationName} is not applied. Run npm run cpanel:db:deploy in the cPanel app root.`);
    }
  }

  const adminEmail = getEnvValue("ADMIN_SEED_EMAIL").toLowerCase();
  const adminPassword = getEnvValue("ADMIN_SEED_PASSWORD");
  const users = await connection.query(
    "SELECT `email`, `isActive`, `passwordHash`, `role` FROM `User` WHERE `email` = ? LIMIT 1",
    [adminEmail],
  );
  const adminUser = users[0];

  if (!adminUser) {
    failures.push("The seeded admin user is missing. Run npm run cpanel:db:seed in the cPanel app root.");
    return;
  }

  if (!adminUser.isActive) {
    failures.push("The seeded admin user is inactive. Run npm run cpanel:db:seed in the cPanel app root.");
  }

  if (adminUser.role !== "SUPER_ADMIN") {
    failures.push("The seeded admin user is not a SUPER_ADMIN. Run npm run cpanel:db:seed in the cPanel app root.");
  }

  if (!verifyPassword(adminPassword, adminUser.passwordHash)) {
    failures.push("ADMIN_SEED_PASSWORD does not match the seeded admin user. Run npm run cpanel:db:seed, then sign in with that password.");
  }
}

function printResults({ failures, warnings }) {
  for (const warning of warnings) {
    console.warn(`WARN ${warning}`);
  }

  if (!failures.length) {
    console.log("OK cPanel package, environment, database migrations, and seeded admin login are ready.");
    return;
  }

  console.error("cPanel login checks failed:");

  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
}

async function main() {
  const failures = [];
  const warnings = [];

  loadRuntimeEnv();
  checkRuntimePackage(failures, warnings);

  for (const name of requiredEnvNames) {
    if (!getEnvValue(name)) {
      failures.push(`${name} is missing. Add it to cPanel environment variables or .env.production.local.`);
    }
  }

  if (getEnvValue("MEDIA_DRIVER") === "local") {
    for (const name of ["LOCAL_MEDIA_BASE_PATH", "LOCAL_MEDIA_BASE_URL"]) {
      if (!getEnvValue(name)) {
        failures.push(`${name} is required when MEDIA_DRIVER=local.`);
      }
    }
  }

  if (!failures.some((failure) => failure.includes("DATABASE_URL is missing"))) {
    let databaseConfig;

    try {
      databaseConfig = parseDatabaseUrl(getEnvValue("DATABASE_URL"));
    } catch (error) {
      failures.push(error instanceof Error ? error.message : `${error}`);
    }

    if (databaseConfig) {
      let mariadb;

      try {
        mariadb = require("mariadb");
      } catch (error) {
        if (error?.code === "MODULE_NOT_FOUND") {
          failures.push("The mariadb dependency is missing. Run cPanel NPM Install before checking or repairing login.");
        } else {
          throw error;
        }
      }

      if (mariadb) {
        let connection;

        try {
          connection = await mariadb.createConnection(databaseConfig);
          await checkDatabase(connection, databaseConfig, failures);
        } catch (error) {
          failures.push(`Database check failed: ${error instanceof Error ? error.message : error}`);
        } finally {
          if (connection) {
            await connection.end();
          }
        }
      }
    }
  }

  printResults({ failures, warnings });
  process.exitCode = failures.length ? 1 : 0;
}

main().catch((error) => {
  console.error("cPanel doctor failed.");
  console.error(error);
  process.exitCode = 1;
});
