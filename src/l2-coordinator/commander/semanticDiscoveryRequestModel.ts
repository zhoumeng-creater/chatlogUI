import type {
  SemanticDiscoveryWindow,
  SemanticSearchDepth,
  SemanticSearchRequest,
  SemanticSearchScope,
} from "@/l2-coordinator/api-docs/semantic";
import type { Conversation } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { SemanticPreviewKind } from "@l4/network";

export interface SemanticDiscoveryOption {
  value: string;
  label: string;
}

export const SEMANTIC_DISCOVERY_WINDOWS: SemanticDiscoveryOption[] = [
  { value: "7d", label: "近 7 天" },
  { value: "30d", label: "近 30 天" },
  { value: "90d", label: "近 90 天" },
  { value: "all", label: "全部时间" },
];

export const SEMANTIC_DISCOVERY_DEPTHS: SemanticDiscoveryOption[] = [
  { value: "quick", label: "快速" },
  { value: "standard", label: "标准" },
  { value: "deep", label: "深入" },
];

export interface BuildSemanticSearchRequestInput {
  query: string;
  scope: SemanticSearchScope;
  currentChat?: string | null;
  selectedChats: string[];
  conversations: Conversation[];
  window: SemanticDiscoveryWindow;
  depth: SemanticSearchDepth;
  sourceLimit: number;
  rerank: boolean;
  limit: number;
}

export interface SemanticAnalysisRequest {
  chat: string;
  window: SemanticDiscoveryWindow;
}

export interface BuildSemanticPreviewRequestInput {
  kind: SemanticPreviewKind;
  talker?: string | null;
  limit: number;
  offset: number;
}

export interface SemanticPreviewRequest {
  kind?: SemanticPreviewKind;
  talker?: string;
  limit: number;
  offset: number;
}

export function buildSemanticSearchRequest(
  input: BuildSemanticSearchRequestInput,
): SemanticSearchRequest | null {
  const query = input.query.trim();
  if (!query) return null;

  const request: SemanticSearchRequest = {
    query,
    limit: input.limit,
    window: input.window,
    depth: input.depth,
    sourceLimit: normalizePositiveInt(input.sourceLimit, 6),
    rerank: input.rerank,
  };

  if (input.scope === "contact") {
    const chat = cleanIdentifier(input.currentChat);
    if (chat) request.chat = chat;
    return request;
  }

  if (input.scope === "selected") {
    const chats = selectedBackendChats(input.selectedChats, input.conversations);
    if (chats.length > 0) request.chats = chats;
    return request;
  }

  return request;
}

export function buildSemanticAnalysisRequest(
  currentChat: string | null | undefined,
  window: SemanticDiscoveryWindow,
): SemanticAnalysisRequest | null {
  const chat = cleanIdentifier(currentChat);
  return chat ? { chat, window } : null;
}

export function buildSemanticPreviewRequest(
  input: BuildSemanticPreviewRequestInput,
): SemanticPreviewRequest {
  const request: SemanticPreviewRequest = {
    limit: normalizePositiveInt(input.limit, 20),
    offset: Math.max(0, Math.round(input.offset)),
  };
  if (input.kind !== "all") request.kind = input.kind;
  const talker = cleanIdentifier(input.talker);
  if (talker && talker !== "all") request.talker = talker;
  return request;
}

export function buildConversationOptions(conversations: Conversation[]): SemanticDiscoveryOption[] {
  return conversations
    .filter((conversation) => cleanIdentifier(conversation.username))
    .map((conversation) => ({
      value: conversation.username,
      label: conversation.displayName || conversation.username,
    }));
}

function selectedBackendChats(selectedChats: string[], conversations: Conversation[]): string[] {
  const allowed = new Set(
    conversations
      .map((conversation) => cleanIdentifier(conversation.username))
      .filter(Boolean),
  );
  const deduped: string[] = [];

  for (const chat of selectedChats) {
    const cleaned = cleanIdentifier(chat);
    if (!cleaned || !allowed.has(cleaned) || deduped.includes(cleaned)) continue;
    deduped.push(cleaned);
  }

  return deduped;
}

function normalizePositiveInt(value: number, fallback: number): number {
  if (!Number.isFinite(value)) return fallback;
  return Math.max(1, Math.round(value));
}

function cleanIdentifier(value: string | null | undefined): string {
  return (value ?? "").trim();
}
