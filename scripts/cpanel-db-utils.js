const crypto = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const defaultSchemaPath = path.join(process.cwd(), "prisma", "schema.prisma");

function escapeIdentifier(identifier) {
  return `\`${String(identifier).replace(/`/g, "``")}\``;
}

function normalizeWhitespace(value) {
  return `${value || ""}`.trim();
}

function snakeCaseToCamelCase(value) {
  const normalizedValue = normalizeWhitespace(value);

  if (!normalizedValue.includes("_")) {
    return normalizedValue;
  }

  return normalizedValue.replace(/_([a-z0-9])/g, (_, token) => token.toUpperCase());
}

function createLegacyIdentifierCandidates(canonicalName, explicitLegacyNames = []) {
  const legacyNames = new Set(
    (explicitLegacyNames || []).map((value) => normalizeWhitespace(value)).filter(Boolean),
  );
  const camelCaseName = snakeCaseToCamelCase(canonicalName);

  if (camelCaseName && camelCaseName !== canonicalName) {
    legacyNames.add(camelCaseName);
  }

  return [...legacyNames];
}

function extractQuotedValue(source, marker) {
  const match = source.match(new RegExp(`${marker}\\("([^"]+)"\\)`));

  return match ? match[1] : null;
}

function parsePrismaSchemaNamingMetadata(schemaSource) {
  const tables = [];
  const compositeSelectors = [];
  const modelPattern = /model\s+(\w+)\s+\{([\s\S]*?)\n\}/g;
  const modelNames = new Set(
    [...schemaSource.matchAll(/model\s+(\w+)\s+\{/g)].map((match) => match[1]),
  );
  let modelMatch;

  while ((modelMatch = modelPattern.exec(schemaSource))) {
    const [, modelName, body] = modelMatch;
    const columns = [];
    let tableName = modelName.toLowerCase();

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();

      if (!line || line.startsWith("//")) {
        continue;
      }

      if (line.startsWith("@@map(")) {
        tableName = extractQuotedValue(line, "@@map") || tableName;
        continue;
      }

      if (line.startsWith("@@")) {
        continue;
      }

      const fieldMatch = line.match(/^(\w+)\s+([^\s]+)(.*)$/);

      if (!fieldMatch) {
        continue;
      }

      const [, fieldName, fieldType, attributes] = fieldMatch;
      const normalizedFieldType = fieldType.replace(/[?[\]]/g, "");

      if (attributes.includes("@ignore")) {
        continue;
      }

      if (fieldType.endsWith("[]")) {
        continue;
      }

      if (attributes.includes("@relation") && !attributes.includes("@map(")) {
        continue;
      }

      if (modelNames.has(normalizedFieldType)) {
        continue;
      }

      const mappedName = extractQuotedValue(attributes, "@map");
      const canonicalName = mappedName || fieldName;

      columns.push({
        canonicalName,
        fieldName,
        legacyNames: createLegacyIdentifierCandidates(
          canonicalName,
          mappedName && fieldName !== canonicalName ? [fieldName] : [],
        ),
      });
    }

    const fieldNameToCanonicalName = new Map(
      columns.map((column) => [column.fieldName, column.canonicalName]),
    );

    for (const rawLine of body.split(/\r?\n/)) {
      const line = rawLine.trim();
      const compositeMatch = line.match(/^@@(?:id|unique)\(\[([^\]]+)\]/);

      if (!compositeMatch) {
        continue;
      }

      const originalFields = compositeMatch[1]
        .split(",")
        .map((value) => normalizeWhitespace(value))
        .filter(Boolean);

      if (originalFields.length < 2) {
        continue;
      }

      const canonicalFields = originalFields.map((fieldName) =>
        fieldNameToCanonicalName.get(fieldName) || fieldName,
      );
      const canonicalName = canonicalFields.join("_");
      const camelCaseSelectorName = canonicalFields.map((fieldName) =>
        snakeCaseToCamelCase(fieldName),
      ).join("_");

      compositeSelectors.push({
        canonicalName,
        legacyNames: createLegacyIdentifierCandidates(
          canonicalName,
          originalFields.join("_") !== canonicalName ? [originalFields.join("_")] : [],
        ).filter((legacyName) => legacyName !== canonicalName && legacyName !== camelCaseSelectorName)
          .concat(
            camelCaseSelectorName && camelCaseSelectorName !== canonicalName
              ? [camelCaseSelectorName]
              : [],
          )
          .filter((legacyName, index, values) => legacyName && values.indexOf(legacyName) === index),
        modelName,
        tableName,
      });
    }

    tables.push({
      canonicalName: tableName,
      columns,
      legacyNames: [...new Set([modelName.toLowerCase()].filter((name) => name !== tableName))],
      modelName,
    });
  }

  return {
    compositeSelectors,
    tables,
  };
}

