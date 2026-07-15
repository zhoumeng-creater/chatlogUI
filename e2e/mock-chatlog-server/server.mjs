import http from "node:http";
import { fileURLToPath, pathToFileURL } from "node:url";
import { findMediaRoute, findRoute, loadMockRouteMap } from "./fixture-loader.mjs";

const HOST = "127.0.0.1";
const FETCH_FORBIDDEN_PORTS = new Set([
  1, 7, 9, 11, 13, 15, 17, 19, 20, 21, 22, 23, 25, 37, 42, 43, 53, 69, 77,
  79, 87, 95, 101, 102, 103, 104, 109, 110, 111, 113, 115, 117, 119, 123, 135,
  137, 139, 143, 161, 179, 389, 427, 465, 512, 513, 514, 515, 526, 530, 531,
  532, 540, 548, 554, 556, 563, 587, 601, 636, 989, 990, 993, 995, 1719, 1720,
  1723, 2049, 3659, 4045, 4190, 5060, 5061, 6000, 6566, 6665, 6666, 6667, 6668,
  6669, 6697, 10080,
]);

export async function startMockChatlogServer({
  rootDir = process.cwd(),
  port = 5030,
} = {}) {
  const routeMap = await loadMockRouteMap(rootDir);
  const maxAttempts = port === 0 ? 8 : 1;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const server = http.createServer((request, response) => {
      handleRequest(routeMap, request, response).catch((error) => {
        writeJson(response, 500, {
          error: "synthetic mock server error",
          message: error instanceof Error ? error.message : String(error),
        });
      });
    });
    const sockets = new Set();
    server.on("connection", (socket) => {
      sockets.add(socket);
      socket.once("close", () => sockets.delete(socket));
    });

    await listen(server, port);
    const address = server.address();
    const resolvedPort = typeof address === "object" && address ? address.port : port;

    if (port === 0 && FETCH_FORBIDDEN_PORTS.has(resolvedPort)) {
      await close(server);
      continue;
    }

    return {
      baseUrl: `http://${HOST}:${resolvedPort}`,
      close: () => close(server, sockets),
    };
  }

  throw new Error("Could not allocate a fetch-safe mock chatlog server port");
}

function listen(server, port) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, HOST, () => {
      server.off("error", reject);
      resolve();
    });
  });
}

function close(server, sockets = new Set()) {
  return new Promise((resolve, reject) => {
    const forceClose = setTimeout(() => {
      if (typeof server.closeAllConnections === "function") {
        server.closeAllConnections();
        return;
      }
      for (const socket of sockets) {
        socket.destroy();
      }
    }, 500);
    forceClose.unref?.();

    server.close((error) => {
      clearTimeout(forceClose);
      if (error) reject(error);
      else resolve();
    });

    if (typeof server.closeIdleConnections === "function") {
      server.closeIdleConnections();
    }
    for (const socket of sockets) {
      socket.end();
    }
  });
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
    const sseValue = route.id === "semantic-qa-stream.ready"
      ? await semanticQAValueForRequest(routeMap, route, request)
      : route.value;
    writeSse(response, sseValue);
    return;
  }

  const value = route.id === "search-v2.query"
    ? await searchV2ValueForRequest(route, request)
    : route.id === "history-context.query"
      ? await historyContextValueForRequest(routeMap, route, request)
      : route.value;
  writeJson(response, 200, value);
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

async function semanticQAValueForRequest(routeMap, route, request) {
  const body = await readJsonBody(request);
  const query = typeof body.query === "string" ? body.query.toLowerCase() : "";
  const state = query.includes("cancel")
    ? "cancelled"
    : query.includes("failure")
      ? "failure"
      : query.includes("empty")
        ? "empty"
        : "completed";
  return routeMap.routes.find((item) => item.id === `semantic-qa.${state}`)?.value ?? route.value;
}

async function searchV2ValueForRequest(route, request) {
  const body = await readJsonBody(request);
  const fixture = route.value ?? {};
  const normalizedKeyword = typeof body.keyword === "string"
    ? body.keyword.normalize("NFKC").trim().toLocaleLowerCase()
    : "";
  const emptyKeywords = Array.isArray(fixture.empty_keywords) ? fixture.empty_keywords : [];
  const forceEmpty = emptyKeywords.some((keyword) =>
    normalizedKeyword.includes(String(keyword).toLocaleLowerCase()),
  );
  const categories = stringSet(body.categories);
  const conversations = stringSet(body.chats);
  const senders = stringSet(body.sender_ids);
  const since = Number.isSafeInteger(body.since) ? body.since : null;
  const until = Number.isSafeInteger(body.until) ? body.until : null;
  const allHits = forceEmpty
    ? []
    : (Array.isArray(fixture.hits) ? fixture.hits : []).filter((hit) =>
        (!categories || categories.has(hit.category)) &&
        (!conversations || conversations.has(hit.conversation_id)) &&
        (!senders || senders.has(hit.sender_id)) &&
        (since === null || hit.timestamp >= since) &&
        (until === null || hit.timestamp <= until),
      );
  const indexedHits = allHits.map((hit, sourceIndex) => ({
    ...hit,
    source_index: sourceIndex,
  }));
  const configuredFirstPageCount = positiveSafeInteger(fixture.first_page_count) ?? 4;
  const requestedLimit = positiveSafeInteger(body.limit) ?? 50;
  const pageSize = Math.min(configuredFirstPageCount, requestedLimit);
  const start = body.cursor === fixture.forward_cursor ? pageSize : 0;
  const end = Math.min(indexedHits.length, start + pageSize);
  const messages = indexedHits.slice(start, end);
  const hasPrevious = start > 0;
  const hasNext = end < indexedHits.length;

  return {
    snapshot_id: fixture.snapshot_id,
    data_revision: fixture.data_revision,
    exact_total: true,
    complete_scope: true,
    total_count: indexedHits.length,
    count: messages.length,
    window_start: start,
    previous_cursor: hasPrevious ? fixture.backward_cursor : "",
    next_cursor: hasNext ? fixture.forward_cursor : "",
    has_previous: hasPrevious,
    has_next: hasNext,
    messages,
  };
}

