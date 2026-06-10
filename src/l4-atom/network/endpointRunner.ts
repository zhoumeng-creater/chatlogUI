import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { classifyReadOnlySql } from "./dbExplorerAdapters";
import { buildChatlogApiUrl } from "./chatlogEndpoint";

const MAX_PREVIEW_LENGTH = 1200;

export type EndpointParamKind = "text" | "number" | "select" | "boolean";
export type EndpointRunnerBlockReason =
  | "unknown-endpoint"
  | "unknown-parameter"
  | "missing-parameter"
  | "invalid-parameter"
  | "unsafe-sql"
  | "confirmation-required";

export interface EndpointCatalogParam {
  name: string;
  label: string;
  kind: EndpointParamKind;
  required?: boolean;
  defaultValue?: string | number | boolean;
  options?: Array<{ value: string; label: string }>;
  min?: number;
  max?: number;
}

export interface EndpointCatalogEntry {
  id: string;
  label: string;
  group: "core" | "chat" | "media" | "sns" | "db" | "mcp" | "system";
  method: "GET" | "POST";
  pathTemplate: string;
  endpointFamily: string;
  params: EndpointCatalogParam[];
  baseUrlPolicy: "local-sidecar";
  requiresConfirmation?: boolean;
  resultKind: "json" | "status";
}

export interface RunEndpointInput {
  entryId: string;
  params: Record<string, string | number | boolean | undefined>;
  confirmed?: boolean;
}

export interface EndpointRunResult {
  entryId: string;
  endpointFamily: string;
  method: EndpointCatalogEntry["method"];
  status: number;
  durationMs: number;
  parameterKeys: string[];
  preview: string;
  redacted: true;
}

export class EndpointRunnerBlockedError extends Error {
  readonly reason: EndpointRunnerBlockReason;

  constructor(reason: EndpointRunnerBlockReason, message: string) {
    super(message);
    this.name = "EndpointRunnerBlockedError";
    this.reason = reason;
  }
}

const CATALOG: EndpointCatalogEntry[] = [
  entry("health", "Health", "core", "GET", "/health", "health", []),
  entry("ping", "Ping", "core", "GET", "/api/v1/ping", "ping", []),
  entry("sessions", "Sessions", "chat", "GET", "/api/v1/sessions", "sessions", [
    numberParam("limit", "Limit", false, 1, 500),
  ]),
  entry("history", "History", "chat", "GET", "/api/v1/history", "history", [
    textParam("chat", "Chat", true),
    numberParam("limit", "Limit", false, 1, 500),
    numberParam("offset", "Offset", false, 0, 100000),
  ]),
  entry("search", "Search", "chat", "GET", "/api/v1/search", "search", [
    textParam("keyword", "Keyword", true),
    textParam("chat", "Chat"),
    numberParam("limit", "Limit", false, 1, 500),
    numberParam("offset", "Offset", false, 0, 100000),
  ]),
  entry("stats", "Stats", "chat", "GET", "/api/v1/stats", "stats", [
    textParam("chat", "Chat", true),
    textParam("since", "Since"),
    textParam("until", "Until"),
  ]),
  entry("contacts", "Contacts", "chat", "GET", "/api/v1/contacts", "contacts", []),
  entry("chatrooms", "Chatrooms", "chat", "GET", "/api/v1/chatrooms", "chatrooms", []),
  entry("favorites", "Favorites", "media", "GET", "/api/v1/favorites", "favorites", [
    textParam("chat", "Chat"),
    numberParam("limit", "Limit", false, 1, 500),
  ]),
  entry("members", "Members", "media", "GET", "/api/v1/members", "members", [
    textParam("chat", "Chat", true),
  ]),
  entry("unread", "Unread", "media", "GET", "/api/v1/unread", "unread", []),
  entry("new_messages", "New Messages", "media", "GET", "/api/v1/new_messages", "new_messages", [
    textParam("chat", "Chat"),
    textParam("since", "Since"),
    numberParam("limit", "Limit", false, 1, 500),
  ]),
  entry("sns_notifications", "SNS Notifications", "sns", "GET", "/api/v1/sns_notifications", "sns_notifications", [
    numberParam("limit", "Limit", false, 1, 500),
    textParam("since", "Since"),
    textParam("until", "Until"),
    booleanParam("include_read", "Include read"),
  ]),
  entry("sns_feed", "SNS Feed", "sns", "GET", "/api/v1/sns_feed", "sns_feed", [
    numberParam("limit", "Limit", false, 1, 500),
    textParam("user", "User"),
    textParam("since", "Since"),
    textParam("until", "Until"),
  ]),
  entry("sns_search", "SNS Search", "sns", "GET", "/api/v1/sns_search", "sns_search", [
    textParam("keyword", "Keyword", true),
    numberParam("limit", "Limit", false, 1, 500),
    textParam("user", "User"),
  ]),
  entry("db", "DB Files", "db", "GET", "/api/v1/db", "db", []),
  entry("db_search", "DB Search", "db", "GET", "/api/v1/db/search", "db_search", [
    textParam("keyword", "Keyword", true),
    selectParam("mode", "Mode", [
      { value: "quick", label: "Quick" },
      { value: "deep", label: "Deep" },
    ]),
    numberParam("limit", "Limit", false, 1, 500),
  ]),
  entry("db_tables", "DB Tables", "db", "GET", "/api/v1/db/tables", "db_tables", [
    textParam("group", "Group", true),
    textParam("file", "File", true),
  ]),
  entry("db_data", "DB Data", "db", "GET", "/api/v1/db/data", "db_data", [
    textParam("group", "Group", true),
    textParam("file", "File", true),
    textParam("table", "Table", true),
    textParam("keyword", "Keyword"),
    numberParam("limit", "Limit", false, 1, 500),
    numberParam("offset", "Offset", false, 0, 100000),
  ]),
  entry("db_query", "DB Query", "db", "GET", "/api/v1/db/query", "db_query", [
    textParam("group", "Group", true),
    textParam("file", "File", true),
    textParam("sql", "SQL", true),
  ]),
  entry("image", "Image", "media", "GET", "/image/{key}", "image", [
    textParam("key", "Media key", true),
  ]),
  entry("video", "Video", "media", "GET", "/video/{key}", "video", [
    textParam("key", "Media key", true),
  ]),
  entry("file", "File", "media", "GET", "/file/{key}", "file", [
    textParam("key", "Media key", true),
  ]),
  entry("voice", "Voice", "media", "GET", "/voice/{key}", "voice", [
    textParam("key", "Media key", true),
  ]),
  entry("data", "Data", "media", "GET", "/data/{path}", "data", [
    textParam("path", "Data path", true),
  ]),
  entry("mcp", "MCP", "mcp", "POST", "/mcp", "mcp", []),
  entry("mcp_sse", "MCP SSE", "mcp", "GET", "/sse", "mcp_sse", []),
  entry("mcp_message", "MCP Message", "mcp", "POST", "/message", "mcp_message", []),
  entry("cache_clear", "Clear Cache", "system", "POST", "/api/v1/cache/clear", "cache_clear", [], {
    requiresConfirmation: true,
    resultKind: "status",
  }),
];

