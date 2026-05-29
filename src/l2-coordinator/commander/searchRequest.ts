import type { SearchFilterType, SearchQueryParams, SearchResult } from "@/l2-coordinator/api-docs/search";

interface CreateSearchRequestInput {
  keyword: string;
  filter: SearchFilterType;
  limit: number;
  offset: number;
}

export function toSearchMessageType(filter: SearchFilterType): string | undefined {
  return filter === "all" ? undefined : filter;
}

export function createSearchRequest({
  keyword,
  filter,
  limit,
  offset,
}: CreateSearchRequestInput): SearchQueryParams {
  const params: SearchQueryParams = {
    keyword: keyword.trim(),
    limit,
    offset,
  };

  const type = toSearchMessageType(filter);
  if (type) {
    params.type = type;
  }

  return params;
}

export function getNextSearchOffset(results: SearchResult): number {
  return results.messages.length;
}

export function mergeSearchResults(existing: SearchResult, next: SearchResult): SearchResult {
  const messages = [...existing.messages, ...next.messages];

  return {
    ...next,
    offset: 0,
    messages,
    count: messages.length,
  };
}
