#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const {
  applyPrismaMigrations,
  assertLocalDatabaseUrlReady,
  createAdapterFromDatabaseUrl,
  generatePrismaClient,
  loadRuntimeEnv,
  runPrismaCommand,
} = require("./prisma-runtime");
const { assertDefaultAdminAccountSeeded } = require("./default-admin-account");

const rootDir = process.cwd();
const defaultOutputPath = path.join(rootDir, "dist", "db", "news-pub-seeded.sql");

function printHelp() {
  console.log(`Usage: node scripts/export-seeded-db.js [options]

Resets the local NewsPub database to seeded defaults and exports a SQL dump.

Options:
  --out <path>          Output SQL file. Default: dist/db/news-pub-seeded.sql
  --data-only           Export data only, without CREATE TABLE statements.
  --keep-existing-data  Upsert seed data without clearing existing local rows.
  --reset-to-defaults   Clear runtime data first, then reseed defaults before export. This is the default.
  --allow-remote        Allow exporting a non-local DATABASE_URL target.
  --help                Show this help text.

Environment:
  DATABASE_URL, ADMIN_SEED_EMAIL, and ADMIN_SEED_PASSWORD are loaded from .env.local.
  Set MYSQLDUMP_BIN to a mysqldump or mariadb-dump executable if it is not on PATH.`);
}

function parseArgs(argv) {
  const options = {
    allowRemote: false,
    dataOnly: false,
    out: defaultOutputPath,
    resetToDefaults: true,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];

    if (arg === "--help" || arg === "-h") {
      options.help = true;
      continue;
    }

    if (arg === "--data-only") {
      options.dataOnly = true;
      continue;
    }

    if (arg === "--reset-to-defaults") {
      options.resetToDefaults = true;
      continue;
    }

    if (arg === "--keep-existing-data") {
      options.resetToDefaults = false;
      continue;
    }

    if (arg === "--allow-remote") {
      options.allowRemote = true;
      continue;
    }

    if (arg === "--out") {
      const value = argv[index + 1];

      if (!value) {
        throw new Error("--out requires a file path.");
      }

      options.out = value;
      index += 1;
      continue;
    }

    if (arg.startsWith("--out=")) {
      options.out = arg.slice("--out=".length);
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  options.out = path.resolve(rootDir, options.out);

  return options;
}

function requiredEnv(name) {
  const value = `${process.env[name] || ""}`.trim();

  if (!value) {
    throw new Error(`${name} is required for seeded database export.`);
  }

  return value;
}

function parseDatabaseUrl() {
  assertLocalDatabaseUrlReady();

  return new URL(requiredEnv("DATABASE_URL"));
}

function getDatabaseName(parsedUrl) {
  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return database;
}

function describeDatabaseTarget(parsedUrl) {
  const database = getDatabaseName(parsedUrl);
  const user = decodeURIComponent(parsedUrl.username || "") || "(missing user)";
  const host = parsedUrl.hostname || "localhost";
  const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306;

  return `${user}@${host}:${port}/${database}`;
}

function assertLocalTarget(parsedUrl, allowRemote) {
  if (allowRemote) {
    return;
  }

  const host = `${parsedUrl.hostname || "localhost"}`.toLowerCase();
  const localHosts = new Set(["localhost", "127.0.0.1", "::1"]);

  if (!localHosts.has(host)) {
    throw new Error(
      [
        `Refusing to export non-local database target ${describeDatabaseTarget(parsedUrl)}.`,
        "Use --allow-remote only if you intentionally want to export that target.",
      ].join(" "),
    );
  }
}

function getPathEntries() {
  return `${process.env.PATH || ""}`.split(path.delimiter).filter(Boolean);
}

function getPathExecutableCandidates(commandName) {
  const extensions = process.platform === "win32"
    ? `${process.env.PATHEXT || ".EXE;.CMD;.BAT"}`.split(";").filter(Boolean)
    : [""];
  const names = process.platform === "win32" && path.extname(commandName)
    ? [commandName]
    : extensions.map((extension) => `${commandName}${extension}`);

  return getPathEntries().flatMap((entry) => names.map((name) => path.join(entry, name)));
}

function getWindowsDumpCandidates() {
  const candidates = [
    "C:\\xampp\\mysql\\bin\\mariadb-dump.exe",
    "C:\\xampp\\mysql\\bin\\mysqldump.exe",
  ];
  const programFiles = [process.env.ProgramFiles, process.env["ProgramFiles(x86)"]].filter(Boolean);

  for (const baseDir of programFiles) {
    if (!fs.existsSync(baseDir)) {
      continue;
    }

    for (const entry of fs.readdirSync(baseDir, { withFileTypes: true })) {
      if (!entry.isDirectory() || !/^(mariadb|mysql)/i.test(entry.name)) {
        continue;
      }

      const vendorPath = path.join(baseDir, entry.name);

      candidates.push(path.join(vendorPath, "bin", "mariadb-dump.exe"));
      candidates.push(path.join(vendorPath, "bin", "mysqldump.exe"));

      for (const childEntry of fs.readdirSync(vendorPath, { withFileTypes: true })) {
        if (!childEntry.isDirectory()) {
          continue;
        }

        candidates.push(path.join(vendorPath, childEntry.name, "bin", "mariadb-dump.exe"));
        candidates.push(path.join(vendorPath, childEntry.name, "bin", "mysqldump.exe"));
      }
    }
  }

  return candidates;
}

function resolveDumpCommand() {
  const configured = `${process.env.MYSQLDUMP_BIN || ""}`.trim();

  if (configured) {
    if (!fs.existsSync(configured)) {
      throw new Error(`MYSQLDUMP_BIN points to a missing file: ${configured}`);
    }

    return configured;
  }

  const commandNames = process.platform === "win32"
    ? ["mariadb-dump", "mysqldump"]
    : ["mariadb-dump", "mysqldump"];
  const candidates = [
    ...commandNames.flatMap(getPathExecutableCandidates),
    ...(process.platform === "win32" ? getWindowsDumpCandidates() : []),
  ];

  const dumpCommand = candidates.find((candidate) => fs.existsSync(candidate));

  if (!dumpCommand) {
    throw new Error(
      [
        "Could not find mysqldump or mariadb-dump.",
        "Install MySQL/MariaDB client tools or set MYSQLDUMP_BIN to the executable path.",
        "For XAMPP on Windows, this is usually C:\\xampp\\mysql\\bin\\mysqldump.exe.",
      ].join(" "),
    );
  }

  return dumpCommand;
}

function buildDumpArgs(parsedUrl, outputPath, { dataOnly }) {
  const database = getDatabaseName(parsedUrl);
  const user = decodeURIComponent(parsedUrl.username || "");
  const host = parsedUrl.hostname || "localhost";
  const port = parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306;
  const args = [
    `--host=${host}`,
    `--port=${port}`,
    `--user=${user}`,
    "--single-transaction",
    "--routines",
    "--triggers",
    "--default-character-set=utf8mb4",
    `--result-file=${outputPath}`,
  ];

  if (dataOnly) {
    args.push("--no-create-info");
  }

  args.push(database);

  return args;
}

function runCommand(command, args, { env = process.env } = {}) {
  const result = spawnSync(command, args, {
    cwd: rootDir,
    env,
    stdio: "inherit",
  });

  if (result.error) {
    throw result.error;
  }

  if (result.status !== 0) {
    throw new Error(`${path.basename(command)} failed with exit code ${result.status || 1}.`);
  }
}

function runResetToDefaults() {
  runCommand(process.execPath, ["scripts/reset-db.js"]);
}

async function verifyDefaultAdminAccount() {
  const { PrismaClient } = require("@prisma/client");
  const prisma = new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(requiredEnv("DATABASE_URL")),
  });

  try {
    const adminUser = await assertDefaultAdminAccountSeeded(prisma);

    console.log(`Verified default admin account ${adminUser.email}.`);
  } finally {
    await prisma.$disconnect();
  }
}

