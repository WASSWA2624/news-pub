#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const { readPrismaNamingMetadata } = require("./cpanel-db-utils");

const rootDir = process.cwd();
const migrationsDir = path.join(rootDir, "prisma", "migrations");
const snakeCasePattern = /^[a-z0-9]+(?:_[a-z0-9]+)*$/;
const snakeCaseWithLeadingUnderscorePattern = /^_[a-z0-9]+(?:_[a-z0-9]+)*$/;

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

function printViolations(violations) {
  if (!violations.length) {
    console.log("OK physical Prisma tables and columns are snake_case in schema and migrations.");
    return;
  }

  console.error("Non-snake-case physical database identifiers were found:");

  for (const violation of violations) {
    console.error(`- [${violation.scope}] ${violation.name} (${violation.source})`);
  }

  process.exitCode = 1;
}

function main() {
  const violations = [];

  verifySchemaMappings(violations);
  verifyMigrationSql(violations);
  printViolations(violations);
}

main();
