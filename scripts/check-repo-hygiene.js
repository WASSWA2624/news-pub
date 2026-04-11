#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const rootDir = process.cwd();
const findings = [];

const placeholderMatchers = Object.freeze({
  ADMIN_SEED_EMAIL: (value) => /example\.(com|org|net|test)$/i.test(value),
  ADMIN_SEED_PASSWORD: (value) => /^replace-with-|^local-only-|^change-this-/i.test(value),
  CRON_SECRET: (value) => /^replace-with-/i.test(value),
  DESTINATION_TOKEN_ENCRYPTION_KEY: (value) => /^replace-with-/i.test(value),
  MEDIASTACK_API_KEY: (value) => value === "" || /^replace-with-/i.test(value),
  META_APP_ID: (value) => value === "" || /^replace-with-/i.test(value),
  META_APP_SECRET: (value) => value === "" || /^replace-with-/i.test(value),
  META_SYSTEM_USER_ACCESS_TOKEN: (value) => value === "" || /^replace-with-/i.test(value),
  META_USER_ACCESS_TOKEN: (value) => value === "" || /^replace-with-/i.test(value),
  NEWSDATA_API_KEY: (value) => value === "" || /^replace-with-/i.test(value),
  NEWSAPI_API_KEY: (value) => value === "" || /^replace-with-/i.test(value),
  OPENAI_API_KEY: (value) => value === "" || /^replace-with-/i.test(value),
  REVALIDATE_SECRET: (value) => /^replace-with-/i.test(value),
  S3_ACCESS_KEY_ID: (value) => value === "" || /^replace-with-/i.test(value),
  S3_SECRET_ACCESS_KEY: (value) => value === "" || /^replace-with-/i.test(value),
  SESSION_SECRET: (value) => /^replace-with-/i.test(value),
});

const genericSecretPatterns = Object.freeze([
  {
    label: "OpenAI-style API key",
    pattern: /\bsk-(?:proj-)?[A-Za-z0-9_-]{20,}\b/g,
  },
  {
    label: "GitHub personal access token",
    pattern: /\bgh[pousr]_[A-Za-z0-9]{20,}\b/g,
  },
  {
    label: "Meta access token",
    pattern: /\bEA[A-Za-z0-9]{40,}\b/g,
  },
]);

function normalizePath(filePath) {
  return filePath.split(path.sep).join("/");
}

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(rootDir, relativePath), "utf8"));
}

function addFinding(message) {
  findings.push(message);
}

function getTrackedFiles() {
  const output = execFileSync("git", ["ls-files"], {
    cwd: rootDir,
    encoding: "utf8",
  });

  return output
    .split(/\r?\n/)
    .map((file) => file.trim())
    .filter(Boolean);
}

function assertLockfileSync() {
  const packageJson = readJson("package.json");
  const packageLock = readJson("package-lock.json");
  const lockRoot = packageLock.packages?.[""] || {};

  for (const section of ["dependencies", "devDependencies"]) {
    const manifestEntries = packageJson[section] || {};
    const lockEntries = lockRoot[section] || {};
    const allNames = [...new Set([...Object.keys(manifestEntries), ...Object.keys(lockEntries)])].sort();

    for (const dependencyName of allNames) {
      if ((manifestEntries[dependencyName] || null) !== (lockEntries[dependencyName] || null)) {
        addFinding(
          `Lockfile drift: ${section}.${dependencyName} differs between package.json and package-lock.json.`,
        );
      }
    }
  }
}

function assertForbiddenTrackedEnvFiles(trackedFiles) {
  const forbiddenFiles = trackedFiles.filter((file) => {
    const normalized = normalizePath(file);

    if (normalized === ".env") {
      return true;
    }

    return /^\.env(?:\.[^.]+)?\.local$/i.test(normalized);
  });

  for (const file of forbiddenFiles) {
    addFinding(`Forbidden env file is tracked: ${file}. Keep local secrets only in untracked files.`);
  }
}

function assertNoTrackedSecrets(trackedFiles) {
  for (const relativePath of trackedFiles) {
    const absolutePath = path.join(rootDir, relativePath);

    if (!fs.existsSync(absolutePath) || fs.statSync(absolutePath).isDirectory()) {
      continue;
    }

    const contents = fs.readFileSync(absolutePath, "utf8");

    for (const { label, pattern } of genericSecretPatterns) {
      pattern.lastIndex = 0;

      if (pattern.test(contents)) {
        addFinding(`Possible ${label} found in tracked file ${normalizePath(relativePath)}.`);
      }
    }

    for (const [envName, isPlaceholder] of Object.entries(placeholderMatchers)) {
      const assignmentPattern = new RegExp(`^\\s*${envName}\\s*=\\s*"([^"\\r\\n]*)"`, "gm");

      for (const match of contents.matchAll(assignmentPattern)) {
        const value = `${match[1] || ""}`.trim();

        if (!value || isPlaceholder(value)) {
          continue;
        }

        addFinding(
          `Tracked file ${normalizePath(relativePath)} contains a populated ${envName} value that does not look like a placeholder.`,
        );
      }
    }
  }
}

function main() {
  const trackedFiles = getTrackedFiles();

  assertForbiddenTrackedEnvFiles(trackedFiles);
  assertNoTrackedSecrets(trackedFiles);
  assertLockfileSync();

  if (findings.length) {
    console.error("Repo hygiene checks failed:");
    for (const finding of findings) {
      console.error(`- ${finding}`);
    }
    process.exitCode = 1;
    return;
  }

  console.log("Repo hygiene checks passed.");
}

main();
