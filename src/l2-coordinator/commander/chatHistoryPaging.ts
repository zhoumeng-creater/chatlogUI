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
