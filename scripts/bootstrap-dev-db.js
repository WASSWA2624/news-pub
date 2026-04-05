const { spawnSync } = require("node:child_process");

const { config: loadEnv } = require("dotenv");

const { PrismaMariaDb } = require("@prisma/adapter-mariadb");

loadEnv({ path: ".env.local", override: true });
loadEnv();

const NPX_COMMAND = process.platform === "win32" ? (process.env.ComSpec || "cmd.exe") : "npx";

function formatOutput(result) {
  return `${result.stdout || ""}${result.stderr || ""}`.trim();
}

function runPrismaCommand(args, { allowFailure = false, printOutput = true } = {}) {
  const result = spawnSync(
    NPX_COMMAND,
    process.platform === "win32"
      ? ["/d", "/s", "/c", `npx prisma ${args.join(" ")}`]
      : ["prisma", ...args],
    {
      cwd: process.cwd(),
      encoding: "utf8",
      stdio: "pipe",
    },
  );

  if (result.error) {
    throw result.error;
  }

  const output = formatOutput(result);

  if (printOutput && output) {
    console.log(output);
  }

  if (result.status !== 0 && !allowFailure) {
    process.exit(result.status || 1);
  }

  return {
    output,
    status: result.status || 0,
  };
}

function createAdapterFromDatabaseUrl(databaseUrl) {
  const parsedUrl = new URL(databaseUrl);
  const database = parsedUrl.pathname.replace(/^\//, "");

  if (!database) {
    throw new Error("DATABASE_URL must include a database name.");
  }

  return new PrismaMariaDb({
    connectionLimit: Number.parseInt(parsedUrl.searchParams.get("connection_limit") || "5", 10),
    database,
    host: parsedUrl.hostname,
    password: decodeURIComponent(parsedUrl.password),
    port: parsedUrl.port ? Number.parseInt(parsedUrl.port, 10) : 3306,
    user: decodeURIComponent(parsedUrl.username),
  });
}

async function shouldSeedBaselineData() {
  const { PrismaClient } = require("@prisma/client");

  const prisma = new PrismaClient({
    adapter: createAdapterFromDatabaseUrl(`${process.env.DATABASE_URL || ""}`),
  });

  try {
    const [localeCount, providerCount, destinationCount] = await Promise.all([
      prisma.locale.count(),
      prisma.newsProviderConfig.count(),
      prisma.destination.count(),
    ]);

    return localeCount === 0 || providerCount === 0 || destinationCount === 0;
  } finally {
    await prisma.$disconnect();
  }
}

async function main() {
  console.log("Generating Prisma client...");
  runPrismaCommand(["generate"]);

  console.log("Applying Prisma migrations...");
  runPrismaCommand(["migrate", "deploy"]);

  if (await shouldSeedBaselineData()) {
    console.log("Seeding NewsPub baseline data...");
    runPrismaCommand(["db", "seed"]);
  } else {
    console.log("Baseline data already present. Skipping seed.");
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
