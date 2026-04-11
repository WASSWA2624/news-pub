#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");

const rootDir = path.resolve(__dirname, "..");
const buildDir = path.join(rootDir, ".next");
const standaloneDir = path.join(buildDir, "standalone");
const standaloneServerPath = path.join(standaloneDir, "server.js");
const standalonePidPath = path.join(standaloneDir, ".news-pub-standalone.pid");
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

function loadLocalStandaloneEnv() {
  [".env.development.local", ".env.local", ".env"].forEach(loadEnvFile);
}

if (!fs.existsSync(standaloneServerPath)) {
  console.error(
    "Missing Next standalone build output. Run `npm run build` before starting the standalone server.",
  );
  process.exit(1);
}

refreshStandaloneDirectory(staticSourcePath, staticTargetPath, { required: true });
refreshStandaloneDirectory(publicSourcePath, publicTargetPath);
fs.writeFileSync(standalonePidPath, `${process.pid}`, "utf8");

function clearStandalonePidFile() {
  fs.rmSync(standalonePidPath, { force: true });
}

["exit", "SIGINT", "SIGTERM", "SIGBREAK"].forEach((eventName) => {
  process.on(eventName, () => {
    clearStandalonePidFile();

    if (eventName !== "exit") {
      process.exit(0);
    }
  });
});

loadLocalStandaloneEnv();
require(standaloneServerPath);
