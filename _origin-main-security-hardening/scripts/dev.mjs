import { spawn } from "node:child_process";
import net from "node:net";

const useShell = process.platform === "win32";

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

const processes = [];

if (await isPortOpen(5000)) {
  console.log("Backend already running on 127.0.0.1:5000; starting web app only.");
} else {
  processes.push(spawn("npm", ["--prefix", "backend", "run", "dev"], {
    stdio: "inherit",
    shell: useShell,
  }));
}

processes.push(spawn("npx", ["next", "dev", "-H", "127.0.0.1"], {
  stdio: "inherit",
  shell: useShell,
}));

let isShuttingDown = false;

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

for (const child of processes) {
  child.on("exit", (code) => {
    if (!isShuttingDown && code !== 0) {
      shutdown(code ?? 1);
    }
  });
}

process.on("SIGINT", () => shutdown(0));
process.on("SIGTERM", () => shutdown(0));
