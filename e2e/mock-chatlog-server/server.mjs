import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findMediaRoute, findRoute, loadMockRouteMap } from "./fixture-loader.mjs";

const HOST = "127.0.0.1";

export async function startMockChatlogServer({
  rootDir = process.cwd(),
  port = 5030,
} = {}) {
  const routeMap = await loadMockRouteMap(rootDir);
  const server = http.createServer((request, response) => {
    handleRequest(routeMap, request, response).catch((error) => {
      writeJson(response, 500, {
        error: "synthetic mock server error",
        message: error instanceof Error ? error.message : String(error),
      });
    });
  });

  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });

  const address = server.address();
  const resolvedPort = typeof address === "object" && address ? address.port : port;

  return {
    baseUrl: `http://${HOST}:${resolvedPort}`,
    close: () =>
      new Promise((resolve, reject) => {
        server.close((error) => (error ? reject(error) : resolve()));
      }),
  };
}

async function handleRequest(routeMap, request, response) {
  setCorsHeaders(response);

  if (request.method === "OPTIONS") {
    response.writeHead(204);
    response.end();
    return;
  }

  const url = new URL(request.url ?? "/", `http://${HOST}`);
  const method = request.method ?? "GET";
  const mediaRoute = findMediaRoute(routeMap, method, url.pathname);
  if (mediaRoute) {
    writeMediaPlaceholder(response, mediaRoute, url.pathname);
    return;
  }

  const route = findRoute(routeMap, method, url.pathname);
  if (!route) {
    writeJson(response, 404, { error: "synthetic route not found", path: url.pathname });
    return;
  }

  if (route.responseType === "sse") {
    writeSse(response, route.value);
    return;
  }

  writeJson(response, 200, route.value);
}

function setCorsHeaders(response) {
  response.setHeader("Access-Control-Allow-Origin", "*");
  response.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  response.setHeader("Access-Control-Allow-Headers", "Content-Type,Accept");
}

function writeJson(response, status, value) {
  response.writeHead(status, {
    "Content-Type": "application/json; charset=utf-8",
  });
  response.end(`${JSON.stringify(value)}\n`);
}

function writeSse(response, value) {
  response.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache",
    Connection: "close",
  });

  const events = Array.isArray(value?.events) ? value.events : [];
  for (const event of events) {
    response.write(`event: ${event.event ?? "message"}\n`);
    response.write(`data: ${JSON.stringify(event.data ?? {})}\n\n`);
  }
  response.end();
}

function writeMediaPlaceholder(response, route, pathname) {
  if (route.responseType === "image-placeholder") {
    response.writeHead(200, {
      "Content-Type": "image/svg+xml; charset=utf-8",
    });
    response.end(svgPlaceholder(pathname));
    return;
  }

  response.writeHead(200, {
    "Content-Type": "text/plain; charset=utf-8",
  });
  response.end(`Synthetic media placeholder: ${pathname}\n`);
}

function svgPlaceholder(pathname) {
  const label = escapeXml(pathname.split("/").filter(Boolean).slice(0, 2).join(" / ") || "media");
  return `<svg xmlns="http://www.w3.org/2000/svg" width="320" height="180" role="img" aria-label="Synthetic media placeholder">
  <rect width="320" height="180" fill="#eef2f7"/>
  <rect x="20" y="20" width="280" height="140" rx="8" fill="#ffffff" stroke="#94a3b8"/>
  <text x="160" y="86" text-anchor="middle" font-family="Arial, sans-serif" font-size="16" fill="#334155">Synthetic media placeholder</text>
  <text x="160" y="112" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" fill="#64748b">${label}</text>
</svg>`;
}

function escapeXml(value) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function main() {
  const port = Number(process.env.MOCK_CHATLOG_PORT ?? "5030");
  const server = await startMockChatlogServer({ port, rootDir: process.cwd() });
  console.log(`Mock chatlog server listening on ${server.baseUrl}`);

  const stop = async () => {
    await server.close();
    process.exit(0);
  };
  process.once("SIGINT", stop);
  process.once("SIGTERM", stop);
}

const currentFile = fileURLToPath(import.meta.url);
const invokedFile = process.argv[1] ? fileURLToPath(pathToFileURL(process.argv[1])) : "";
if (currentFile === invokedFile) {
  main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
}
