import type { QAMessage, QARequest, QARequestSnapshot } from "@/l2-coordinator/api-docs/semantic";

export interface SemanticQADraft {
  query: string;
  scope?: "contact" | "selected" | "all";
  chat?: string;
  chats?: string[];
  window?: string;
  entityOverride?: string;
  retrievalDepth?: string;
  sourceLimit?: number;
  topN?: number;
  includeHistory?: boolean;
}

export interface SemanticQARequestEnvelope {
  request: QARequest;
  snapshot: QARequestSnapshot;
}

export function buildSemanticQARequestEnvelope(
  draft: SemanticQADraft,
  options: {
    currentChat?: string;
    messages?: QAMessage[];
    now?: number;
  } = {},
): SemanticQARequestEnvelope {
  const query = draft.query.trim();
  const now = options.now ?? Date.now();
  const explicitChat = cleanString(draft.chat);
  const currentChat = cleanString(options.currentChat);
  const selectedChats = cleanStringArray(draft.chats);
  const scope = resolveScope(draft.scope, explicitChat || currentChat, selectedChats);
  const chat = scope === "contact" ? explicitChat || currentChat : undefined;
  const chats = scope === "selected" ? selectedChats : undefined;
  const retrievalDepth = normalizeRetrievalDepth(draft.retrievalDepth);
  const topN = normalizeTopN(draft.topN, retrievalDepth);
  const window = cleanString(draft.window) || "7d";
  const sourceLimit = normalizeSourceLimit(draft.sourceLimit);
  const entityOverride = cleanString(draft.entityOverride);
  const history = draft.includeHistory
    ? buildSemanticQAHistory(options.messages ?? [])
    : [];

  const request: QARequest = omitUndefined({
    query,
    chat,
    chats,
    scope,
    window,
    entityOverride,
    retrievalDepth,
    sourceLimit,
    topN,
    history: history.length > 0 ? history : undefined,
  });

  const snapshot: QARequestSnapshot = omitUndefined({
    query,
    chat,
    chats,
    scope,
    window,
    entityOverride,
    retrievalDepth,
    sourceLimit,
    topN,
    includeHistory: draft.includeHistory ? true : undefined,
    createdAt: now,
  });

  return { request, snapshot };
}

export function buildSemanticQAHistory(messages: QAMessage[]): NonNullable<QARequest["history"]> {
  return messages
    .filter((message) => !message.isStreaming && message.completionStatus !== "streaming")
    .filter((message) => {
      if (message.role === "user") {
        return !message.completionStatus || message.completionStatus === "completed";
      }
      return message.role === "assistant" && message.completionStatus === "completed";
    })
    .map((message) => ({
      role: message.role,
      content: message.content.trim().slice(0, 2000),
    }))
    .filter((message) => message.content)
    .slice(-6);
}

function resolveScope(
  scope: SemanticQADraft["scope"],
  contactChat: string | undefined,
  selectedChats: string[] | undefined,
): NonNullable<QARequest["scope"]> {
  if (scope === "selected" && selectedChats?.length) return "selected";
  if (scope === "all" || !contactChat) return "all";
  return "contact";
}

function normalizeRetrievalDepth(value: string | undefined): string {
  if (value === "deep" || value === "wide") return value;
  return "standard";
}

function normalizeTopN(value: number | undefined, depth: string): number {
  if (typeof value === "number" && Number.isFinite(value) && value > 0) {
    return Math.max(1, Math.min(100, Math.round(value)));
  }
  if (depth === "wide") return 30;
  if (depth === "deep") return 16;
  return 8;
}

function normalizeSourceLimit(value: number | undefined): number {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return 50;
  return Math.max(1, Math.min(500, Math.round(value)));
}

function cleanString(value: string | undefined): string | undefined {
  const cleaned = value?.trim();
  return cleaned || undefined;
}

function cleanStringArray(value: string[] | undefined): string[] | undefined {
  const seen = new Set<string>();
  const items = (value ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => {
      if (!entry || seen.has(entry)) return false;
      seen.add(entry);
      return true;
    });
  return items.length > 0 ? items : undefined;
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
