import http from "node:http";
import { spawn } from "node:child_process";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const rootDir = process.cwd();
const appUrl = "http://127.0.0.1:5173/";
const mockSidecarUrl = "http://127.0.0.1:5030/health?format=json";
const children = [];

const args = process.argv.slice(2);
if (args[0] === "--") args.shift();

function startServer(name, command, commandArgs, { allowExisting = false } = {}) {
  const child = spawn(command, commandArgs, {
    cwd: rootDir,
    stdio: ["ignore", "pipe", "pipe"],
    windowsHide: true,
  });
  child.stdout.on("data", (chunk) => process.stdout.write(`[${name}] ${chunk}`));
  child.stderr.on("data", (chunk) => process.stderr.write(`[${name}] ${chunk}`));
  children.push({ child, name, allowExisting });
  return child;
}

function waitForUrl(url, name, child, { allowExisting = false } = {}) {
  const deadline = Date.now() + 30_000;

  return new Promise((resolve, reject) => {
    const retry = () => {
      if (Date.now() > deadline) {
        reject(new Error(`Timed out waiting for ${name} at ${url}`));
        return;
      }
      setTimeout(check, 250);
    };

    const check = () => {
      if (!allowExisting && child.exitCode !== null) {
        reject(new Error(`${name} exited before ${url} became ready`));
        return;
      }

      const request = http.get(url, (response) => {
        response.resume();
        if ((response.statusCode ?? 500) < 500) resolve();
        else retry();
      });
      request.on("error", retry);
      request.setTimeout(2_000, () => {
        request.destroy();
        retry();
      });
    };

    check();
  });
}

function runPlaywright() {
  const cliPath = require.resolve("@playwright/test/cli");
  return new Promise((resolve) => {
    const child = spawn("node", [cliPath, "test", ...args], {
      cwd: rootDir,
      env: {
        ...process.env,
        CHATLOG_E2E_EXTERNAL_SERVERS: "1",
        PLAYWRIGHT_HTML_OPEN: process.env.PLAYWRIGHT_HTML_OPEN ?? "never",
      },
      stdio: "inherit",
      windowsHide: true,
    });
    child.on("error", (error) => {
      console.error(error);
      resolve(1);
    });
    child.on("exit", (code, signal) => resolve(code ?? (signal ? 1 : 0)));
  });
}

async function stopChildren() {
  await Promise.allSettled(
    children.reverse().map(({ child }) => {
      if (child.exitCode !== null || child.killed) return Promise.resolve();
      child.kill();
      return new Promise((resolve) => {
        const forceKill = setTimeout(() => {
          if (child.exitCode === null && !child.killed) child.kill("SIGKILL");
          resolve();
        }, 1_000);
        forceKill.unref?.();
        child.once("exit", () => {
          clearTimeout(forceKill);
          resolve();
        });
      });
    }),
  );
}

async function main() {
  const vite = startServer("Vite", "node", ["./node_modules/vite/bin/vite.js", "--host", "127.0.0.1"], {
    allowExisting: true,
  });
  const mock = startServer("MockChatlog", "node", ["e2e/mock-chatlog-server/server.mjs"]);

  await waitForUrl(appUrl, "Vite", vite, { allowExisting: true });
  await waitForUrl(mockSidecarUrl, "mock chatlog server", mock);

  process.exitCode = await runPlaywright();
}

for (const signal of ["SIGINT", "SIGTERM"]) {
  process.once(signal, () => {
    stopChildren().finally(() => process.exit(signal === "SIGINT" ? 130 : 143));
  });
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => stopChildren());
