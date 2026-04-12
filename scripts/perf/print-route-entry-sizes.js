const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const routes = [
  {
    entry: "[project]/src/app/[locale]/page",
    label: "home",
    manifest: ".next/server/app/[locale]/page_client-reference-manifest.js",
  },
  {
    entry: "[project]/src/app/[locale]/news/page",
    label: "news",
    manifest: ".next/server/app/[locale]/news/page_client-reference-manifest.js",
  },
  {
    entry: "[project]/src/app/[locale]/category/[slug]/page",
    label: "category",
    manifest: ".next/server/app/[locale]/category/[slug]/page_client-reference-manifest.js",
  },
  {
    entry: "[project]/src/app/[locale]/search/page",
    label: "search",
    manifest: ".next/server/app/[locale]/search/page_client-reference-manifest.js",
  },
  {
    entry: "[project]/src/app/[locale]/news/[slug]/page",
    label: "story",
    manifest: ".next/server/app/[locale]/news/[slug]/page_client-reference-manifest.js",
  },
];

function parseArguments(argv) {
  const parsed = {
    budgetPath: "",
    outputPath: "",
  };

  for (let index = 0; index < argv.length; index += 1) {
    const argument = argv[index];

    if (argument === "--budget") {
      parsed.budgetPath = argv[index + 1] || "";
      index += 1;
      continue;
    }

    if (argument === "--output") {
      parsed.outputPath = argv[index + 1] || "";
      index += 1;
    }
  }

  return parsed;
}

function loadManifest(filename) {
  if (!fs.existsSync(filename)) {
    throw new Error(`Missing client reference manifest: ${filename}`);
  }

  const source = fs.readFileSync(filename, "utf8");
  const context = { globalThis: {} };

  vm.runInNewContext(source, context);

  return context.globalThis.__RSC_MANIFEST || {};
}

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

function ensureOutputDirectory(filename) {
  if (!filename) {
    return;
  }

  fs.mkdirSync(path.dirname(path.resolve(filename)), {
    recursive: true,
  });
}

function loadBudgets(filename) {
  if (!filename) {
    return null;
  }

  const parsed = JSON.parse(fs.readFileSync(filename, "utf8"));

  return {
    defaults: parsed.defaults || {},
    routes: parsed.routes || {},
  };
}

function getRouteBudget(budgets, routeLabel) {
  if (!budgets) {
    return null;
  }

  return {
    ...budgets.defaults,
    ...(budgets.routes?.[routeLabel] || {}),
  };
}

function resolveEntryFiles(routeManifest, routeEntry) {
  const directEntryFiles = routeManifest.entryJSFiles?.[routeEntry];

  if (Array.isArray(directEntryFiles) && directEntryFiles.length) {
    return directEntryFiles;
  }

  return [
    ...new Set(
      Object.values(routeManifest.clientModules || {})
        .flatMap((moduleDefinition) => moduleDefinition?.chunks || [])
        .filter((chunk) => typeof chunk === "string" && chunk.endsWith(".js") && chunk.startsWith("static/")),
    ),
  ];
}

function collectRouteEntryStats(route) {
  const routeManifestMap = loadManifest(route.manifest);
  const routeManifest = Object.values(routeManifestMap)[0] || {};
  const entryFiles = resolveEntryFiles(routeManifest, route.entry);
  const assets = entryFiles
    .map((file) => {
      const normalizedFile = decodeURIComponent(file);
      const diskPath = path.join(".next", normalizedFile.replace(/^static\//, "static/"));

      return {
        bytes: fs.statSync(diskPath).size,
        file: normalizedFile,
      };
    })
    .sort((left, right) => right.bytes - left.bytes);
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);

  return {
    assetCount: assets.length,
    assets,
    label: route.label,
    largestAssetBytes: assets[0]?.bytes || 0,
    totalBytes,
  };
}

function assertRouteBudgets(results, budgets) {
  const failures = [];

  for (const result of results) {
    const budget = getRouteBudget(budgets, result.label);

    if (!budget) {
      continue;
    }

    if (Number.isFinite(budget.maxTotalKb) && result.totalBytes > budget.maxTotalKb * 1024) {
      failures.push(
        `${result.label} total JS ${formatKilobytes(result.totalBytes)} exceeds ${budget.maxTotalKb.toFixed(1)} kB`,
      );
    }

    if (Number.isFinite(budget.maxLargestAssetKb) && result.largestAssetBytes > budget.maxLargestAssetKb * 1024) {
      failures.push(
        `${result.label} largest JS asset ${formatKilobytes(result.largestAssetBytes)} exceeds ${budget.maxLargestAssetKb.toFixed(1)} kB`,
      );
    }

    if (Number.isFinite(budget.maxAssetCount) && result.assetCount > budget.maxAssetCount) {
      failures.push(`${result.label} asset count ${result.assetCount} exceeds ${budget.maxAssetCount}`);
    }
  }

  return failures;
}

const options = parseArguments(process.argv.slice(2));
const budgets = loadBudgets(options.budgetPath);
const results = routes.map(collectRouteEntryStats);
const output = {
  generatedAt: new Date().toISOString(),
  routes: results,
  summary: {
    largestRoute: results.reduce((largest, current) => (current.totalBytes > largest.totalBytes ? current : largest), results[0]),
    routeCount: results.length,
    totalBytes: results.reduce((sum, route) => sum + route.totalBytes, 0),
  },
};

for (const route of results) {
  console.log(`${route.label}: ${formatKilobytes(route.totalBytes)}`);
  for (const asset of route.assets) {
    console.log(`  ${formatKilobytes(asset.bytes)}  ${asset.file}`);
  }
}

if (options.outputPath) {
  ensureOutputDirectory(options.outputPath);
  fs.writeFileSync(options.outputPath, JSON.stringify(output, null, 2));
}

const failures = assertRouteBudgets(results, budgets);

if (failures.length) {
  console.error("\nRoute entry-size budget failures:");
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exitCode = 1;
}
