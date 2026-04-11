const PRISMA_CANONICAL_TABLE_NAMES = Object.freeze([
  "Locale",
  "User",
  "AdminSession",
  "NewsProviderConfig",
  "Destination",
  "Category",
  "MediaAsset",
  "MediaVariant",
  "FetchedArticle",
  "Post",
  "PostTranslation",
  "ProviderFetchCheckpoint",
  "PublishingStream",
  "ArticleMatch",
  "OptimizationCache",
  "DestinationTemplate",
  "SEORecord",
  "ViewEvent",
  "AuditEvent",
  "PostCategory",
  "StreamCategory",
  "PublishAttempt",
  "FetchRun",
]);

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function listSchemaTableNames(connection, database) {
  return connection
    .query(
      "SELECT `TABLE_NAME` FROM `information_schema`.`TABLES` WHERE `TABLE_SCHEMA` = ? ORDER BY `TABLE_NAME` ASC",
      [database],
    )
    .then((rows) =>
      rows
        .map((row) => row?.TABLE_NAME || Object.values(row || {})[0] || "")
        .filter(Boolean),
    );
}

function buildPrismaTableCaseNormalizationPlan(tableNames) {
  const namesByLowercase = new Map();

  for (const tableName of tableNames) {
    const key = `${tableName}`.toLowerCase();
    const variants = namesByLowercase.get(key) || [];

    variants.push(tableName);
    namesByLowercase.set(key, variants);
  }

  const conflicts = [];
  const renames = [];

  for (const canonicalName of PRISMA_CANONICAL_TABLE_NAMES) {
    const variants = namesByLowercase.get(canonicalName.toLowerCase()) || [];

    if (variants.length === 0) {
      continue;
    }

    if (variants.includes(canonicalName)) {
      if (variants.length > 1) {
        conflicts.push({
          canonicalName,
          variants: [...variants].sort((left, right) => left.localeCompare(right)),
        });
      }

      continue;
    }

    if (variants.length > 1) {
      conflicts.push({
        canonicalName,
        variants: [...variants].sort((left, right) => left.localeCompare(right)),
      });
      continue;
    }

    renames.push({
      from: variants[0],
      to: canonicalName,
    });
  }

  return {
    conflicts,
    renames,
  };
}

function formatPrismaTableCaseNormalizationPlan(plan) {
  return plan
    .map(({ from, to }) => `${escapeIdentifier(from)} -> ${escapeIdentifier(to)}`)
    .join(", ");
}

function formatPrismaTableCaseConflicts(conflicts) {
  return conflicts
    .map(({ variants }) => variants.map((variant) => escapeIdentifier(variant)).join(" / "))
    .join(", ");
}

async function normalizePrismaTableCase(connection, database) {
  const tableNames = await listSchemaTableNames(connection, database);
  const plan = buildPrismaTableCaseNormalizationPlan(tableNames);

  if (plan.conflicts.length > 0) {
    throw new Error(
      [
        "Conflicting Prisma table name variants were found in the database.",
        `Found: ${formatPrismaTableCaseConflicts(plan.conflicts)}.`,
        "Keep only one copy of each Prisma table, then rerun the cPanel database setup.",
      ].join(" "),
    );
  }

  if (plan.renames.length === 0) {
    return plan;
  }

  const renameClauses = plan.renames.map(
    ({ from, to }) => `${escapeIdentifier(from)} TO ${escapeIdentifier(to)}`,
  );

  await connection.query(`RENAME TABLE ${renameClauses.join(", ")}`);

  return plan;
}

function formatDatabaseConnectionFailure(error) {
  const details = error instanceof Error ? error.message : `${error}`;
  const code = error?.code ? ` (${error.code})` : "";

  return [
    `Database connection failed${code}: ${details}.`,
    "Confirm DATABASE_URL host, port, database, username, and password.",
    "If the password contains reserved URL characters such as @, :, /, or #, percent-encode them in DATABASE_URL.",
  ].join(" ");
}

module.exports = {
  PRISMA_CANONICAL_TABLE_NAMES,
  buildPrismaTableCaseNormalizationPlan,
  formatDatabaseConnectionFailure,
  formatPrismaTableCaseConflicts,
  formatPrismaTableCaseNormalizationPlan,
  listSchemaTableNames,
  normalizePrismaTableCase,
};
