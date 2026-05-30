import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { FetchSearchOptions } from "@l4/network/fetchSearch";

interface CreateSearchRequestInput {
  keyword: string;
  filter: SearchFilterType;
  limit: number;
  offset: number;
  scopeChat?: string;
}

const FILTER_TO_MSG_TYPE: Record<string, string | undefined> = {
  all: undefined,
  text: "1",
  image: "3",
  video: "43",
  file: "49",
};

export function toSearchMessageType(filter: SearchFilterType): string | undefined {
  return FILTER_TO_MSG_TYPE[filter];
}

export function createSearchRequest({
  keyword,
  filter,
  limit,
  offset,
  scopeChat,
}: CreateSearchRequestInput): FetchSearchOptions {
  const params: FetchSearchOptions = {
    keyword: keyword.trim(),
    limit,
    offset,
  };

  const msgType = toSearchMessageType(filter);
  if (msgType) {
    params.msgType = msgType;
  }

  if (scopeChat) {
    params.chats = [scopeChat];
  }

  return params;
}

export interface SearchResults {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: { id: string; timestamp: number; content: string; sender: string; username: string; chat: string }[];
}

export function getNextSearchOffset(results: SearchResults): number {
  return results.messages.length;
}

export function mergeSearchResults(existing: SearchResults, next: SearchResults): SearchResults {
  const messages = [...existing.messages, ...next.messages];
  return {
    ...next,
    offset: 0,
    messages,
    count: messages.length,
  };
}
