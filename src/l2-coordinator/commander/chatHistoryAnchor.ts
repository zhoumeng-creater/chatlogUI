import type { ChatMessage, ChatMessageAnchor } from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { FetchHistoryOptions } from "@l4/network/fetchHistory";

interface BuildAnchorHistoryRequestOptions {
  limit: number;
  windowSeconds: number;
}

function isValidTimestamp(timestamp: number | null): timestamp is number {
  return timestamp !== null && Number.isFinite(timestamp) && timestamp > 0;
}

export function buildAnchorHistoryRequest(
  anchor: ChatMessageAnchor,
  options: BuildAnchorHistoryRequestOptions,
): FetchHistoryOptions {
  const request: FetchHistoryOptions = {
    chat: anchor.chat,
    limit: options.limit,
    offset: 0,
  };

  if (isValidTimestamp(anchor.timestamp)) {
    request.since = Math.max(0, anchor.timestamp - options.windowSeconds);
    request.until = anchor.timestamp + options.windowSeconds;
  }

  return request;
}

export function findAnchoredMessage(
  messages: ChatMessage[],
  anchor: ChatMessageAnchor,
): ChatMessage | null {
  if (typeof anchor.localId === "number") {
    const localIdMatch = messages.find((message) => message.localId === anchor.localId);
    if (localIdMatch) return localIdMatch;
  }

  const messageId = anchor.messageId.trim();
  if (messageId) {
    const messageIdMatch = messages.find((message) => message.id === messageId);
    if (messageIdMatch) return messageIdMatch;
  }

  if (isValidTimestamp(anchor.timestamp)) {
    return messages.find((message) => message.timestamp === anchor.timestamp) ?? null;
  }

  return null;
}
