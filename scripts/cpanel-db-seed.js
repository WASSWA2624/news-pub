#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

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

function main() {
  loadRuntimeEnv();
  ensureRequiredSeedEnv();
  ensureRootGeneratedPrismaClient();
  runSeed();
  console.log("cPanel data seed complete.");
}

try {
  main();
} catch (error) {
  console.error("cPanel data seed failed.");
  console.error(error);
  process.exitCode = 1;
}
