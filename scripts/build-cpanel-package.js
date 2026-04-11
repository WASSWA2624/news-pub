#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, execSync } = require("node:child_process");

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const staticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
const generatedPrismaDir = path.join(rootDir, "node_modules", ".prisma");
const outputDir = path.join(rootDir, "dist", "cpanel");

function assertExists(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    throw new Error(`${label} was not found at ${targetPath}. Run "npm run build" first.`);
  }
}

function copyDirectory(sourceDir, targetDir) {
  fs.cpSync(sourceDir, targetDir, {
    force: true,
    recursive: true,
  });
}

function writeRuntimeEntryPoint() {
  const appEntryPath = path.join(outputDir, "app.js");
  const appEntryContents = `const fs = require("node:fs");
const path = require("node:path");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

function parseEnvValue(value) {
  const trimmed = (value || "").trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const unquoted = trimmed.slice(1, -1);

    return quote === '"' ? unquoted.replace(/\\\\n/g, "\\n").replace(/\\\\r/g, "\\r") : unquoted;
  }

  return trimmed.replace(/\\s+#.*$/, "");
}

function loadEnvFile(fileName) {
  const envPath = path.join(__dirname, fileName);

  if (!fs.existsSync(envPath)) {
    return;
  }

  for (const line of fs.readFileSync(envPath, "utf8").split(/\\r?\\n/)) {
    const match = line.match(/^\\s*(?:export\\s+)?([A-Za-z_][A-Za-z0-9_]*)\\s*=\\s*(.*)?\\s*$/);

    if (!match || Object.prototype.hasOwnProperty.call(process.env, match[1])) {
      continue;
    }

    process.env[match[1]] = parseEnvValue(match[2]);
  }
}

[".env.production.local", ".env.local", ".env.production", ".env"].forEach(loadEnvFile);
require("./server.js");
`;

  fs.writeFileSync(appEntryPath, appEntryContents, "utf8");
}

function copyGeneratedPrismaClient() {
  assertExists(generatedPrismaDir, "Generated Prisma client");
  copyDirectory(generatedPrismaDir, path.join(outputDir, "node_modules", ".prisma"));
  copyDirectory(generatedPrismaDir, path.join(outputDir, ".next", "node_modules", ".prisma"));
}

function writeRestartHelper() {
  const tmpDir = path.join(outputDir, "tmp");

  fs.mkdirSync(tmpDir, { recursive: true });
  fs.writeFileSync(
    path.join(tmpDir, "README.txt"),
    [
      "If your cPanel host uses Passenger restarts, touching tmp/restart.txt will restart the app.",
      "Example after a redeploy: create or update tmp/restart.txt from File Manager or SSH.",
      "",
    ].join("\n"),
    "utf8",
  );
}

function writeDeploymentNotes() {
  const notesPath = path.join(outputDir, "DEPLOY-TO-CPANEL.txt");
  const notes = [
    "NewsPub cPanel package",
    "======================",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "This package targets a Linux x64 cPanel host that uses glibc and Node.js 20 or 22.",
    "",
    "Recommended cPanel setup:",
    "- Register the app in Application Manager.",
    "- Application path: the directory where you upload/extract this package.",
    "- Environment: Production.",
    "- Startup file: app.js",
    "- Node.js: 20 or 22",
    "",
    "Environment variables:",
    "- Add the same production env keys your app uses locally, especially DATABASE_URL, SESSION_SECRET, DESTINATION_TOKEN_ENCRYPTION_KEY, REVALIDATE_SECRET, and CRON_SECRET.",
    "- Also set NEXT_PUBLIC_APP_URL to your live domain and configure any provider, Meta, OpenAI, and storage credentials you use.",
    "",
    "Notes:",
    "- public/ and .next/static/ are already bundled here.",
    "- Linux sharp binaries were added for the media pipeline used by admin uploads and remote image ingestion.",
    "- If you redeploy over the same folder, restart the app from cPanel or touch tmp/restart.txt.",
    "",
  ].join("\n");

  fs.writeFileSync(notesPath, notes, "utf8");
}

function runNpmCommand(args, options = {}) {
  if (process.platform === "win32") {
    return execSync(`npm ${args.map((value) => `"${value}"`).join(" ")}`, {
      cwd: rootDir,
      ...options,
    });
  }

  return execFileSync("npm", args, {
    cwd: rootDir,
    ...options,
  });
}

function installLinuxSharpRuntime() {
  const linuxSharpPackages = [
    {
      spec: "@img/sharp-linux-x64@0.34.5",
      targetDir: path.join(outputDir, "node_modules", "@img", "sharp-linux-x64"),
    },
    {
      spec: "@img/sharp-libvips-linux-x64@1.2.4",
      targetDir: path.join(outputDir, "node_modules", "@img", "sharp-libvips-linux-x64"),
    },
  ];
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "news-pub-cpanel-"));

  try {
    for (const linuxSharpPackage of linuxSharpPackages) {
      const packOutput = runNpmCommand(
        ["pack", "--pack-destination", tempDir, linuxSharpPackage.spec],
        { encoding: "utf8" },
      );
      const tarballName = `${packOutput}`.trim().split(/\r?\n/).pop();
      const tarballPath = path.join(tempDir, tarballName);
      const extractDir = path.join(tempDir, tarballName.replace(/\.tgz$/i, ""));

      fs.mkdirSync(extractDir, { recursive: true });
      execFileSync("tar", ["-xf", tarballPath, "-C", extractDir], {
        cwd: rootDir,
        stdio: "inherit",
      });

      fs.rmSync(linuxSharpPackage.targetDir, { force: true, recursive: true });
      fs.mkdirSync(path.dirname(linuxSharpPackage.targetDir), { recursive: true });
      copyDirectory(path.join(extractDir, "package"), linuxSharpPackage.targetDir);
    }
  } finally {
    fs.rmSync(tempDir, { force: true, recursive: true });
  }
}

function main() {
  assertExists(standaloneDir, "Next standalone build output");
  assertExists(staticDir, "Next static asset output");

  fs.rmSync(outputDir, { force: true, recursive: true });
  fs.mkdirSync(outputDir, { recursive: true });

  copyDirectory(standaloneDir, outputDir);
  copyDirectory(staticDir, path.join(outputDir, ".next", "static"));
  copyGeneratedPrismaClient();

  if (fs.existsSync(publicDir)) {
    copyDirectory(publicDir, path.join(outputDir, "public"));
  }

  installLinuxSharpRuntime();
  writeRuntimeEntryPoint();
  writeRestartHelper();
  writeDeploymentNotes();

  console.log(`cPanel package created at ${outputDir}`);
}

main();
