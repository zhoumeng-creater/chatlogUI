import type {
  ChatMessage,
  ChatMessageAnchor,
} from "@/l2-coordinator/data-clerk/stores/useChatStore";
import type { FetchHistoryOptions } from "@l4/network/fetchHistory";

interface BuildAnchorHistoryRequestOptions {
  limit: number;
  windowSeconds: number;
}

function isValidTimestamp(timestamp: number | null): timestamp is number {
  return timestamp !== null && Number.isFinite(timestamp) && timestamp > 0;
}

function isValidSequence(seq: number | null | undefined): seq is number {
  return typeof seq === "number" && Number.isSafeInteger(seq) && seq > 0;
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
    if (isValidSequence(anchor.seq)) {
      request.since = anchor.timestamp;
      request.until = anchor.timestamp;
    } else {
      request.since = Math.max(0, anchor.timestamp - options.windowSeconds);
      request.until = anchor.timestamp + options.windowSeconds;
    }
  }

  return request;
}

export function buildNearbyAnchorHistoryRequest(
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

export async function findExactAnchorPage<TPage extends { messages: ChatMessage[] }>({
  anchor,
  limit,
  windowSeconds,
  maxMessages,
  fetchPage,
}: {
  anchor: ChatMessageAnchor;
  limit: number;
  windowSeconds: number;
  maxMessages: number;
  fetchPage: (request: FetchHistoryOptions) => Promise<TPage>;
}): Promise<{ page: TPage; hit: ChatMessage | null }> {
  const safeLimit = Math.max(1, Math.trunc(limit));
  const safeMaxMessages = Math.max(safeLimit, Math.trunc(maxMessages));
  const base = buildAnchorHistoryRequest(anchor, { limit: safeLimit, windowSeconds });
  let offset = 0;
  let page = await fetchPage({ ...base, offset });

  while (offset < safeMaxMessages) {
    const hit = findAnchoredMessage(page.messages, anchor);
    if (hit) return { page, hit };
    if (page.messages.length < safeLimit || offset + safeLimit >= safeMaxMessages) {
      return { page, hit: null };
    }
    offset += safeLimit;
    page = await fetchPage({ ...base, offset });
  }
  return { page, hit: null };
}

export function findAnchoredMessage(
  messages: ChatMessage[],
  anchor: ChatMessageAnchor,
): ChatMessage | null {
  if (isValidSequence(anchor.seq)) {
    const seqMatch = messages.find((message) => message.seq === anchor.seq);
    if (seqMatch) return seqMatch;
  }

  if (typeof anchor.localId === "number") {
    const localIdMatch = messages.find((message) => message.localId === anchor.localId);
    if (localIdMatch) return localIdMatch;
  }

  const messageId = anchor.messageId.trim();
  if (messageId) {
    const messageIdMatch = messages.find((message) => message.id === messageId);
    if (messageIdMatch) return messageIdMatch;
  }

  return null;
}

export function findNearbyAnchoredMessage(
  messages: ChatMessage[],
  anchor: ChatMessageAnchor,
): ChatMessage | null {
  if (!isValidTimestamp(anchor.timestamp) || messages.length === 0) return null;
  let nearest: ChatMessage | null = null;
  let nearestDistance = Number.POSITIVE_INFINITY;
  for (const message of messages) {
    if (!isValidTimestamp(message.timestamp)) continue;
    const distance = Math.abs(message.timestamp - anchor.timestamp);
    if (distance < nearestDistance) {
      nearest = message;
      nearestDistance = distance;
    }
  }
  return nearest;
}
