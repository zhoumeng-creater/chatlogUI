import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import type { FetchSearchOptions } from "@l4/network/fetchSearch";

type SearchRequestScope = "all" | "current";
export type SearchRequestKind = "search" | "loadMore" | "retry";

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

export type SearchInputStatus = "invalid" | "ready";

export function getSearchInputStatus(keyword: string): SearchInputStatus {
  return keyword.trim() ? "ready" : "invalid";
}

export interface SearchResults {
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  messages: { id: string; timestamp: number; content: string; sender: string; username: string; chat: string }[];
}

export interface SearchRequestSnapshot {
  requestId: string;
  kind: SearchRequestKind;
  query: string;
  filter: SearchFilterType;
  scope: SearchRequestScope;
  scopeChat: string | null;
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
  offset: number;
  limit: number;
}

interface SearchRequestCurrentState {
  query: string;
  activeFilter: SearchFilterType;
  scope: SearchRequestScope;
  scopeChat?: string | null;
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

export function createSearchRequestSnapshot({
  requestId,
  kind,
  query,
  filter,
  scope,
  scopeChat,
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
    normalizeScopeChat(current.scopeChat) === snapshot.scopeChat
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
