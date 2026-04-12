const fs = require("node:fs");
const path = require("node:path");

const { readPrismaNamingMetadata } = require("./cpanel-db-utils");

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "prisma", "migrations");
const runtimeSqlRoots = [path.join(rootDir, "scripts"), path.join(rootDir, "src")];
const runtimeQueryRoots = [...runtimeSqlRoots, path.join(rootDir, "prisma")];
const snakeCasePattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const snakeCaseWithLeadingUnderscorePattern = /^_[a-z0-9]+(?:_[a-z0-9]+)*$/;
const runtimeCodeFilePattern = /\.(?:[cm]?js|jsx|ts|tsx)$/i;
const runtimeIgnoredFilePattern = /\.(?:test|spec)\.[^.]+$/i;
const runtimeQueryIgnoredFilePattern =
  /(?:^|[\\/])(?:cpanel-db-utils|verify-db-snake-case)\.test\.[^.]+$/i;
const stringLiteralPattern = /`(?:\\[\s\S]|[^\\`])*`|"(?:\\[\s\S]|[^\\"])*"|'(?:\\[\s\S]|[^\\'])*'/g;
const sqlKeywordPattern =
  /\bselect\b[\s\S]*\bfrom\b|\binsert\s+into\b|\bupdate\s+[`"A-Za-z_]/i;
const sqlStructuralPattern =
  /\bdelete\s+from\b|\bcreate\s+table\b|\balter\s+table\b|\bdrop\s+(?:index|table)\b|\brename\s+table\b|json_table\s*\(|\bmatch\s*\([^)]*\)\s*against\b/i;

function isSnakeCaseIdentifier(identifier, { allowLeadingUnderscore = false } = {}) {
  const normalizedIdentifier = `${identifier || ""}`.trim();

  if (!normalizedIdentifier) {
    return false;
  }

  if (allowLeadingUnderscore && snakeCaseWithLeadingUnderscorePattern.test(normalizedIdentifier)) {
    return true;
  }

  return snakeCasePattern.test(normalizedIdentifier);
}

function collectMigrationSqlFiles() {
  if (!fs.existsSync(migrationsDir)) {
    return [];
  }

  return fs
    .readdirSync(migrationsDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(migrationsDir, entry.name, "migration.sql"))
    .filter((migrationPath) => fs.existsSync(migrationPath));
}

function collectRuntimeSqlFiles() {
  return collectRuntimeCodeFiles(runtimeSqlRoots, {
    ignoreFilePattern: runtimeIgnoredFilePattern,
  });
}

function collectRuntimeQueryFiles() {
  return collectRuntimeCodeFiles(runtimeQueryRoots, {
    ignoreFilePattern: runtimeQueryIgnoredFilePattern,
  });
}

function collectRuntimeCodeFiles(roots, { ignoreFilePattern = null } = {}) {
  const files = [];

  function visit(currentPath) {
    if (!fs.existsSync(currentPath)) {
      return;
    }

    const stat = fs.statSync(currentPath);

    if (stat.isDirectory()) {
      for (const entry of fs.readdirSync(currentPath, { withFileTypes: true })) {
        visit(path.join(currentPath, entry.name));
      }

      return;
    }

    const relativePath = path.relative(rootDir, currentPath);

    if (
      !runtimeCodeFilePattern.test(currentPath)
      || (ignoreFilePattern && ignoreFilePattern.test(relativePath))
      || relativePath.startsWith(`.${path.sep}`)
    ) {
      return;
    }

    files.push(currentPath);
  }

  for (const runtimeRoot of runtimeSqlRoots) {
    visit(runtimeRoot);
  }

  return files.sort((left, right) => left.localeCompare(right));
}

function recordViolation(violations, scope, name, source) {
  violations.push({
    name,
    scope,
    source,
  });
}

