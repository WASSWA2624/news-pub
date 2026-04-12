/**
 * Lazy Prisma client helpers for NewsPub server runtime code.
 */

if (process.env.NODE_ENV !== "test") {
  await import("server-only");
}

import { createRequire } from "node:module";

import { PrismaMariaDb } from "@prisma/adapter-mariadb";

import { env } from "@/lib/env/server";

const require = createRequire(import.meta.url);

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

function clearPrismaClientModuleCache() {
  for (const moduleId of Object.keys(require.cache)) {
    const normalizedModuleId = moduleId.replace(/\\/g, "/");

    if (
      normalizedModuleId.includes("/node_modules/@prisma/client/") ||
      normalizedModuleId.includes("/node_modules/.prisma/client/")
    ) {
      delete require.cache[moduleId];
    }
  }
}

function loadPrismaClient(forceRefresh = false) {
  if (forceRefresh) {
    clearPrismaClientModuleCache();
  }

  return require("@prisma/client");
}

function createPrismaClient(forceRefresh = false) {
  const { PrismaClient } = loadPrismaClient(forceRefresh);

  return new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(env.database.url),
  });
}

const globalForPrisma = globalThis;

function getModelFieldNames(prisma, modelName) {
  return prisma?._runtimeDataModel?.models?.[modelName]?.fields?.map((field) => field.name) || [];
}

function collectErrorMessages(error, messages = []) {
  if (!error || typeof error !== "object") {
    return messages;
  }

  const values = [
    error.name,
    error.code,
    error.message,
    error.originalMessage,
    error.originalCode,
  ];

  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      messages.push(value.trim());
    }
  }

  if (error.cause && error.cause !== error) {
    collectErrorMessages(error.cause, messages);
  }

  return messages;
}

function hasExpectedDelegates(prisma) {
  if (
    !prisma ||
    typeof prisma.newsProviderConfig === "undefined" ||
    typeof prisma.publishingStream === "undefined" ||
    typeof prisma.destination === "undefined"
  ) {
    return false;
  }

  const providerFields = new Set(getModelFieldNames(prisma, "NewsProviderConfig"));
  const streamFields = new Set(getModelFieldNames(prisma, "PublishingStream"));
  const fetchedArticleFields = new Set(getModelFieldNames(prisma, "FetchedArticle"));

  return (
    providerFields.has("provider_key") &&
    providerFields.has("request_defaults_json") &&
    streamFields.has("destination_id") &&
    streamFields.has("active_provider_id") &&
    fetchedArticleFields.has("dedupe_fingerprint")
  );
}

function refreshPrismaClient() {
  const refreshedPrismaClient = createPrismaClient(true);

  globalForPrisma.__newsPubPrisma = refreshedPrismaClient;

  return refreshedPrismaClient;
}

/**
 * Returns whether an error reflects an unavailable Prisma or MariaDB runtime
 * rather than an application-level query bug.
 *
 * Public build-time data loaders use this to degrade to empty shells when the
 * local database has not been bootstrapped yet.
 *
 * @param {unknown} error - Error raised during Prisma client creation or query execution.
 * @returns {boolean} `true` when the failure looks like a connectivity or credential issue.
 */
export function isPrismaConnectionError(error) {
  const details = collectErrorMessages(error).join("\n");

  return /DriverAdapterError|PrismaClientInitializationError|P1000|P1001|P2021|P2024|TableDoesNotExist|table .*does not exist|pool timeout|Can't reach database server|Access denied|ECONNREFUSED/i.test(
    details,
  );
}
/**
 * Returns the singleton Prisma client used by NewsPub runtime code.
 */

export function getPrismaClient() {
  if (!globalForPrisma.__newsPubPrisma) {
    globalForPrisma.__newsPubPrisma = createPrismaClient();
  }

  if (!hasExpectedDelegates(globalForPrisma.__newsPubPrisma)) {
    return refreshPrismaClient();
  }

  return globalForPrisma.__newsPubPrisma;
}
