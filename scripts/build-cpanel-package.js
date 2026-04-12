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
const packageLockPath = path.join(rootDir, "package-lock.json");
const generatedPrismaDir = path.join(rootDir, "node_modules", ".prisma");
const outputDir = path.join(rootDir, "dist", "cpanel");
const runtimeScriptFileNames = [
  "cpanel-db-deploy.js",
  "cpanel-db-seed.js",
  "cpanel-db-utils.js",
  "cpanel-doctor.js",
  "internal-scheduler.js",
  "prisma-runtime.js",
];

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
const { startInternalScheduler } = require("./scripts/internal-scheduler.js");

process.env.NODE_ENV = process.env.NODE_ENV || "production";
// Next standalone may reuse HOSTNAME for internal self-fetches. 0.0.0.0 is
// valid for binding but not as a connect target, so default to loopback.
process.env.HOSTNAME = process.env.HOSTNAME || "127.0.0.1";

function assertRequiredRuntimeFiles() {
  const missingPaths = [
    "server.js",
    "package.json",
    "prisma/seed.js",
    "scripts/cpanel-db-deploy.js",
    "scripts/cpanel-db-seed.js",
    "scripts/cpanel-db-utils.js",
    "scripts/cpanel-doctor.js",
    "scripts/internal-scheduler.js",
  ].filter((relativePath) => !fs.existsSync(path.join(__dirname, relativePath)));

  if (missingPaths.length > 0) {
    throw new Error(
      "The uploaded cPanel package is incomplete. Missing: "
      + missingPaths.join(", ")
      + ". Rebuild with \\"npm run build:cpanel\\" and upload the full dist/cpanel directory.",
    );
  }
}

function parseEnvValue(value) {
  const trimmed = (value || "").trim();
  const quote = trimmed[0];

  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    const unquoted = trimmed.slice(1, -1);

    return quote === '"' ? unquoted.replace(/\\\\n/g, "\\n").replace(/\\\\r/g, "\\r") : unquoted;
  }

  return trimmed.replace(/\\s+#.*$/, "");
}

function loadEnvFile(file_name) {
  const envPath = path.join(__dirname, file_name);

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

[".env.production", ".env"].forEach(loadEnvFile);
assertRequiredRuntimeFiles();
require("./server.js");
startInternalScheduler();
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

  for (const scriptName of runtimeScriptFileNames) {
    fs.copyFileSync(path.join(scriptsDir, scriptName), path.join(outputScriptsDir, scriptName));
  }
}

function copyPackageLockFile() {
  assertExists(packageLockPath, "package-lock.json");
  fs.copyFileSync(packageLockPath, path.join(outputDir, "package-lock.json"));
}

function stripBundledEnvFiles() {
  for (const entry of fs.readdirSync(outputDir, { withFileTypes: true })) {
    if (!entry.isFile() || !/^\.env(?:\..+)?$/i.test(entry.name)) {
      continue;
    }

    fs.rmSync(path.join(outputDir, entry.name), { force: true });
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
    mariadb: sourcePackage.dependencies.mariadb,
  };
  outputPackage.engines = sourcePackage.engines;
  outputPackage.packageManager = sourcePackage.packageManager;
  delete outputPackage.devDependencies;
  delete outputPackage.optionalDependencies;

  fs.writeFileSync(packagePath, `${JSON.stringify(outputPackage, null, 2)}\n`, "utf8");
}

function resolveLocalRuntimeDependency(fromFilePath, requestPath) {
  const absoluteBasePath = path.resolve(path.dirname(fromFilePath), requestPath);
  const candidatePaths = [
    absoluteBasePath,
    `${absoluteBasePath}.js`,
    `${absoluteBasePath}.cjs`,
    `${absoluteBasePath}.mjs`,
    `${absoluteBasePath}.json`,
    path.join(absoluteBasePath, "index.js"),
  ];

  for (const candidatePath of candidatePaths) {
    if (fs.existsSync(candidatePath)) {
      return candidatePath;
    }
  }

  return absoluteBasePath;
}