function verifySchemaMappings(violations) {
  const metadata = readPrismaNamingMetadata();

  for (const table of metadata.tables) {
    if (!isSnakeCaseIdentifier(table.canonicalName, { allowLeadingUnderscore: true })) {
      recordViolation(violations, "schema_table", table.canonicalName, "prisma/schema.prisma");
    }

    for (const column of table.columns) {
      if (!isSnakeCaseIdentifier(column.fieldName)) {
        recordViolation(
          violations,
          "schema_prisma_field",
          `${table.modelName}.${column.fieldName} -> ${table.canonicalName}.${column.canonicalName}`,
          "prisma/schema.prisma",
        );
      }

      if (!isSnakeCaseIdentifier(column.canonicalName)) {
        recordViolation(
          violations,
          "schema_column",
          `${table.canonicalName}.${column.canonicalName}`,
          "prisma/schema.prisma",
        );
      }
    }
  }
}

function verifyMigrationSql(violations) {
  const createTablePattern = /CREATE TABLE\s+`([^`]+)`/gi;
  const alterTablePattern = /ALTER TABLE\s+`([^`]+)`/gi;
  const renameTablePattern = /RENAME TABLE\s+`([^`]+)`\s+TO\s+`([^`]+)`/gi;
  const createTableColumnPattern = /^\s*`([^`]+)`\s+[A-Z]/gm;
  const addColumnPattern = /ADD COLUMN\s+`([^`]+)`/gi;
  const renameColumnPattern = /RENAME COLUMN\s+`([^`]+)`\s+TO\s+`([^`]+)`/gi;
  const changeColumnPattern = /CHANGE COLUMN\s+`([^`]+)`\s+`([^`]+)`/gi;

  for (const migrationPath of collectMigrationSqlFiles()) {
    const relativePath = path.relative(rootDir, migrationPath);
    const sql = fs.readFileSync(migrationPath, "utf8");
    let match;

    while ((match = createTablePattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[1], { allowLeadingUnderscore: true })) {
        recordViolation(violations, "migration_table", match[1], relativePath);
      }
    }

    while ((match = alterTablePattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[1], { allowLeadingUnderscore: true })) {
        recordViolation(violations, "migration_table", match[1], relativePath);
      }
    }

    while ((match = renameTablePattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[2], { allowLeadingUnderscore: true })) {
        recordViolation(violations, "migration_table", match[2], relativePath);
      }
    }

    while ((match = createTableColumnPattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[1])) {
        recordViolation(violations, "migration_column", match[1], relativePath);
      }
    }

    while ((match = addColumnPattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[1])) {
        recordViolation(violations, "migration_column", match[1], relativePath);
      }
    }

    while ((match = renameColumnPattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[2])) {
        recordViolation(violations, "migration_column", match[2], relativePath);
      }
    }

    while ((match = changeColumnPattern.exec(sql))) {
      if (!isSnakeCaseIdentifier(match[2])) {
        recordViolation(violations, "migration_column", match[2], relativePath);
      }
    }
  }
}

function normalizeStringLiteral(literal) {
  return literal.slice(1, -1);
}

function extractStringLiterals(source) {
  return [...source.matchAll(stringLiteralPattern)].map((match) => ({
    text: normalizeStringLiteral(match[0]),
  }));
}

function looksLikeSqlLiteral(text) {
  return sqlKeywordPattern.test(text) || sqlStructuralPattern.test(text);
}

function buildLegacyIdentifierPatterns(metadata = readPrismaNamingMetadata()) {
  const rows = [];

  for (const table of metadata.tables) {
    for (const legacyName of table.legacyNames || []) {
      rows.push({
        canonicalName: table.canonicalName,
        legacyName,
        scope: "runtime_sql_table",
      });
    }

    for (const column of table.columns) {
      for (const legacyName of column.legacyNames || []) {
        rows.push({
          canonicalName: `${table.canonicalName}.${column.canonicalName}`,
          legacyName,
          scope: "runtime_sql_column",
        });
      }
    }
  }

  return rows;
}

function buildLegacyQueryIdentifierPatterns(metadata = readPrismaNamingMetadata()) {
  const rows = [];

  for (const table of metadata.tables) {
    for (const column of table.columns) {
      for (const legacyName of column.legacyNames || []) {
        rows.push({
          canonicalName: `${table.canonicalName}.${column.canonicalName}`,
          legacyName,
          scope: "runtime_query_field",
        });
      }
    }
  }

  for (const compositeSelector of metadata.compositeSelectors || []) {
    for (const legacyName of compositeSelector.legacyNames || []) {
      rows.push({
        canonicalName: `${compositeSelector.tableName}.${compositeSelector.canonicalName}`,
        legacyName,
        scope: "runtime_query_composite",
      });
    }
  }

  return rows;
}

