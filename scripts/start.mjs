import { spawn } from "node:child_process";
import http from "node:http";
import net from "node:net";

const useShell = process.platform === "win32";
const processes = [];
let isShuttingDown = false;

function isPortOpen(port, host = "127.0.0.1") {
  return new Promise((resolve) => {
    const socket = net.createConnection({ port, host });
    socket.once("connect", () => {
      socket.destroy();
      resolve(true);
    });
    socket.once("error", () => resolve(false));
  });
}

function isBackendHealthy() {
  return new Promise((resolve) => {
    const request = http.get("http://127.0.0.1:5000/api/health", (response) => {
      response.resume();
      resolve(response.statusCode === 200);
    });

    request.setTimeout(1000, () => {
      request.destroy();
      resolve(false);
    });

    request.once("error", () => resolve(false));
  });
}

async function waitForBackend(timeoutMs = 30000) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < timeoutMs) {
    if (await isBackendHealthy()) {
      return true;
    }

    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  return false;
}

function shutdown(code = 0) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  for (const child of processes) {
    if (!child.killed) {
      child.kill("SIGTERM");
    }
  }

  setTimeout(() => process.exit(code), 200);
}

if (await isPortOpen(5000)) {
  console.log("Backend already running on 127.0.0.1:5000; waiting for health check.");
} else {
  processes.push(spawn("npm", ["--prefix", "backend", "run", "start"], {
    stdio: "inherit",
    shell: useShell,
  }));
}

console.log("Waiting for backend API on http://127.0.0.1:5000...");
if (!(await waitForBackend())) {
  console.error("Backend API did not become ready within 30 seconds.");
  shutdown(1);
}

console.log("Backend API is ready. Starting frontend...");
processes.push(spawn("npx", ["next", "start", "-H", "127.0.0.1"], {
  stdio: "inherit",
  shell: useShell,
}));

for (const child of processes) {
  child.on("exit", (code) => {
    if (!isShuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
