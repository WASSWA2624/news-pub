#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, execSync } = require("node:child_process");

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const staticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
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
  const appEntryContents = `const { loadEnvConfig } = require("@next/env");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
process.env.HOSTNAME = process.env.HOSTNAME || "0.0.0.0";

loadEnvConfig(__dirname, false);
require("./server.js");
`;

  fs.writeFileSync(appEntryPath, appEntryContents, "utf8");
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
