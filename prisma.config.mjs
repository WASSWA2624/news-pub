import { config as loadEnv } from "dotenv";
import { defineConfig, env } from "prisma/config";

const localEnvPath =
  process.env.NODE_ENV === "production" ? ".env.production.local" : ".env.development.local";

loadEnv({ path: localEnvPath, override: true });
loadEnv();

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    seed: "node prisma/seed.js",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