function collectLocalRuntimeDependencies(entryFilePaths) {
  const pendingPaths = [...entryFilePaths];
  const discoveredPaths = new Set();
  const localRequirePattern = /require\((["'])(\.[^"']+)\1\)/g;

  while (pendingPaths.length > 0) {
    const currentPath = pendingPaths.pop();

    if (discoveredPaths.has(currentPath)) {
      continue;
    }

    discoveredPaths.add(currentPath);

    if (!fs.existsSync(currentPath) || !fs.statSync(currentPath).isFile()) {
      continue;
    }

    const fileContents = fs.readFileSync(currentPath, "utf8");

    for (const match of fileContents.matchAll(localRequirePattern)) {
      const dependencyPath = resolveLocalRuntimeDependency(currentPath, match[2]);

      if (!discoveredPaths.has(dependencyPath)) {
        pendingPaths.push(dependencyPath);
      }
    }
  }

  return discoveredPaths;
}

function assertRuntimeArtifactIntegrity() {
  const requiredRelativePaths = [
    "app.js",
    "package-lock.json",
    "package.json",
    "prisma/defaults.js",
    "prisma/seed.js",
    "scripts/cpanel-db-deploy.js",
    "scripts/cpanel-db-seed.js",
    "scripts/cpanel-db-utils.js",
    "scripts/cpanel-doctor.js",
    "scripts/internal-scheduler.js",
    "scripts/prisma-runtime.js",
    "server.js",
    "node_modules/.prisma/client/default.js",
  ];
  const missingRequiredPaths = requiredRelativePaths.filter(
    (relativePath) => !fs.existsSync(path.join(outputDir, relativePath)),
  );

  if (missingRequiredPaths.length > 0) {
    throw new Error(
      `The cPanel package is missing required runtime files: ${missingRequiredPaths.join(", ")}.`,
    );
  }

  const runtimeEntryPoints = [
    ...runtimeScriptFileNames.map((scriptName) => path.join(outputDir, "scripts", scriptName)),
    path.join(outputDir, "prisma", "seed.js"),
  ];
  const discoveredRuntimeFiles = collectLocalRuntimeDependencies(runtimeEntryPoints);
  const missingDependencyPaths = [...discoveredRuntimeFiles]
    .filter((filePath) => !fs.existsSync(filePath))
    .map((filePath) => path.relative(outputDir, filePath).split(path.sep).join("/"))
    .sort((left, right) => left.localeCompare(right));

  if (missingDependencyPaths.length > 0) {
    throw new Error(
      [
        "The cPanel package is missing local runtime dependencies required by its deploy scripts.",
        `Missing: ${missingDependencyPaths.join(", ")}.`,
        "Rebuild the package before upload.",
      ].join(" "),
    );
  }
}

function assertNoForbiddenLocalEnvFiles() {
  const forbiddenFiles = [];

  function walk(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const absolutePath = path.join(directory, entry.name);

      if (entry.isDirectory()) {
        walk(absolutePath);
        continue;
      }

      if (/^\.env(?:\.[^.]+)?\.local$/i.test(entry.name)) {
        forbiddenFiles.push(path.relative(outputDir, absolutePath).split(path.sep).join("/"));
      }
    }
  }

  walk(outputDir);

  if (forbiddenFiles.length) {
    throw new Error(
      `Forbidden local env files were copied into the cPanel package: ${forbiddenFiles.join(", ")}.`,
    );
  }
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
    "- Add production env keys in the cPanel environment panel whenever possible. Existing process env wins over .env.production, and .env is only a final fallback.",
    "- This package intentionally strips any local .env files from the build output. Add production values in cPanel or create .env.production on the server after upload.",
    "- Required keys include DATABASE_URL, SESSION_SECRET, DESTINATION_TOKEN_ENCRYPTION_KEY, REVALIDATE_SECRET, and CRON_SECRET.",
    "- Also set NEXT_PUBLIC_APP_URL to your live domain, NEXT_IMAGE_REMOTE_HOSTS for trusted CDN/image hosts, and configure any provider, Meta, OpenAI, and storage credentials you use.",
    "- Optional single-instance fallback: set INTERNAL_SCHEDULER_ENABLED=true to let the app self-trigger scheduled publishing every INTERNAL_SCHEDULER_INTERVAL_SECONDS seconds. Do not enable that if you already run an external cron for the same endpoint.",
    "- Do not upload .env*.local files; they are intentionally ignored and package checks fail if they appear.",
    "",
    "Media storage:",
    "- Prefer MEDIA_DRIVER=s3 for production so uploaded media survives cPanel redeploys.",
    "- Use MEDIA_DRIVER=local only with a persistent directory that redeploys do not overwrite, and protect that public directory from listing or script execution.",
    "",
    "Database setup:",
    "- To diagnose login failures after upload, run: npm run cpanel:doctor",
    "- After the files are uploaded and cPanel has run NPM Install, run this once from the app root: npm run cpanel:db:deploy",
    "- cpanel:db:deploy applies the checked-in Prisma migrations only. It does not seed by default.",
    "- Run npm run cpanel:db:seed when you want to upsert the baseline admin user, locale, categories, providers, destinations, templates, and streams.",
    "- Set RUN_DB_SEED_ON_DEPLOY=1 only when you intentionally want deploy to seed immediately after migrations. SKIP_DB_SEED_ON_DEPLOY=1 always wins.",
    "- If cPanel only lets you run a JavaScript file, run scripts/cpanel-db-deploy.js.",
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
  copyPackageLockFile();
  stripBundledEnvFiles();

  if (fs.existsSync(publicDir)) {
    copyDirectory(publicDir, path.join(outputDir, "public"));
  }

  installLinuxSharpRuntime();
  writeRuntimeEntryPoint();
  writeRestartHelper();
  writeDeploymentNotes();
  assertNoForbiddenLocalEnvFiles();
  assertRuntimeArtifactIntegrity();

  console.log(`cPanel package created at ${outputDir}`);
}

main();
