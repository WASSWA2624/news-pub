#!/usr/bin/env node

const { execFileSync } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const rootDir = process.cwd();
const nextDir = path.join(rootDir, ".next");
const standaloneDir = path.join(nextDir, "standalone");
const standalonePidPath = path.join(standaloneDir, ".news-pub-standalone.pid");
const workspacePathToken = normalizePathForMatch(rootDir);
const nextStandaloneToken = normalizePathForMatch(path.join(rootDir, ".next", "standalone"));
const startStandaloneToken = normalizePathForMatch(path.join(rootDir, "scripts", "start-standalone.js"));
const relativeNextStandaloneToken = ".next/standalone/server.js";
const relativeStartStandaloneToken = "scripts/start-standalone.js";
const defaultStandalonePort = Number.parseInt(process.env.PORT || "3000", 10);

function normalizePathForMatch(value) {
  return `${value || ""}`.replace(/\\/g, "/").toLowerCase();
}

function sleep(ms) {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

function runCommand(command, args) {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getNodeProcesses() {
  if (process.platform === "win32") {
    try {
      const output = runCommand("powershell.exe", [
        "-NoProfile",
        "-Command",
        "Get-CimInstance Win32_Process -Filter \"Name = 'node.exe'\" | Select-Object -Property ProcessId,CommandLine | ConvertTo-Json -Compress",
      ]);

      if (!output) {
        return [];
      }

      return [JSON.parse(output)].flat().filter(Boolean);
    } catch {
      return [];
    }
  }

  try {
    return runCommand("ps", ["-eo", "pid=,command="])
      .split(/\r?\n/)
      .map((line) => {
        const match = line.trim().match(/^(\d+)\s+(.+)$/);
        return match ? { ProcessId: Number.parseInt(match[1], 10), CommandLine: match[2] } : null;
      })
      .filter(Boolean);
  } catch {
    return [];
  }
}

function getListeningPidsForPort(port) {
  if (!Number.isInteger(port) || port <= 0) {
    return new Set();
  }

  if (process.platform === "win32") {
    try {
      const output = runCommand("powershell.exe", [
        "-NoProfile",
        "-Command",
        [
          `$connections = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue)`,
          "if ($connections) { $connections | Select-Object -ExpandProperty OwningProcess }",
        ].join("; "),
      ]);

      return new Set(
        output
          .split(/\r?\n/)
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter(Number.isInteger),
      );
    } catch {
      return new Set();
    }
  }

  try {
    const output = runCommand("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);

    return new Set(
      output
        .split(/\r?\n/)
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter(Number.isInteger),
    );
  } catch {
    return new Set();
  }
}

function readStandalonePid() {
  try {
    return Number.parseInt(fs.readFileSync(standalonePidPath, "utf8").trim(), 10);
  } catch {
    return null;
  }
}

function isWorkspaceStandaloneProcess(processInfo, listeningPids, standalonePid) {
  const pid = Number.parseInt(processInfo.ProcessId, 10);
  const commandLine = normalizePathForMatch(processInfo.CommandLine);

  if (!Number.isInteger(pid) || pid === process.pid || !commandLine) {
    return false;
  }

  if (pid === standalonePid) {
    return true;
  }

  if (commandLine.includes(workspacePathToken)) {
    return commandLine.includes(startStandaloneToken) || commandLine.includes(nextStandaloneToken);
  }

  return (
    listeningPids.has(pid) &&
    (commandLine.includes(relativeStartStandaloneToken) || commandLine.includes(relativeNextStandaloneToken))
  );
}

function stopProcess(pid) {
  if (process.platform === "win32") {
    execFileSync("taskkill", ["/PID", `${pid}`, "/T", "/F"], {
      cwd: rootDir,
      stdio: "pipe",
    });
    return;
  }

  process.kill(pid, "SIGTERM");
}

function stopStaleStandaloneProcesses() {
  const listeningPids = getListeningPidsForPort(defaultStandalonePort);
  const standalonePid = readStandalonePid();
  const staleProcesses = getNodeProcesses().filter((processInfo) =>
    isWorkspaceStandaloneProcess(processInfo, listeningPids, standalonePid),
  );

  for (const processInfo of staleProcesses) {
    const pid = Number.parseInt(processInfo.ProcessId, 10);

    console.log(`Stopping stale NewsPub standalone server before build (PID ${pid})...`);
    stopProcess(pid);
  }
}

function assertInsideDirectory(targetPath, directoryPath) {
  const relativePath = path.relative(path.resolve(directoryPath), path.resolve(targetPath));

  if (!relativePath || relativePath.startsWith("..") || path.isAbsolute(relativePath)) {
    throw new Error(`Refusing to modify a path outside ${directoryPath}: ${targetPath}`);
  }
}

function removeDirectoryWithRetry(targetPath, label) {
  if (!fs.existsSync(targetPath)) {
    return;
  }

  assertInsideDirectory(targetPath, rootDir);

  const attempts = 10;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    try {
      fs.rmSync(targetPath, {
        force: true,
        recursive: true,
      });
      return;
    } catch (error) {
      if (attempt === attempts || !["EBUSY", "EPERM", "ENOTEMPTY"].includes(error?.code)) {
        throw new Error(
          `Unable to remove ${label} at ${targetPath}: ${error instanceof Error ? error.message : error}`,
        );
      }

      sleep(250 * attempt);
    }
  }
}

function main() {
  stopStaleStandaloneProcesses();
  removeDirectoryWithRetry(standaloneDir, "stale Next standalone output");
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
