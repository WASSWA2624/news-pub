#!/usr/bin/env node

const fs = require("node:fs");
const path = require("node:path");
const { loadEnvConfig } = require("@next/env");

const rootDir = path.resolve(__dirname, "..");
const standaloneServerPath = path.join(rootDir, ".next", "standalone", "server.js");

if (!fs.existsSync(standaloneServerPath)) {
  console.error(
    "Missing Next standalone build output. Run `npm run build` before starting the standalone server.",
  );
  process.exit(1);
}

loadEnvConfig(rootDir, false);
require(standaloneServerPath);
