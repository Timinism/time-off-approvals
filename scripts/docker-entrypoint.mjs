import { spawn } from "node:child_process";
import { mkdirSync, chownSync } from "node:fs";
import path from "node:path";

const dataFile = process.env.TIMEOFF_DB_PATH || path.join("/app", "data", "timeoff.db");
const dataDir = path.dirname(dataFile);
mkdirSync(dataDir, { recursive: true });

if (typeof process.getuid === "function" && process.getuid() === 0) {
  try {
    chownSync(dataDir, 1001, 1001);
  } catch {
    // The volume can stay owned by root when the mount refuses a chown. The next step still drops privileges.
  }
  process.setgid(1001);
  process.setuid(1001);
}

const child = spawn(process.execPath, ["server.js"], { stdio: "inherit" });
child.on("exit", (code, signal) => {
  if (signal) process.kill(process.pid, signal);
  process.exit(code ?? 0);
});
