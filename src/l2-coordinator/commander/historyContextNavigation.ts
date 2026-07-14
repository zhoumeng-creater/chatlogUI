import type {
  HistoryContextPage,
  HistoryContextRequest,
} from "@/l2-coordinator/api-docs/historyContext";
import type {
  ChatMessage,
  ChatMessageAnchor,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import {
  HistoryContextProtocolError,
  HistoryContextRequestError,
} from "@/l4-atom/network/fetchHistoryContext";

export type AnchorLoadStrategy = "exact" | "legacy-exact" | "legacy-nearby" | "unavailable";

interface HistoryContextNavigationTargetShape {
  conversationId: string;
  dataRevision?: string;
  historyContextAvailable?: boolean;
  anchor: Pick<ChatMessageAnchor, "source" | "seq" | "timestamp">;
}

interface AnchorLoadOptions {
  allowNearbyFallback?: boolean;
}

export interface ExactHistoryContextFailure {
  reason: "missing" | "load-failed" | "cancelled";
  message: string;
  nearbyFallbackAvailable: boolean;
}

export async function executeAnchorLoad<TLegacy>({
  target,
  options,
  signal,
  fetchExact,
  fetchLegacyExact,
  fetchLegacyNearby,
}: {
  target: HistoryContextNavigationTargetShape;
  options: AnchorLoadOptions;
  signal: AbortSignal;
  fetchExact: (request: HistoryContextRequest, signal: AbortSignal) => Promise<HistoryContextPage>;
  fetchLegacyExact: (signal: AbortSignal) => Promise<TLegacy>;
  fetchLegacyNearby: (signal: AbortSignal) => Promise<TLegacy>;
}): Promise<
  | { kind: "exact"; page: HistoryContextPage }
  | { kind: "legacy-exact" | "legacy-nearby"; page: TLegacy }
> {
  const strategy = resolveAnchorLoadStrategy(target, options);
  if (strategy === "exact") {
    return {
      kind: "exact",
      page: await fetchExact(toExactHistoryContextRequest(target), signal),
    };
  }
  if (strategy === "legacy-exact") {
    return { kind: strategy, page: await fetchLegacyExact(signal) };
  }
  if (strategy === "legacy-nearby") {
    return { kind: strategy, page: await fetchLegacyNearby(signal) };
  }
  throw new HistoryContextProtocolError("invalid_history_context_request");
}

export function resolveAnchorLoadStrategy(
  target: HistoryContextNavigationTargetShape,
  options: AnchorLoadOptions,
): AnchorLoadStrategy {
  if (options.allowNearbyFallback) return "legacy-nearby";
  if (target.anchor.source !== "search") return "legacy-exact";
  if (target.historyContextAvailable === false) return "legacy-exact";
  if (target.historyContextAvailable !== true) return "unavailable";
  return isPositiveSafeInteger(target.anchor.seq) && isNonEmptyString(target.dataRevision)
    ? "exact"
    : "unavailable";
}

export function toExactHistoryContextRequest(
  target: HistoryContextNavigationTargetShape,
): HistoryContextRequest {
  if (
    target.anchor.source !== "search" ||
    target.historyContextAvailable !== true ||
    !isPositiveSafeInteger(target.anchor.seq) ||
    !isNonEmptyString(target.dataRevision)
  ) {
    throw new HistoryContextProtocolError("invalid_history_context_request");
  }
  return {
    conversationId: target.conversationId,
    seq: target.anchor.seq,
    limit: 51,
    dataRevision: target.dataRevision,
  };
}

export function toChatHistoryContext(
  page: HistoryContextPage,
  isGroup: boolean,
): {
  messages: ChatMessage[];
  anchorMessageId: string;
  totalCount: number;
  offset: number;
  hasMore: boolean;
} {
  const messages = page.messages.map<ChatMessage>((message) => ({
    id: `history-context:${message.seq}`,
    seq: message.seq,
    localId: message.seq,
    timestamp: message.timestamp,
    time: new Date(message.timestamp * 1_000).toISOString(),
    talker: message.conversationId,
    talkerName: message.conversationName,
    sender: message.senderId || "unknown",
    senderName: message.senderName,
    isSelf: message.isSelf,
    type: String(message.type),
    subType: String(message.subType),
    content: message.content,
    chat: message.conversationName || message.conversationId,
    username: message.conversationId,
    isGroup,
    chatType: isGroup ? "group" : "private",
    direction: message.isSelf ? "self" : "other",
  }));
  return {
    messages,
    anchorMessageId: messages[page.anchorIndex].id,
    totalCount: messages.length,
    offset: 0,
    hasMore: page.hasBefore,
  };
}

export function classifyExactHistoryContextError(
  error: unknown,
  target: HistoryContextNavigationTargetShape,
): ExactHistoryContextFailure {
  if (error instanceof HistoryContextRequestError) {
    if (error.code === "history_context_cancelled") {
      return {
        reason: "cancelled",
        message: "定位请求已取消。",
        nearbyFallbackAvailable: false,
      };
    }
    if (error.code === "history_context_message_not_found") {
      return {
        reason: "missing",
        message: "原消息已不存在；可选择打开其时间附近的记录。",
        nearbyFallbackAvailable: isPositiveSafeInteger(target.anchor.timestamp),
      };
    }
    if (error.code === "history_context_conversation_not_found") {
      return {
        reason: "missing",
        message: "来源会话已不存在，请刷新搜索。",
        nearbyFallbackAvailable: false,
      };
    }
    if (error.code === "history_context_stale") {
      return {
        reason: "load-failed",
        message: "搜索快照已过期，请刷新搜索后重试。",
        nearbyFallbackAvailable: false,
      };
    }
  }
  if (error instanceof HistoryContextProtocolError) {
    return {
      reason: "load-failed",
      message:
        error.code === "invalid_history_context_request"
          ? "搜索结果缺少精确定位信息，请刷新搜索后重试。"
          : "精确消息上下文响应无效，请更新本机服务后重试。",
      nearbyFallbackAvailable: false,
    };
  }
  return {
    reason: "load-failed",
    message: "无法加载这条消息的精确上下文，请重试。",
    nearbyFallbackAvailable: false,
  };
}

function isPositiveSafeInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value > 0;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.length > 0;
}
