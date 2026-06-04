import type {
  ContactProfileRequest,
  SemanticSearchRequest,
  TopicsRequest,
} from "@/l2-coordinator/api-docs/semantic";
import type { SemanticPreviewKind } from "@l4/network";

export type SemanticDiscoveryScope = "contact" | "selected" | "all";

export interface SemanticDiscoveryChatOption {
  chat: string;
  label?: string;
}

export interface SemanticSearchDraft {
  query: string;
  scope: SemanticDiscoveryScope;
  currentChat?: string;
  selectedChats?: SemanticDiscoveryChatOption[];
  window?: string;
  depth?: string;
  limit?: number;
  sourceLimit?: number;
  rerank?: boolean;
}

export interface SemanticSearchControlOverrides {
  window?: string;
  depth?: string;
  sourceLimit?: number;
  rerank?: boolean;
}

export interface SemanticAnalysisDraft {
  currentChat?: string;
  window?: string;
}

export interface SemanticPreviewDraft {
  kind?: SemanticPreviewKind;
  talker?: string;
  limit?: number;
  offset?: number;
}

export interface SemanticPreviewRequestOptions {
  kind?: SemanticPreviewKind;
  talker?: string;
  limit?: number;
  offset?: number;
}

export function buildSemanticSearchRequest(draft: SemanticSearchDraft): SemanticSearchRequest {
  const scope = draft.scope ?? "contact";
  const request: SemanticSearchRequest = omitUndefined({
    query: draft.query.trim(),
    scope,
    window: normalizedText(draft.window),
    depth: normalizedText(draft.depth),
    limit: finitePositiveInteger(draft.limit),
    sourceLimit: finitePositiveInteger(draft.sourceLimit),
    rerank: draft.rerank,
  });

  if (scope === "contact" && draft.currentChat) {
    request.chat = draft.currentChat;
  }

  if (scope === "selected") {
    const chats = uniqueChats(draft.selectedChats);
    if (chats.length > 0) request.chats = chats;
  }

  return request;
}

export function buildSemanticAnalysisRequest(
  draft: SemanticAnalysisDraft,
): (TopicsRequest & ContactProfileRequest) | null {
  if (!draft.currentChat) return null;
  return omitUndefined({
    chat: draft.currentChat,
    window: normalizedText(draft.window),
  });
}

export function buildSemanticPreviewRequest(draft: SemanticPreviewDraft): SemanticPreviewRequestOptions {
  return omitUndefined({
    kind: draft.kind,
    talker: normalizedText(draft.talker),
    limit: clampInteger(draft.limit, 1, 100),
    offset: Math.max(0, Math.round(draft.offset ?? 0)),
  });
}

function uniqueChats(options?: SemanticDiscoveryChatOption[]): string[] {
  return Array.from(new Set((options ?? []).map((option) => option.chat.trim()).filter(Boolean)));
}

function normalizedText(value?: string): string | undefined {
  const text = value?.trim() ?? "";
  return text ? text : undefined;
}

function finitePositiveInteger(value?: number): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) return undefined;
  return Math.round(value);
}

function clampInteger(value: number | undefined, min: number, max: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.round(value)));
}

function omitUndefined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined),
  ) as T;
}