export function getEndpointCatalog(): EndpointCatalogEntry[] {
  return CATALOG.map((entryItem) => ({
    ...entryItem,
    params: entryItem.params.map((param) => ({ ...param, options: param.options?.map((option) => ({ ...option })) })),
  }));
}

export function getEndpointCatalogEntry(id: string): EndpointCatalogEntry | undefined {
  return getEndpointCatalog().find((entryItem) => entryItem.id === id);
}

export async function runEndpointCatalogEntry(
  input: RunEndpointInput,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<EndpointRunResult> {
  const entryItem = CATALOG.find((item) => item.id === input.entryId);
  if (!entryItem) {
    throw new EndpointRunnerBlockedError("unknown-endpoint", "该 API 不在桌面调试器 allowlist 中。");
  }

  validateParams(entryItem, input.params);

  if (entryItem.requiresConfirmation && input.confirmed !== true) {
    throw new EndpointRunnerBlockedError("confirmation-required", "该操作需要确认后才能执行。");
  }

  if (entryItem.id === "db_query") {
    const classification = classifyReadOnlySql(String(input.params.sql ?? ""));
    if (!classification.allowed) {
      throw new EndpointRunnerBlockedError("unsafe-sql", classification.message);
    }
  }

  const url = buildEndpointUrl(entryItem, input.params, diagnosticOptions?.serviceBaseUrl);
  const started = performance.now();
  const raw = await requestJson<unknown>(url.toString(), {
    method: entryItem.method,
    timeoutMs: entryItem.id === "db_search" || entryItem.id === "db_query" ? 30000 : 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: entryItem.endpointFamily,
      method: entryItem.method,
    }),
  });

  return {
    entryId: entryItem.id,
    endpointFamily: entryItem.endpointFamily,
    method: entryItem.method,
    status: 200,
    durationMs: Math.max(0, Math.round(performance.now() - started)),
    parameterKeys: entryItem.params
      .map((param) => param.name)
      .filter((name) => input.params[name] !== undefined && String(input.params[name]).length > 0),
    preview: buildRedactedPreview(raw),
    redacted: true,
  };
}

