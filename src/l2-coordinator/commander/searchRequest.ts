import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { FetchSearchOptions } from "@l4/network/fetchSearch";
import {
  createDefaultSearchAdvancedFilters,
  mapSearchAdvancedFiltersToRequest,
  type SearchAdvancedFiltersState,
} from "./searchAdvancedFilters";

type SearchRequestScope = "all" | "current";
export type SearchRequestKind = "search" | "loadMore" | "retry";

interface CreateSearchRequestInput {
  keyword: string;
  filter: SearchFilterType;
  limit: number;
  offset: number;
  scopeChat?: string;
  advancedFilters?: SearchAdvancedFiltersState;
}

const FILTER_TO_MSG_TYPE: Record<string, number | undefined> = {
  all: undefined,
  text: 1,
  image: 3,
  video: 43,
  file: 49,
};

export function toSearchMessageType(filter: SearchFilterType): number | undefined {
  return FILTER_TO_MSG_TYPE[filter];
}

export function createSearchRequest({
  keyword,
  filter,
  limit,
  offset,
  scopeChat,
  advancedFilters,
}: CreateSearchRequestInput): FetchSearchOptions {
  const advancedRequest = advancedFilters
    ? mapSearchAdvancedFiltersToRequest(advancedFilters)
    : {};
  const chats = mergeSearchChats(scopeChat, advancedRequest.chats);
  const params: FetchSearchOptions = {
    keyword: keyword.trim(),
    limit,
    offset,
    ...advancedRequest,
  };

  const msgType = toSearchMessageType(filter);
  if (msgType) {
    params.msgType = msgType;
  }

  if (chats.length > 0) {
    params.chats = chats;
  }

  return params;
}

export type SearchInputStatus = "invalid" | "ready";

export function getSearchInputStatus(keyword: string): SearchInputStatus {
  return keyword.trim() ? "ready" : "invalid";
}

export interface SearchResults {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: {
    id: string;
    localId?: number;
    timestamp: number;
    content: string;
    sender: string;
    username: string;
    chat: string;
  }[];
}

export interface SearchRequestSnapshot {
  requestId: string;
  kind: SearchRequestKind;
  query: string;
  filter: SearchFilterType;
  scope: SearchRequestScope;
  scopeChat: string | null;
  advancedFilterKey: string;
  offset: number;
  limit: number;
}

interface CreateSearchRequestSnapshotInput {
  requestId: string;
  kind: SearchRequestKind;
  query: string;
  filter: SearchFilterType;
  scope: SearchRequestScope;
  scopeChat?: string | null;
  advancedFilters?: SearchAdvancedFiltersState;
  offset: number;
  limit: number;
}

interface SearchRequestCurrentState {
  query: string;
  activeFilter: SearchFilterType;
  scope: SearchRequestScope;
  scopeChat?: string | null;
  advancedFilters?: SearchAdvancedFiltersState;
}

interface SearchPageMergeState extends SearchRequestCurrentState {
  results: SearchResults | null;
}

function normalizeQuery(query: string): string {
  return query.trim();
}

function normalizeScopeChat(scopeChat: string | null | undefined): string | null {
  const normalized = scopeChat?.trim();
  return normalized ? normalized : null;
}

export function createSearchRequestContextKey(
  advancedFilters: SearchAdvancedFiltersState | undefined,
): string {
  const filters = advancedFilters ?? createDefaultSearchAdvancedFilters();
  const request = mapSearchAdvancedFiltersToRequest(filters);
  return JSON.stringify({
    chats: request.chats ?? [],
    since: request.since ?? null,
    until: request.until ?? null,
    sortMode: filters.sortMode,
    groupMode: filters.groupMode,
  });
}

export function createSearchRequestSnapshot({
  requestId,
  kind,
  query,
  filter,
  scope,
  scopeChat,
  advancedFilters,
  offset,
  limit,
}: CreateSearchRequestSnapshotInput): SearchRequestSnapshot {
  return {
    requestId,
    kind,
    query: normalizeQuery(query),
    filter,
    scope,
    scopeChat: normalizeScopeChat(scopeChat),
    advancedFilterKey: createSearchRequestContextKey(advancedFilters),
    offset,
    limit,
  };
}

export function isSearchSnapshotCurrent(
  snapshot: SearchRequestSnapshot,
  current: SearchRequestCurrentState,
  activeRequestId: string | null | undefined = snapshot.requestId,
): boolean {
  return (
    activeRequestId === snapshot.requestId &&
    normalizeQuery(current.query) === snapshot.query &&
    current.activeFilter === snapshot.filter &&
    current.scope === snapshot.scope &&
    normalizeScopeChat(current.scopeChat) === snapshot.scopeChat &&
    createSearchRequestContextKey(current.advancedFilters) === snapshot.advancedFilterKey
  );
}

export function canMergeSearchPage(
  snapshot: SearchRequestSnapshot,
  current: SearchPageMergeState,
  next: SearchResults,
  activeRequestId: string | null | undefined = snapshot.requestId,
): boolean {
  return (
    snapshot.kind === "loadMore" &&
    isSearchSnapshotCurrent(snapshot, current, activeRequestId) &&
    current.results !== null &&
    snapshot.offset === current.results.messages.length &&
    next.offset === snapshot.offset
  );
}

function mergeSearchChats(scopeChat: string | undefined, advancedChats: string[] | undefined): string[] {
  const merged: string[] = [];
  for (const chat of [scopeChat, ...(advancedChats ?? [])]) {
    const normalized = chat?.trim();
    if (!normalized || merged.includes(normalized)) continue;
    merged.push(normalized);
  }
  return merged;
}

export function getNextSearchOffset(results: SearchResults): number {
  return results.messages.length;
}

export function mergeSearchResults(existing: SearchResults, next: SearchResults): SearchResults {
  const seenIds = new Set(existing.messages.map((message) => message.id));
  const messages = [...existing.messages];
  for (const message of next.messages) {
    if (seenIds.has(message.id)) continue;
    seenIds.add(message.id);
    messages.push(message);
  }

  return {
    ...next,
    offset: 0,
    messages,
    count: messages.length,
  };
}
