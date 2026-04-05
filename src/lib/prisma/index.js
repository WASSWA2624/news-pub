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
    host: parsedUrl.hostname,
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedUrl.username),
    password: decodeURIComponent(parsedUrl.password),
    database,
    connectionLimit: Number.parseInt(parsedUrl.searchParams.get("connection_limit") || "5", 10),
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

function hasExpectedDelegates(prisma) {
  if (
    !prisma ||
    typeof prisma.mediaAsset === "undefined" ||
    typeof prisma.mediaVariant === "undefined" ||
    typeof prisma.sEORecord === "undefined"
  ) {
    return false;
  }

  const mediaAssetFields = new Set(getModelFieldNames(prisma, "MediaAsset"));
  const mediaVariantFields = new Set(getModelFieldNames(prisma, "MediaVariant"));
  const seoRecordFields = new Set(getModelFieldNames(prisma, "SEORecord"));

  return (
    mediaAssetFields.has("fileName") &&
    mediaAssetFields.has("fileSizeBytes") &&
    mediaAssetFields.has("variants") &&
    mediaVariantFields.has("variantKey") &&
    seoRecordFields.has("canonicalUrl") &&
    seoRecordFields.has("postTranslation")
  );
}

function refreshPrismaClient() {
  const refreshedPrismaClient = createPrismaClient(true);

  // Do not disconnect the retired client here. In dev, hot-refresh can leave
  // in-flight requests still using the old adapter pool for a moment.
  globalForPrisma.__equipBlogPrisma = refreshedPrismaClient;

  return refreshedPrismaClient;
}

export function getPrismaClient() {
  if (!globalForPrisma.__equipBlogPrisma) {
    globalForPrisma.__equipBlogPrisma = createPrismaClient();
  }

  if (!hasExpectedDelegates(globalForPrisma.__equipBlogPrisma)) {
    return refreshPrismaClient();
  }

  return globalForPrisma.__equipBlogPrisma;
}
