type RawRecord = Record<string, unknown>;

export interface McpRouteStatus {
  path: "/mcp" | "/sse" | "/message";
  method: "GET" | "POST" | "ANY";
  status: "available" | "unknown";
}

export interface McpInventoryItem {
  name: string;
  description: string;
  argumentKeys: string[];
}

export interface McpInventory {
  routes: McpRouteStatus[];
  tools: McpInventoryItem[];
  prompts: McpInventoryItem[];
}

const SAFE_ARGUMENT_KEYS = new Set([
  "chat",
  "chats",
  "date",
  "filter",
  "include_read",
  "keyword",
  "level",
  "limit",
  "msg_type",
  "offset",
  "query",
  "since",
  "state",
  "time",
  "until",
  "user",
]);

export function getStaticMcpInventory(): McpInventory {
  return {
    routes: [
      { path: "/mcp", method: "POST", status: "available" },
      { path: "/sse", method: "GET", status: "available" },
      { path: "/message", method: "POST", status: "available" },
    ],
    tools: [
      tool("current_time", "Current local time helper", []),
      tool("wx_ping", "wx-cli compatible ping", []),
      tool("wx_contacts", "wx-cli compatible contacts", ["query", "limit", "offset"]),
      tool("wx_chatrooms", "wx-cli compatible chatrooms", ["query", "limit", "offset"]),
      tool("wx_sessions", "wx-cli compatible sessions", ["limit"]),
      tool("wx_history", "wx-cli compatible history lookup", ["chat", "limit", "offset", "time", "since", "until", "msg_type"]),
      tool("wx_search", "wx-cli compatible search", ["keyword", "chats", "limit", "time", "since", "until", "msg_type"]),
      tool("wx_unread", "wx-cli compatible unread summary", ["limit", "filter"]),
      tool("wx_members", "wx-cli compatible member list", ["chat"]),
      tool("wx_new_messages", "wx-cli compatible incremental messages", ["limit", "state"]),
      tool("wx_stats", "wx-cli compatible stats", ["chat", "time", "since", "until"]),
      tool("wx_favorites", "wx-cli compatible favorites", ["limit", "query"]),
      tool("wx_sns_notifications", "SNS notifications", ["limit", "since", "until", "include_read"]),
      tool("wx_sns_feed", "SNS feed", ["limit", "since", "until", "user"]),
      tool("wx_sns_search", "SNS search", ["keyword", "limit", "since", "until", "user"]),
    ],
    prompts: [
      tool("chat_summary_daily", "Daily summary template", ["date"]),
      tool("conflict_detector", "Conversation risk analysis template", []),
      tool("relationship_milestones", "Relationship milestone review template", []),
    ],
  };
}

export function adaptMcpInventory(raw: unknown): McpInventory {
  const data = asRecord(raw);
  return {
    routes: arrayValue(data.routes).map(adaptRoute).filter((route): route is McpRouteStatus => route !== null),
    tools: arrayValue(data.tools).map(adaptInventoryItem),
    prompts: arrayValue(data.prompts).map(adaptInventoryItem),
  };
}

function adaptRoute(raw: unknown): McpRouteStatus | null {
  const data = asRecord(raw);
  const path = stringValue(data.path);
  if (path !== "/mcp" && path !== "/sse" && path !== "/message") return null;
  const rawMethod = stringValue(data.method).toUpperCase();
  const method = rawMethod === "GET" || rawMethod === "POST" || rawMethod === "ANY" ? rawMethod : "ANY";
  return {
    path,
    method,
    status: stringValue(data.status) === "available" ? "available" : "unknown",
  };
}

function adaptInventoryItem(raw: unknown): McpInventoryItem {
  const data = asRecord(raw);
  return tool(
    stringValue(data.name),
    stringValue(data.description),
    arrayValue(data.argument_keys).map(stringValue),
  );
}

function tool(name: string, description: string, argumentKeys: string[]): McpInventoryItem {
  return {
    name,
    description,
    argumentKeys: argumentKeys.filter((key) => SAFE_ARGUMENT_KEYS.has(key)),
  };
}

function asRecord(value: unknown): RawRecord {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as RawRecord)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
