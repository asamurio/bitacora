import { spawn, exec } from "child_process";
import { createServer } from "net";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { readFileSync, writeFileSync, existsSync, unlinkSync } from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const LOCK_FILE = join(__dirname, ".bitacora.lock");

const FRONTEND_PORT = 5858;
const URL = `http://localhost:${FRONTEND_PORT}`;

function checkLock() {
  if (!existsSync(LOCK_FILE)) return null;
  try {
    const pid = parseInt(readFileSync(LOCK_FILE, "utf-8"), 10);
    if (pid && Number.isInteger(pid)) {
      try {
        process.kill(pid, 0);
        return pid;
      } catch (e) {
        return null;
      }
    }
  } catch (e) {
    return null;
  }
  return null;
}

function waitForPort(port, host = "localhost", timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();
    function tryConnect() {
      const socket = createServer();
      socket.listen(port, host);
      socket.on("listening", () => {
        socket.close(() => resolve());
      });
      socket.on("error", () => {
        if (Date.now() - start > timeout) {
          reject(new Error("Timeout esperando al servidor"));
          return;
        }
        setTimeout(tryConnect, 300);
      });
    }
    tryConnect();
  });
}

function isPortInUse(port, host = "localhost", timeout = 1000) {
  return new Promise((resolve) => {
    const socket = createServer();
    socket.once("error", () => resolve(true));
    socket.once("listening", () => {
      socket.close(() => resolve(false));
    });
    socket.listen(port, host);
  });
}

function openBrowser(url) {
  const platform = process.platform;
  let cmd;
  if (platform === "win32") {
    cmd = `start "" "${url}"`;
  } else if (platform === "darwin") {
    cmd = `open "${url}"`;
  } else {
    cmd = `xdg-open "${url}"`;
  }
  exec(cmd);
}

// Breve retraso para evitar que un doble clic lance dos instancias a la vez.
// Da tiempo a que la primera escriba el lockfile y la segunda lo detecte.
await new Promise((r) => setTimeout(r, 600));

// Si el puerto ya está en uso, es porque el servidor ya está corriendo:
// ya hay una instancia activa, así que solo salimos (no abrimos otra pestaña).
const portBusy = await isPortInUse(FRONTEND_PORT);
if (portBusy) {
  console.log("");
  console.log("  La bitácora ya está corriendo.");
  console.log("  Abriendo la pestaña existente...");
  console.log("");
  process.exit(0);
}

// Si ya hay una instancia corriendo (lockfile), solo salimos.
const existingPid = checkLock();
if (existingPid) {
  console.log("");
  console.log("  La bitácora ya está corriendo (PID " + existingPid + ").");
  console.log("  Abriendo la pestaña existente...");
  console.log("");
  process.exit(0);
}

console.log("");
console.log("  Bitacora Dailys");
console.log("  Iniciando servidor...");
console.log("");

writeFileSync(LOCK_FILE, String(process.pid));

// Limpiar lockfile al salir
function cleanup() {
  try {
    if (existsSync(LOCK_FILE)) unlinkSync(LOCK_FILE);
  } catch (e) {}
}

process.on("exit", cleanup);
process.on("SIGINT", () => {
  cleanup();
  server.kill();
  process.exit(0);
});
process.on("SIGTERM", () => {
  cleanup();
  server.kill();
  process.exit(0);
});

const server = spawn("npm", ["run", "dev"], {
  stdio: "inherit",
  shell: true,
  cwd: __dirname,
});

server.on("error", (err) => {
  console.error("Error al iniciar:", err.message);
  cleanup();
  process.exit(1);
});

server.on("exit", () => {
  cleanup();
});

try {
  await waitForPort(FRONTEND_PORT);
  console.log("");
  console.log(`  App corriendo en: ${URL}`);
  console.log("  Presioná Ctrl+C para detener");
  console.log("");
  openBrowser(URL);
} catch (err) {
  console.error("  Error:", err.message);
  server.kill();
  process.exit(1);
}
