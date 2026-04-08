import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
  test: {
    // Run files serially so the NewsPub suite stays stable on local Windows
    // machines and fresh checkouts without relying on extra CLI flags.
    fileParallelism: false,
    testTimeout: 15000,
  },
});