function escapeRegExp(value) {
  return `${value}`.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function findLegacySqlIdentifierMatches(source, metadata = readPrismaNamingMetadata()) {
  const matches = [];
  const seenMatches = new Set();
  const legacyPatterns = buildLegacyIdentifierPatterns(metadata);

  for (const literal of extractStringLiterals(source)) {
    if (!looksLikeSqlLiteral(literal.text)) {
      continue;
    }

    for (const row of legacyPatterns) {
      const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(row.legacyName)}([^A-Za-z0-9_]|$)`);

      if (!pattern.test(literal.text)) {
        continue;
      }

      const key = `${row.scope}:${row.legacyName}:${row.canonicalName}`;

      if (seenMatches.has(key)) {
        continue;
      }

      seenMatches.add(key);
      matches.push(row);
    }
  }

  return matches;
}

function findLegacyQueryIdentifierMatches(source, metadata = readPrismaNamingMetadata()) {
  const matches = [];
  const seenMatches = new Set();
  const legacyPatterns = buildLegacyQueryIdentifierPatterns(metadata);

  for (const row of legacyPatterns) {
    const pattern = new RegExp(`(^|[^A-Za-z0-9_])${escapeRegExp(row.legacyName)}([^A-Za-z0-9_]|$)`);

    if (!pattern.test(source)) {
      continue;
    }

    const key = `${row.scope}:${row.legacyName}:${row.canonicalName}`;

    if (seenMatches.has(key)) {
      continue;
    }

    seenMatches.add(key);
    matches.push(row);
  }

  return matches;
}

function verifyRawSqlIdentifiers(violations, metadata = readPrismaNamingMetadata()) {
  for (const filePath of collectRuntimeSqlFiles()) {
    const relativePath = path.relative(rootDir, filePath);
    const source = fs.readFileSync(filePath, "utf8");

    for (const match of findLegacySqlIdentifierMatches(source, metadata)) {
      recordViolation(
        violations,
        match.scope,
        `${match.legacyName} -> ${match.canonicalName}`,
        relativePath,
      );
    }
  }
}

function verifyRuntimeQueryIdentifiers(violations, metadata = readPrismaNamingMetadata()) {
  for (const filePath of collectRuntimeQueryFiles()) {
    const relativePath = path.relative(rootDir, filePath);
    const source = fs.readFileSync(filePath, "utf8");

    for (const match of findLegacyQueryIdentifierMatches(source, metadata)) {
      recordViolation(
        violations,
        match.scope,
        `${match.legacyName} -> ${match.canonicalName}`,
        relativePath,
      );
    }
  }
}

function printViolations(violations) {
  if (!violations.length) {
    console.log("OK Prisma schema, raw SQL, and database-facing query identifiers match the snake_case database.");
    return;
  }

  console.error("Non-snake-case Prisma or database-facing identifiers were found:");

  for (const violation of violations) {
    console.error(`- [${violation.scope}] ${violation.name} (${violation.source})`);
  }

  process.exitCode = 1;
}

function runVerification() {
  const violations = [];
  const metadata = readPrismaNamingMetadata();

  verifySchemaMappings(violations);
  verifyMigrationSql(violations);
  verifyRawSqlIdentifiers(violations, metadata);
  verifyRuntimeQueryIdentifiers(violations, metadata);

  return violations;
}

function main() {
  printViolations(runVerification());
}

if (require.main === module) {
  main();
}

module.exports = {
  collectMigrationSqlFiles,
  collectRuntimeQueryFiles,
  collectRuntimeSqlFiles,
  extractStringLiterals,
  findLegacyQueryIdentifierMatches,
  findLegacySqlIdentifierMatches,
  isSnakeCaseIdentifier,
  looksLikeSqlLiteral,
  runVerification,
  verifyMigrationSql,
  verifyRawSqlIdentifiers,
  verifyRuntimeQueryIdentifiers,
  verifySchemaMappings,
};
