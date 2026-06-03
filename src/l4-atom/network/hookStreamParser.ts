import { adaptHookEvent, type HookEventSummary } from "./hookAdapters";

export type HookStreamEvent =
  | { type: "snapshot"; events: HookEventSummary[] }
  | { type: "hook_event"; event: HookEventSummary }
  | { type: "keepalive" }
  | { type: "error"; error: string }
  | { type: "unknown"; event: string }
  | { type: "aborted" };

export function createHookSSEParser() {
  let buffer = "";

  return {
    push(chunk: string): HookStreamEvent[] {
      buffer += chunk.replace(/\r\n/g, "\n");
      const messages = buffer.split("\n\n");
      buffer = messages.pop() ?? "";
      return messages.flatMap(parseHookSSEMessage);
    },
    flush(): HookStreamEvent[] {
      if (!buffer.trim()) {
        buffer = "";
        return [];
      }
      const pending = buffer;
      buffer = "";
      return parseHookSSEMessage(pending);
    },
  };
}

function parseHookSSEMessage(message: string): HookStreamEvent[] {
  const lines = message.split("\n");
  let event = "message";
  let sawComment = false;
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line) continue;
    if (line.startsWith(":")) {
      sawComment = true;
      continue;
    }
    if (line.startsWith("event:")) {
      event = stripSSEValue(line.slice("event:".length));
    } else if (line.startsWith("data:")) {
      dataLines.push(stripSSEValue(line.slice("data:".length)));
    }
  }

  if (dataLines.length === 0) return sawComment ? [{ type: "keepalive" }] : [];

  const parsed = parsePayload(dataLines.join("\n"));
  if (parsed.error) return [{ type: "error", error: parsed.error }];
  const payload = parsed.payload;

  if (event === "snapshot") {
    const record = asRecord(payload);
    return [{ type: "snapshot", events: arrayValue(record.events).map(adaptHookEvent) }];
  }

  if (event === "hook_event") {
    return [{ type: "hook_event", event: adaptHookEvent(payload) }];
  }

  if (event === "error") {
    return [{ type: "error", error: errorText(payload) }];
  }

  return [{ type: "unknown", event }];
}

function stripSSEValue(value: string): string {
  return value.startsWith(" ") ? value.slice(1) : value;
}

function parsePayload(raw: string): { payload?: unknown; error?: string } {
  try {
    return { payload: JSON.parse(raw) };
  } catch {
    return { error: "Invalid hook stream payload" };
  }
}

function errorText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  const record = asRecord(payload);
  return stringValue(record.error) || stringValue(record.message) || "Hook stream error";
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
