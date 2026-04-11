#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, ".next");
const standaloneDir = path.join(buildDir, "standalone");
const standaloneServerPath = path.join(standaloneDir, "server.js");
const staticSourcePath = path.join(buildDir, "static");
const staticTargetPath = path.join(standaloneDir, ".next", "static");
const publicSourcePath = path.join(rootDir, "public");
const publicTargetPath = path.join(standaloneDir, "public");

function assertInsideDirectory(targetPath, directoryPath) {
  const relativePath = path.relative(path.resolve(directoryPath), path.resolve(targetPath));

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to modify a path outside ${directoryPath}: ${targetPath}`);
  }
}

function refreshStandaloneDirectory(sourcePath, targetPath, { required = false } = {}) {
  if (!fs.existsSync(sourcePath)) {
    if (required) {
      throw new Error(`Missing required Next standalone asset directory: ${sourcePath}`);
    }

    return;
  }

  assertInsideDirectory(targetPath, standaloneDir);
  fs.rmSync(targetPath, { force: true, recursive: true });
  fs.mkdirSync(path.dirname(targetPath), { recursive: true });
  fs.cpSync(sourcePath, targetPath, { force: true, recursive: true });
}

if (!fs.existsSync(standaloneServerPath)) {
  console.error(
    "Missing Next standalone build output. Run `npm run build` before starting the standalone server.",
  );
  process.exit(1);
}

refreshStandaloneDirectory(staticSourcePath, staticTargetPath, { required: true });
refreshStandaloneDirectory(publicSourcePath, publicTargetPath);

loadEnvConfig(rootDir, false);
require(standaloneServerPath);