async function historyContextValueForRequest(routeMap, route, request) {
  const body = await readJsonBody(request);
  const fixture = route.value ?? {};
  const searchFixture = routeMap.routes.find((item) => item.id === "search-v2.query")?.value ?? {};
  const hits = Array.isArray(searchFixture.hits) ? searchFixture.hits : [];
  const conversationId = typeof body.conversation_id === "string" && body.conversation_id
    ? body.conversation_id
    : "session_synthetic_001";
  const anchorSeq = positiveSafeInteger(body.seq) ?? 1101;
  const anchorHit = hits.find((hit) =>
    hit.conversation_id === conversationId && hit.seq === anchorSeq,
  );
  const conversationName = anchorHit?.conversation_name ??
    (conversationId.endsWith("@chatroom") ? "Synthetic Chatroom" : "Synthetic Session Alpha");
  const anchorTimestamp = Number.isSafeInteger(anchorHit?.timestamp)
    ? anchorHit.timestamp
    : 1767254400;
  const anchorSenderId = typeof anchorHit?.sender_id === "string"
    ? anchorHit.sender_id
    : "contact_synthetic_001";
  const anchorSenderName = typeof anchorHit?.sender_name === "string"
    ? anchorHit.sender_name
    : "Synthetic Contact Alpha";
  const anchorIsSelf = anchorSenderId === "chatlog:sender:self:v1";
  const limit = positiveSafeInteger(body.limit) ??
    positiveSafeInteger(fixture.default_limit) ??
    51;
  const dataRevision = typeof body.data_revision === "string" && body.data_revision
    ? body.data_revision
    : fixture.data_revision;

  const messages = [
    {
      seq: anchorSeq - 1,
      timestamp: Math.max(0, anchorTimestamp - 60),
      conversation_id: conversationId,
      conversation_name: conversationName,
      sender_id: "contact_synthetic_001",
      sender_name: "Synthetic Contact Alpha",
      is_self: false,
      type: 1,
      sub_type: 0,
      content: "Synthetic context message before the selected search hit",
    },
    {
      seq: anchorSeq,
      timestamp: anchorTimestamp,
      conversation_id: conversationId,
      conversation_name: conversationName,
      sender_id: anchorSenderId,
      sender_name: anchorSenderName,
      is_self: anchorIsSelf,
      type: Number.isSafeInteger(anchorHit?.type) ? anchorHit.type : 1,
      sub_type: Number.isSafeInteger(anchorHit?.sub_type) ? anchorHit.sub_type : 0,
      content: typeof anchorHit?.snippet === "string"
        ? anchorHit.snippet
        : "Synthetic selected search hit",
    },
    {
      seq: anchorSeq + 1,
      timestamp: anchorTimestamp + 60,
      conversation_id: conversationId,
      conversation_name: conversationName,
      sender_id: "chatlog:sender:self:v1",
      sender_name: "Synthetic Self",
      is_self: true,
      type: 1,
      sub_type: 0,
      content: "Synthetic context message after the selected search hit",
    },
  ];

  return {
    contract_version: fixture.contract_version,
    data_revision: dataRevision,
    exact: true,
    complete: true,
    conversation_id: conversationId,
    anchor_seq: anchorSeq,
    anchor_index: 1,
    limit,
    count: messages.length,
    has_before: true,
    has_after: true,
    messages,
  };
}

function stringSet(value) {
  return Array.isArray(value) && value.length > 0
    ? new Set(value.filter((item) => typeof item === "string"))
    : null;
}

function positiveSafeInteger(value) {
  return Number.isSafeInteger(value) && value > 0 ? value : null;
}

async function readJsonBody(request) {
  const chunks = [];
  for await (const chunk of request) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  const text = Buffer.concat(chunks).toString("utf8").trim();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return {};
  }
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
  if (value?.abandoned) return;
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

  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    const exitNow = setTimeout(() => process.exit(0), 1_000);
    exitNow.unref?.();
    server.close().finally(() => {
      clearTimeout(exitNow);
      process.exit(0);
    });
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
