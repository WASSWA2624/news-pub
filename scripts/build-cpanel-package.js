#!/usr/bin/env node

const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const { execFileSync, execSync } = require("node:child_process");

const rootDir = process.cwd();
const standaloneDir = path.join(rootDir, ".next", "standalone");
const staticDir = path.join(rootDir, ".next", "static");
const publicDir = path.join(rootDir, "public");
const prismaDir = path.join(rootDir, "prisma");
const scriptsDir = path.join(rootDir, "scripts");
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

[".env.production.local", ".env.production", ".env"].forEach(loadEnvFile);
require("./server.js");
`;

  fs.writeFileSync(appEntryPath, appEntryContents, "utf8");
}

function copyGeneratedPrismaClient() {
  assertExists(generatedPrismaDir, "Generated Prisma client");
  copyDirectory(generatedPrismaDir, path.join(outputDir, "node_modules", ".prisma"));
  copyDirectory(generatedPrismaDir, path.join(outputDir, ".next", "node_modules", ".prisma"));
}

function copyDatabaseDeploymentFiles() {
  assertExists(prismaDir, "Prisma project directory");
  copyDirectory(prismaDir, path.join(outputDir, "prisma"));

  const outputScriptsDir = path.join(outputDir, "scripts");

  fs.mkdirSync(outputScriptsDir, { recursive: true });

  for (const scriptName of ["cpanel-db-deploy.js", "cpanel-db-seed.js", "cpanel-doctor.js", "prisma-runtime.js"]) {
    fs.copyFileSync(path.join(scriptsDir, scriptName), path.join(outputScriptsDir, scriptName));
  }
}

function updatePackageManifest() {
  const sourcePackage = JSON.parse(fs.readFileSync(path.join(rootDir, "package.json"), "utf8"));
  const packagePath = path.join(outputDir, "package.json");
  const outputPackage = JSON.parse(fs.readFileSync(packagePath, "utf8"));

  outputPackage.prisma = {
    seed: "node prisma/seed.js",
  };
  outputPackage.scripts = {
    start: "node app.js",
    "cpanel:db:deploy": "node scripts/cpanel-db-deploy.js",
    "cpanel:db:seed": "node scripts/cpanel-db-seed.js",
    "cpanel:doctor": "node scripts/cpanel-doctor.js",
  };
  outputPackage.dependencies = {
    ...outputPackage.dependencies,
    "@prisma/adapter-mariadb": sourcePackage.dependencies["@prisma/adapter-mariadb"],
    "@prisma/client": sourcePackage.dependencies["@prisma/client"],
    mariadb: "3.4.5",
  };

  fs.writeFileSync(packagePath, `${JSON.stringify(outputPackage, null, 2)}\n`, "utf8");
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
    "Database setup:",
    "- To diagnose login failures after upload, run: npm run cpanel:doctor",
    "- After the files are uploaded and cPanel has run NPM Install, run this once from the app root: npm run cpanel:db:deploy",
    "- If the schema already exists and you only need default data, run: npm run cpanel:db:seed",
    "- If cPanel only lets you run a JavaScript file, run scripts/cpanel-db-deploy.js.",
    "- cpanel:db:deploy applies the checked-in Prisma migrations and seeds the baseline admin user, locale, categories, providers, destinations, templates, and streams.",
    "- cpanel:db:seed does not create or alter tables; it only runs the baseline data upserts.",
    "- Both setup commands are safe to rerun; already-applied migrations are skipped and seed records are upserted.",
    "",
    "Notes:",
    "- public/ and .next/static/ are already bundled here.",
    "- npm start runs app.js in this package. Do not run next build on the cPanel server.",
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
  copyDatabaseDeploymentFiles();
  updatePackageManifest();

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
