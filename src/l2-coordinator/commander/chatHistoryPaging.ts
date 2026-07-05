import type { FetchHistoryOptions } from "@l4/network/fetchHistory";

export type HistoryOrderingContract = "offset-zero-latest" | "offset-zero-oldest";

export interface HistoryPageShape {
  chat?: string;
  username?: string;
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: unknown[];
}

interface OlderHistoryRequestInput {
  chat: string;
  contract: HistoryOrderingContract;
  currentOffset: number;
  loadedCount: number;
  limit: number;
  oldestLoadedTimestamp?: number | null;
}

export const CHAT_HISTORY_ORDERING_CONTRACT: HistoryOrderingContract = "offset-zero-latest";
export const LATEST_HISTORY_WINDOW_SECONDS = 3_600;

interface LatestHistoryRequestInput {
  chat: string;
  limit: number;
  latestTimestamp: number | null | undefined;
  windowSeconds?: number;
}

function isValidTimestamp(value: number | null | undefined): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}

export function buildLatestHistoryRequest({
  chat,
  limit,
}: LatestHistoryRequestInput): FetchHistoryOptions {
  return {
    chat,
    limit,
    offset: 0,
  };
}

export function buildLatestTimestampWindowRequest({
  chat,
  limit,
  latestTimestamp,
  windowSeconds = LATEST_HISTORY_WINDOW_SECONDS,
}: LatestHistoryRequestInput): FetchHistoryOptions {
  const request: FetchHistoryOptions = {
    chat,
    limit,
    offset: 0,
  };

  if (!isValidTimestamp(latestTimestamp)) return request;

  const boundedWindow = Number.isFinite(windowSeconds) && windowSeconds > 0
    ? Math.round(windowSeconds)
    : LATEST_HISTORY_WINDOW_SECONDS;

  return {
    ...request,
    since: Math.max(0, latestTimestamp - boundedWindow),
    until: latestTimestamp + boundedWindow,
  };
}

export function pageNeedsLatestTimestampFallback(
  page: HistoryPageShape,
  latestTimestamp: number | null | undefined,
  windowSeconds = LATEST_HISTORY_WINDOW_SECONDS,
): boolean {
  if (!isValidTimestamp(latestTimestamp)) return false;
  const boundedWindow = Number.isFinite(windowSeconds) && windowSeconds > 0
    ? Math.round(windowSeconds)
    : LATEST_HISTORY_WINDOW_SECONDS;

  return !page.messages.some((message) => {
    const timestamp = getMessageTimestamp(message);
    return timestamp !== null && Math.abs(timestamp - latestTimestamp) <= boundedWindow;
  });
}

export function mergeLatestTimestampWindowPage<TPage extends HistoryPageShape>({
  primary,
  supplemental,
}: {
  primary: TPage;
  supplemental: HistoryPageShape;
}): TPage {
  const keyed = new Map<string, { message: unknown; index: number }>();
  [...primary.messages, ...supplemental.messages].forEach((message, index) => {
    const key = getMessageKey(message, index);
    if (!keyed.has(key)) {
      keyed.set(key, { message, index });
    }
  });
  const messages = [...keyed.values()]
    .sort(compareMessagesByTime)
    .map((item) => item.message);

  return {
    ...primary,
    totalCount: Math.max(primary.totalCount, supplemental.totalCount),
    count: messages.length,
    messages,
  };
}

export function getLatestPageFollowupRequest(
  page: HistoryPageShape,
  contract: HistoryOrderingContract,
): FetchHistoryOptions | null {
  if (contract !== "offset-zero-oldest") return null;

  const latestOffset = Math.max(page.totalCount - page.limit, 0);
  if (latestOffset <= page.offset) return null;

  return {
    chat: page.chat || page.username || "",
    limit: page.limit,
    offset: latestOffset,
  };
}

export function getOlderHistoryRequest(input: OlderHistoryRequestInput): FetchHistoryOptions | null {
  if (input.limit <= 0 || input.loadedCount <= 0) return null;

  if (input.contract === "offset-zero-latest" && isValidTimestamp(input.oldestLoadedTimestamp)) {
    return {
      chat: input.chat,
      limit: input.limit,
      offset: 0,
      until: Math.max(0, Math.floor(input.oldestLoadedTimestamp) - 1),
    };
  }

  if (input.contract === "offset-zero-oldest") {
    const nextOffset = input.currentOffset - input.limit;
    if (nextOffset < 0) return null;
    return {
      chat: input.chat,
      limit: input.limit,
      offset: nextOffset,
    };
  }

  return {
    chat: input.chat,
    limit: input.limit,
    offset: input.currentOffset + input.limit,
  };
}

export function hasOlderHistory(
  page: HistoryPageShape,
  contract: HistoryOrderingContract,
): boolean {
  const loadedCount = page.count || page.messages.length;
  if (page.limit <= 0 || loadedCount <= 0 || loadedCount < page.limit) return false;
  if (contract === "offset-zero-oldest") return page.offset > 0;
  return page.offset + loadedCount < page.totalCount || loadedCount >= page.limit;
}

function getMessageTimestamp(message: unknown): number | null {
  if (!message || typeof message !== "object") return null;
  const record = message as Record<string, unknown>;
  if (typeof record.timestamp === "number" && Number.isFinite(record.timestamp) && record.timestamp > 0) {
    return record.timestamp;
  }
  if (typeof record.time === "string" && record.time.trim()) {
    const parsed = Date.parse(record.time.replace(" ", "T"));
    return Number.isNaN(parsed) ? null : Math.floor(parsed / 1000);
  }
  return null;
}

function getMessageKey(message: unknown, index: number): string {
  if (!message || typeof message !== "object") return `index:${index}`;
  const record = message as Record<string, unknown>;
  if (typeof record.id === "string" && record.id) return `id:${record.id}`;
  if (typeof record.localId === "number" && Number.isFinite(record.localId)) return `local:${record.localId}`;
  return [
    "fallback",
    getMessageTimestamp(message) ?? "",
    typeof record.sender === "string" ? record.sender : "",
    typeof record.type === "string" ? record.type : "",
    typeof record.content === "string" ? record.content : "",
    index,
  ].join(":");
}

function compareMessagesByTime(
  a: { message: unknown; index: number },
  b: { message: unknown; index: number },
): number {
  const aTimestamp = getMessageTimestamp(a.message);
  const bTimestamp = getMessageTimestamp(b.message);
  if (aTimestamp !== null && bTimestamp !== null && aTimestamp !== bTimestamp) {
    return aTimestamp - bTimestamp;
  }
  if (aTimestamp !== null && bTimestamp === null) return 1;
  if (aTimestamp === null && bTimestamp !== null) return -1;
  return a.index - b.index;
}