function exportDatabase(parsedUrl, options) {
  const dumpCommand = resolveDumpCommand();
  const outputDir = path.dirname(options.out);
  const env = {
    ...process.env,
    MYSQL_PWD: decodeURIComponent(parsedUrl.password || ""),
  };

  fs.mkdirSync(outputDir, { recursive: true });

  if (fs.existsSync(options.out)) {
    fs.rmSync(options.out, { force: true });
  }

  console.log(`Exporting ${describeDatabaseTarget(parsedUrl)} to ${options.out}...`);
  runCommand(dumpCommand, buildDumpArgs(parsedUrl, options.out, options), { env });
}

async function main() {
  const options = parseArgs(process.argv.slice(2));

  if (options.help) {
    printHelp();
    return;
  }

  loadRuntimeEnv();
  requiredEnv("ADMIN_SEED_EMAIL");
  requiredEnv("ADMIN_SEED_PASSWORD");

  const parsedUrl = parseDatabaseUrl();
  assertLocalTarget(parsedUrl, options.allowRemote);

  if (options.resetToDefaults) {
    console.log("Resetting local database to seeded defaults...");
    runResetToDefaults();
  } else {
    generatePrismaClient();
    applyPrismaMigrations();
    console.log("Seeding local NewsPub baseline data...");
    runPrismaCommand(["db", "seed"]);
  }

  await verifyDefaultAdminAccount();
  exportDatabase(parsedUrl, options);
  console.log("Seeded database export complete.");
}

main().catch((error) => {
  console.error("Seeded database export failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
