import { adaptSemanticQAResponse, type SemanticQADonePayload } from "./semanticAdapters";

export interface SSEChunk {
  type: "token" | "done" | "error";
  content?: string;
  error?: string;
}

export interface ParsedToken {
  type: "token" | "done" | "error";
  content: string;
  error?: string;
}

export type SemanticStreamEvent =
  | { type: "delta"; text: string }
  | { type: "done"; payload: SemanticQADonePayload }
  | { type: "error"; error: string }
  | { type: "unknown"; event: string; payload: unknown };

export function createSemanticSSEParser() {
  let buffer = "";

  return {
    push(chunk: string): SemanticStreamEvent[] {
      buffer += chunk.replace(/\r\n/g, "\n");
      const messages = buffer.split("\n\n");
      buffer = messages.pop() ?? "";
      return messages.flatMap(parseSemanticSSEMessage);
    },
    flush(): SemanticStreamEvent[] {
      if (!buffer.trim()) {
        buffer = "";
        return [];
      }
      const pending = buffer;
      buffer = "";
      return parseSemanticSSEMessage(pending);
    },
  };
}

export function parseSSEChunk(chunk: SSEChunk): ParsedToken {
  if (chunk.type === "done") {
    return { type: "done", content: "" };
  }

  if (chunk.type === "error") {
    return {
      type: "error",
      content: "",
      error: chunk.error || "AI 引擎返回错误",
    };
  }

  if (chunk.type === "token" && chunk.content) {
    return { type: "token", content: chunk.content };
  }

  const content =
    chunk.content ||
    (chunk as unknown as Record<string, string>).text ||
    (chunk as unknown as Record<string, string>).message ||
    "";

  if (content) {
    return { type: "token", content };
  }

  return { type: "token", content: "" };
}

export function createTokenBuffer(flushIntervalMs = 50) {
  let buffer = "";
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    feed(token: string, onFlush: (text: string) => void): void {
      if (token.length === 1 && isCJK(token)) {
        if (buffer) {
          onFlush(buffer);
          buffer = "";
        }
        onFlush(token);
        return;
      }

      buffer += token;

      if (/[\s，。！？；：、\n]/.test(token)) {
        if (timer) clearTimeout(timer);
        onFlush(buffer);
        buffer = "";
        return;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (buffer) {
          onFlush(buffer);
          buffer = "";
        }
      }, flushIntervalMs);
    },
    flush(onFlush: (text: string) => void): void {
      if (timer) clearTimeout(timer);
      if (buffer) {
        onFlush(buffer);
        buffer = "";
      }
    },
  };
}

function parseSemanticSSEMessage(message: string): SemanticStreamEvent[] {
  const lines = message.split("\n");
  let event = "message";
  const dataLines: string[] = [];

  for (const rawLine of lines) {
    const line = rawLine.trimEnd();
    if (!line || line.startsWith(":")) continue;
    if (line.startsWith("event:")) {
      event = stripSSEValue(line.slice("event:".length));
    } else if (line.startsWith("data:")) {
      dataLines.push(stripSSEValue(line.slice("data:".length)));
    }
  }

  if (dataLines.length === 0) return [];
  const payload = parsePayload(dataLines.join("\n"));

  if (event === "delta") {
    return [{ type: "delta", text: payloadText(payload) }];
  }

  if (event === "done") {
    return [{ type: "done", payload: adaptSemanticQAResponse(payload) }];
  }

  if (event === "error") {
    return [{ type: "error", error: errorText(payload) }];
  }

  return [{ type: "unknown", event, payload }];
}

function stripSSEValue(value: string): string {
  return value.startsWith(" ") ? value.slice(1) : value;
}

function parsePayload(raw: string): unknown {
  if (!raw.trim()) return {};
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

function payloadText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  const record = asRecord(payload);
  return stringValue(record.text) || stringValue(record.content) || stringValue(record.message);
}

function errorText(payload: unknown): string {
  if (typeof payload === "string") return payload;
  const record = asRecord(payload);
  return stringValue(record.error) || stringValue(record.message) || "AI stream error";
}

function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4e00 && code <= 0x9fff) ||
    (code >= 0x3400 && code <= 0x4dbf) ||
    (code >= 0xf900 && code <= 0xfaff) ||
    (code >= 0x3040 && code <= 0x309f) ||
    (code >= 0x30a0 && code <= 0x30ff) ||
    (code >= 0xac00 && code <= 0xd7af)
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value : "";
}
