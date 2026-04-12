const fs = require("fs");
const path = require("path");
const vm = require("vm");

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

function loadManifest(filename) {
  const source = fs.readFileSync(filename, "utf8");
  const context = { globalThis: {} };

  vm.runInNewContext(source, context);

  return context.globalThis.__RSC_MANIFEST || {};
}

function formatKilobytes(bytes) {
  return `${(bytes / 1024).toFixed(1)} kB`;
}

for (const route of routes) {
  const routeManifestMap = loadManifest(route.manifest);
  const routeManifest = Object.values(routeManifestMap)[0] || {};
  const entryFiles = routeManifest.entryJSFiles?.[route.entry] || [];
  const assets = entryFiles.map((file) => {
    const diskPath = path.join(".next", file.replace(/^static\//, "static/"));

    return {
      bytes: fs.statSync(diskPath).size,
      file,
    };
  });
  const totalBytes = assets.reduce((sum, asset) => sum + asset.bytes, 0);

  console.log(`${route.label}: ${formatKilobytes(totalBytes)}`);
  for (const asset of assets) {
    console.log(`  ${formatKilobytes(asset.bytes)}  ${asset.file}`);
  }
}