function readPrismaNamingMetadata(schemaPath = defaultSchemaPath) {
  return parsePrismaSchemaNamingMetadata(fs.readFileSync(schemaPath, "utf8"));
}

function buildVariantMap(names) {
  const variantsByLowercase = new Map();

  for (const name of names) {
    const key = `${name}`.toLowerCase();
    const variants = variantsByLowercase.get(key) || [];

    variants.push(name);
    variantsByLowercase.set(key, variants);
  }

  return variantsByLowercase;
}

function collectCandidateVariants(variantsByLowercase, names) {
  const candidates = new Set();

  for (const name of names) {
    for (const variant of variantsByLowercase.get(`${name}`.toLowerCase()) || []) {
      candidates.add(variant);
    }
  }

  return [...candidates];
}

function buildNormalizationPlan(existingNames, metadataRows) {
  const variantsByLowercase = buildVariantMap(existingNames);
  const conflicts = [];
  const renames = [];

  for (const row of metadataRows) {
    const candidates = collectCandidateVariants(variantsByLowercase, [
      row.canonicalName,
      ...(row.legacyNames || []),
    ]);

    if (candidates.length === 0) {
      continue;
    }

    if (candidates.includes(row.canonicalName)) {
      if (candidates.length > 1) {
        conflicts.push({
          canonicalName: row.canonicalName,
          variants: [...candidates].sort((left, right) => left.localeCompare(right)),
        });
      }

      continue;
    }

    if (candidates.length > 1) {
      conflicts.push({
        canonicalName: row.canonicalName,
        variants: [...candidates].sort((left, right) => left.localeCompare(right)),
      });
      continue;
    }

    renames.push({
      from: candidates[0],
      to: row.canonicalName,
    });
  }

  return {
    conflicts,
    renames,
  };
}

function formatNormalizationPlan(plan) {
  return plan
    .map(({ from, to }) => `${escapeIdentifier(from)} -> ${escapeIdentifier(to)}`)
    .join(", ");
}

function formatNormalizationConflicts(conflicts) {
  return conflicts
    .map(({ variants }) => variants.map((variant) => escapeIdentifier(variant)).join(" / "))
    .join(", ");
}

function buildPrismaTableNormalizationPlan(tableNames, metadata = readPrismaNamingMetadata()) {
  return buildNormalizationPlan(
    tableNames,
    metadata.tables.map((table) => ({
      canonicalName: table.canonicalName,
      legacyNames: table.legacyNames,
    })),
  );
}

function buildPrismaColumnNormalizationPlan(columnNames, columnMetadata) {
  return buildNormalizationPlan(columnNames, columnMetadata);
}

function formatPrismaTableNormalizationPlan(plan) {
  return formatNormalizationPlan(plan);
}

function formatPrismaTableNormalizationConflicts(conflicts) {
  return formatNormalizationConflicts(conflicts);
}

function formatPrismaColumnNormalizationPlan(plan) {
  return plan
    .map(({ from, tableName, to }) => `${escapeIdentifier(tableName)}.${escapeIdentifier(from)} -> ${escapeIdentifier(to)}`)
    .join(", ");
}

