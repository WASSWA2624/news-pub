const crypto = require("node:crypto");

const PRISMA_CANONICAL_TABLE_NAMES = Object.freeze([
  "locale",
  "user",
  "adminsession",
  "newsproviderconfig",
  "destination",
  "category",
  "mediaasset",
  "mediavariant",
  "fetchedarticle",
  "post",
  "posttranslation",
  "providerfetchcheckpoint",
  "publishingstream",
  "articlematch",
  "optimizationcache",
  "destinationtemplate",
  "seorecord",
  "viewevent",
  "auditevent",
  "postcategory",
  "streamcategory",
  "publishattempt",
  "fetchrun",
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

  const knownTableNames = new Set(tableNames);
  const temporaryRenames = plan.renames.map(({ from, to }, index) => {
    let temporaryName;

    do {
      temporaryName = `__np_tmp_${index}_${crypto.randomUUID().replace(/-/g, "")}`;
    } while (knownTableNames.has(temporaryName));

    knownTableNames.add(temporaryName);

    return {
      from,
      temporaryName,
      to,
    };
  });

  await connection.query(
    `RENAME TABLE ${temporaryRenames
      .map(({ from, temporaryName }) => `${escapeIdentifier(from)} TO ${escapeIdentifier(temporaryName)}`)
      .join(", ")}`,
  );

  await connection.query(
    `RENAME TABLE ${temporaryRenames
      .map(({ temporaryName, to }) => `${escapeIdentifier(temporaryName)} TO ${escapeIdentifier(to)}`)
      .join(", ")}`,
  );

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
