import type { HistoryMessage } from "./history";
import {
  SEARCH_CATEGORIES,
  SEARCH_DIRECTORY_SELF_SENDER_ID,
} from "@/utils/constants";

export {
  SEARCH_CATEGORIES,
  SEARCH_DIRECTORY_SELF_SENDER_ID,
} from "@/utils/constants";

/** @deprecated Legacy-only five-way filter used by the pre-search.v2 UI. */
export type SearchFilterType = "all" | "text" | "image" | "video" | "file";

/** @deprecated Incomplete offset response retained only for legacy sidecars. */
export interface LegacySearchResult {
  query: string;
  chats: string[];
  totalCount: number;
  count: number;
  limit: number;
  offset: number;
  querySince?: number;
  queryUntil?: number;
  queryRangeLabel?: string;
  messages: HistoryMessage[];
}

/** @deprecated Use SearchSnapshotPage for enhanced search. */
export type SearchResult = LegacySearchResult;

/** @deprecated Raw legacy GET parameters. msgType is a numeric WeChat type. */
export interface SearchQueryParams {
  keyword: string;
  limit?: number;
  offset?: number;
  chat?: string;
  chats?: string[];
  time?: string;
  since?: number;
  until?: number;
  msgType?: number;
}

export type SearchCategory = (typeof SEARCH_CATEGORIES)[number];

export type SearchDirectoryScope = "all" | "current" | "selected";

export interface SearchConversationDirectoryItem {
  conversationId: string;
  displayName: string;
  kind: "direct" | "group";
  disambiguator: string;
}

export interface SearchSenderDirectoryItem {
  senderId: string;
  displayName: string;
  isSelf: boolean;
  conversationCount: number;
  contextLabel: string;
  disambiguator: string;
}

export interface SearchDirectoryPage<Item> {
  dataRevision: string;
  exactTotal: true;
  complete: true;
  totalCount: number;
  count: number;
  hasMore: boolean;
  nextCursor: string;
  items: Item[];
}

export type SearchConversationDirectoryPage =
  SearchDirectoryPage<SearchConversationDirectoryItem>;

export type SearchSenderDirectoryPage = SearchDirectoryPage<SearchSenderDirectoryItem>;

export interface SearchConversationDirectoryRequest {
  query: string;
  limit?: number;
  cursor?: string;
  dataRevision?: string;
}

export interface SearchSenderDirectoryRequest extends SearchConversationDirectoryRequest {
  scope: SearchDirectoryScope;
  chats: string[];
}

export interface SearchCapabilities {
  mode: "v2" | "legacy";
  contractVersion: "search.v2" | "legacy";
  exactTotal: boolean;
  completeScope: boolean;
  senderFilter: boolean;
  taxonomy: SearchCategory[];
  snapshotCursor: boolean;
  inclusiveTimeBoundaries: boolean;
  defaultPageSize: number;
  maxPageSize: number;
  maxKeywordGraphemes: number;
  maxKeywordTerms: number;
  directoryVersion: "search.directory.v1" | "legacy";
  conversationDirectory: boolean;
  senderDirectory: boolean;
  directorySelfSenderId: typeof SEARCH_DIRECTORY_SELF_SENDER_ID | "";
  directoryDefaultPageSize: number;
  directoryMaxPageSize: number;
  directoryMaxQueryGraphemes: number;
  historyContextVersion: "history.context.v1" | "legacy";
  historyContextQuery: boolean;
  historyContextRevisionBinding: boolean;
  historyContextDefaultLimit: number;
  historyContextMaxLimit: number;
  historyContextMaxExactCandidates: number;
  historyContextMaxExactBatches: number;
  historyContextMaxShards: number;
  unavailableReason?: "not_supported" | "invalid_response";
}

export interface SearchMatchSegment {
  text: string;
  matched: boolean;
}

export interface SearchHit {
  /** Stable inside its conversation only; never use this field as a global result key. */
  messageId: string;
  /** Together with conversationId and messageId, distinguishes repeated local message IDs. */
  seq: number;
  sourceIndex: number;
  conversationId: string;
  conversationName: string;
  senderId: string;
  senderName: string;
  timestamp: number;
  type: number;
  subType: number;
  category: SearchCategory;
  matchField: string;
  snippet: string;
  matchSegments: SearchMatchSegment[];
}

export interface SearchSnapshotPage {
  snapshotId: string;
  dataRevision: string;
  exactTotal: boolean;
  completeScope: boolean;
  totalCount: number;
  count: number;
  windowStart: number;
  previousCursor: string;
  nextCursor: string;
  hasPrevious: boolean;
  hasNext: boolean;
  querySince?: number;
  queryUntil?: number;
  messages: SearchHit[];
}

export interface SearchV2Request {
  keyword: string;
  chats?: string[];
  categories?: SearchCategory[];
  senderIds?: string[];
  since?: number;
  until?: number;
  limit?: number;
  snapshotId?: string;
  dataRevision?: string;
  cursor?: string;
}