function validateParams(entryItem: EndpointCatalogEntry, params: RunEndpointInput["params"]) {
  const allowedParamNames = new Set(entryItem.params.map((param) => param.name));
  for (const key of Object.keys(params)) {
    if (!allowedParamNames.has(key)) {
      throw new EndpointRunnerBlockedError("unknown-parameter", "该参数不在 API schema 中。");
    }
  }

  for (const param of entryItem.params) {
    if (param.required && isBlank(params[param.name])) {
      throw new EndpointRunnerBlockedError("missing-parameter", `缺少必填参数：${param.label}`);
    }

    const value = params[param.name];
    if (isBlank(value)) continue;

    if (param.kind === "select" && param.options?.some((option) => option.value === String(value)) === false) {
      throw new EndpointRunnerBlockedError("invalid-parameter", `参数 ${param.label} 不在允许选项中。`);
    }

    if (param.kind === "number") {
      const numericValue = Number(value);
      if (
        !Number.isFinite(numericValue) ||
        (param.min !== undefined && numericValue < param.min) ||
        (param.max !== undefined && numericValue > param.max)
      ) {
        throw new EndpointRunnerBlockedError("invalid-parameter", `参数 ${param.label} 超出允许范围。`);
      }
    }
  }
}

function buildEndpointUrl(
  entryItem: EndpointCatalogEntry,
  params: RunEndpointInput["params"],
  serviceBaseUrl?: string,
): URL {
  const pathParamNames = new Set<string>();
  let pathTemplate = entryItem.pathTemplate;
  for (const param of entryItem.params) {
    const token = `{${param.name}}`;
    if (!pathTemplate.includes(token)) continue;
    const value = params[param.name] ?? param.defaultValue;
    if (isBlank(value)) continue;
    pathTemplate = pathTemplate.split(token).join(encodeURIComponent(String(value)));
    pathParamNames.add(param.name);
  }

  const url = new URL(buildChatlogApiUrl(pathTemplate, serviceBaseUrl));
  if (url.pathname.startsWith("/api/v1/") || url.pathname === "/health") {
    url.searchParams.set("format", "json");
  }

  for (const param of entryItem.params) {
    if (pathParamNames.has(param.name)) continue;
    const value = params[param.name] ?? param.defaultValue;
    if (isBlank(value)) continue;
    url.searchParams.set(param.name, String(value));
  }

  return url;
}

function buildRedactedPreview(value: unknown): string {
  const preview = JSON.stringify(redactResponseValue(value), null, 2) ?? "";
  return preview.length > MAX_PREVIEW_LENGTH
    ? `${preview.slice(0, MAX_PREVIEW_LENGTH)}...`
    : preview;
}

function redactResponseValue(value: unknown): unknown {
  if (typeof value === "string") return value ? "[redacted]" : "";
  if (typeof value === "number" || typeof value === "boolean" || value === null) return value;
  if (Array.isArray(value)) return value.slice(0, 20).map(redactResponseValue);
  if (value && typeof value === "object") {
    return Object.entries(value).reduce<Record<string, unknown>>((result, [key, item]) => {
      result[key] = redactResponseValue(item);
      return result;
    }, {});
  }
  return null;
}

function entry(
  id: string,
  label: string,
  group: EndpointCatalogEntry["group"],
  method: EndpointCatalogEntry["method"],
  pathTemplate: string,
  endpointFamily: string,
  params: EndpointCatalogParam[],
  options: Partial<Pick<EndpointCatalogEntry, "requiresConfirmation" | "resultKind">> = {},
): EndpointCatalogEntry {
  return {
    id,
    label,
    group,
    method,
    pathTemplate,
    endpointFamily,
    params,
    baseUrlPolicy: "local-sidecar",
    resultKind: options.resultKind ?? "json",
    requiresConfirmation: options.requiresConfirmation,
  };
}

function textParam(name: string, label: string, required = false): EndpointCatalogParam {
  return { name, label, kind: "text", required };
}

function numberParam(
  name: string,
  label: string,
  required = false,
  min?: number,
  max?: number,
): EndpointCatalogParam {
  return { name, label, kind: "number", required, min, max };
}

function booleanParam(name: string, label: string, required = false): EndpointCatalogParam {
  return { name, label, kind: "boolean", required };
}

function selectParam(
  name: string,
  label: string,
  options: Array<{ value: string; label: string }>,
  required = false,
): EndpointCatalogParam {
  return { name, label, kind: "select", options, required };
}

function isBlank(value: unknown): boolean {
  return value === undefined || value === null || String(value).trim().length === 0;
}
