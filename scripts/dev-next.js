#!/usr/bin/env node

const { execFileSync, spawn } = require("node:child_process");
const fs = require("node:fs");
const path = require("node:path");

const DEV_PORT = 3000;
const rootDir = process.cwd();
const nextBinPath = path.join(rootDir, "node_modules", "next", "dist", "bin", "next");
const nextStartServerPath = path.join(
  rootDir,
  "node_modules",
  "next",
  "dist",
  "server",
  "lib",
  "start-server.js",
);
const devLockPath = path.join(rootDir, ".next", "dev", "lock");

function normalizePathForMatch(value) {
  return `${value || ""}`.replace(/\\/g, "/").toLowerCase();
}

function runCommand(command, args) {
  return execFileSync(command, args, {
    cwd: rootDir,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
  }).trim();
}

function getListeningPidsForPort(port) {
  if (process.platform === "win32") {
    try {
      const output = runCommand("powershell.exe", [
        "-NoProfile",
        "-Command",
        [
          `$connections = @(Get-NetTCPConnection -State Listen -LocalPort ${port} -ErrorAction SilentlyContinue)`,
          'if ($connections) { $connections | Select-Object -ExpandProperty OwningProcess }',
        ].join("; "),
      ]);

      return [...new Set(
        output
          .split(/\r?\n/)
          .map((value) => Number.parseInt(value.trim(), 10))
          .filter(Number.isInteger),
      )];
    } catch {
      return [];
    }
  }

  try {
    const output = runCommand("lsof", ["-ti", `tcp:${port}`, "-sTCP:LISTEN"]);

    return [...new Set(
      output
        .split(/\r?\n/)
        .map((value) => Number.parseInt(value.trim(), 10))
        .filter(Number.isInteger),
    )];
  } catch {
    return [];
  }
}

function getProcessCommandLine(pid) {
  if (process.platform === "win32") {
    const output = runCommand("powershell.exe", [
      "-NoProfile",
      "-Command",
      [
        `$process = Get-CimInstance Win32_Process -Filter "ProcessId = ${pid}" -ErrorAction SilentlyContinue`,
        'if ($process) { $process.CommandLine }',
      ].join("; "),
    ]);

    return output;
  }

  try {
    return runCommand("ps", ["-p", `${pid}`, "-o", "command="]);
  } catch {
    return "";
  }
}

function isWorkspaceNextDevProcess(pid) {
  const commandLine = normalizePathForMatch(getProcessCommandLine(pid));

  if (!commandLine) {
    return false;
  }

  return (
    commandLine.includes(normalizePathForMatch(nextBinPath))
    || commandLine.includes(normalizePathForMatch(nextStartServerPath))
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

function waitForPortToClear(port, timeoutMs = 10000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (!getListeningPidsForPort(port).length) {
      return;
    }

    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 200);
  }

  throw new Error(`Port ${port} is still in use after waiting for the previous process to stop.`);
}

function clearStaleDevLock() {
  if (!fs.existsSync(devLockPath)) {
    return;
  }

  try {
    fs.rmSync(devLockPath, {
      force: true,
    });
  } catch (error) {
    throw new Error(
      `Unable to clear the stale Next.js dev lock at ${devLockPath}: ${error instanceof Error ? error.message : error}`,
    );
  }
}

function ensureWorkspaceOwnsDevPort(port) {
  const listeningPids = getListeningPidsForPort(port);

  if (!listeningPids.length) {
    clearStaleDevLock();
    return;
  }

  const blockingWorkspacePids = listeningPids.filter(isWorkspaceNextDevProcess);

  if (blockingWorkspacePids.length !== listeningPids.length) {
    const foreignPidList = listeningPids.filter((pid) => !blockingWorkspacePids.includes(pid)).join(", ");

    throw new Error(
      `Port ${port} is in use by another application (PID ${foreignPidList}). Stop that process before running NewsPub dev on port ${port}.`,
    );
  }

  for (const pid of blockingWorkspacePids) {
    console.log(`Stopping stale NewsPub Next dev server on port ${port} (PID ${pid})...`);
    stopProcess(pid);
  }

  waitForPortToClear(port);
  clearStaleDevLock();
}

function startNextDev() {
  const child = spawn(
    process.execPath,
    [nextBinPath, "dev", "--webpack", "--port", `${DEV_PORT}`],
    {
      cwd: rootDir,
      env: {
        ...process.env,
        PORT: `${DEV_PORT}`,
      },
      stdio: "inherit",
    },
  );

  const forwardSignal = (signal) => {
    if (!child.killed) {
      child.kill(signal);
    }
  };

  ["SIGINT", "SIGTERM", "SIGBREAK"].forEach((signal) => {
    process.on(signal, () => forwardSignal(signal));
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }

    process.exit(code || 0);
  });
}

function main() {
  ensureWorkspaceOwnsDevPort(DEV_PORT);
  startNextDev();
}

try {
  main();
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
}