function formatPrismaColumnNormalizationConflicts(conflicts) {
  return conflicts
    .map(({ tableName, variants }) => `${escapeIdentifier(tableName)}: ${variants.map((variant) => escapeIdentifier(variant)).join(" / ")}`)
    .join(", ");
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

function listSchemaColumnNames(connection, database, tableName) {
  return connection
    .query(
      "SELECT `COLUMN_NAME` FROM `information_schema`.`COLUMNS` WHERE `TABLE_SCHEMA` = ? AND `TABLE_NAME` = ? ORDER BY `ORDINAL_POSITION` ASC",
      [database, tableName],
    )
    .then((rows) =>
      rows
        .map((row) => row?.COLUMN_NAME || Object.values(row || {})[0] || "")
        .filter(Boolean),
    );
}

async function normalizePrismaTableNames(connection, database, metadata) {
  const tableNames = await listSchemaTableNames(connection, database);
  const plan = buildPrismaTableNormalizationPlan(tableNames, metadata);

  if (plan.conflicts.length > 0) {
    throw new Error(
      [
        "Conflicting Prisma table variants were found in the database.",
        `Found: ${formatPrismaTableNormalizationConflicts(plan.conflicts)}.`,
        "Keep only one physical copy of each Prisma table, then rerun the database deploy command.",
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

async function normalizePrismaColumnNames(connection, database, metadata) {
  const conflicts = [];
  const renames = [];

  for (const table of metadata.tables) {
    const columnNames = await listSchemaColumnNames(connection, database, table.canonicalName);
    const plan = buildPrismaColumnNormalizationPlan(columnNames, table.columns);

    if (plan.conflicts.length > 0) {
      conflicts.push(
        ...plan.conflicts.map((conflict) => ({
          ...conflict,
          tableName: table.canonicalName,
        })),
      );
      continue;
    }

    for (const rename of plan.renames) {
      await connection.query(
        `ALTER TABLE ${escapeIdentifier(table.canonicalName)} RENAME COLUMN ${escapeIdentifier(rename.from)} TO ${escapeIdentifier(rename.to)}`,
      );
      renames.push({
        ...rename,
        tableName: table.canonicalName,
      });
    }
  }

  if (conflicts.length > 0) {
    throw new Error(
      [
        "Conflicting Prisma column variants were found in the database.",
        `Found: ${formatPrismaColumnNormalizationConflicts(conflicts)}.`,
        "Resolve the duplicate physical columns before rerunning database deploy.",
      ].join(" "),
    );
  }

  return {
    conflicts,
    renames,
  };
}

async function normalizePrismaSchemaNaming(connection, database, schemaPath = defaultSchemaPath) {
  const metadata = readPrismaNamingMetadata(schemaPath);
  const tablePlan = await normalizePrismaTableNames(connection, database, metadata);
  const columnPlan = await normalizePrismaColumnNames(connection, database, metadata);

  return {
    columnPlan,
    metadata,
    tablePlan,
  };
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

const prismaNamingMetadata = readPrismaNamingMetadata();
const PRISMA_CANONICAL_TABLE_NAMES = Object.freeze(
  prismaNamingMetadata.tables.map((table) => table.canonicalName),
);

module.exports = {
  PRISMA_CANONICAL_TABLE_NAMES,
  buildPrismaColumnNormalizationPlan,
  buildPrismaTableNormalizationPlan,
  formatDatabaseConnectionFailure,
  formatPrismaColumnNormalizationConflicts,
  formatPrismaColumnNormalizationPlan,
  formatPrismaTableNormalizationConflicts,
  formatPrismaTableNormalizationPlan,
  listSchemaColumnNames,
  listSchemaTableNames,
  normalizePrismaSchemaNaming,
  parsePrismaSchemaNamingMetadata,
  readPrismaNamingMetadata,
};
