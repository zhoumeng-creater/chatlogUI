import { SEMANTIC_SEARCH_DEFAULT_LIMIT } from '@/utils/constants';
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import {
  adaptSemanticSearch,
  type SemanticSearchResultSet,
} from "./semanticAdapters";

export interface SemanticSearchRequestInput {
  query: string;
  limit?: number;
  chat?: string;
  chats?: string[];
  window?: string;
  depth?: string;
  sourceLimit?: number;
  rerank?: boolean;
  scope?: "contact" | "selected" | "all";
}

export async function fetchSemanticSearch(
  params: SemanticSearchRequestInput,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticSearchResultSet> {
  const {
    query,
    limit = SEMANTIC_SEARCH_DEFAULT_LIMIT,
    chat,
    chats,
    window,
    depth,
    sourceLimit,
    rerank,
  } = params;
  const url = new URL(buildChatlogApiUrl("/api/v1/semantic/search", diagnosticOptions?.serviceBaseUrl));
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(limit));
  if (chat) url.searchParams.set('chat', chat);
  if (chats?.length) url.searchParams.set('chats', chats.join(","));
  if (window) url.searchParams.set('window', window);
  if (depth) url.searchParams.set('depth', depth);
  if (sourceLimit !== undefined) url.searchParams.set('source_limit', String(sourceLimit));
  if (rerank !== undefined) url.searchParams.set('rerank', String(rerank));

  const data = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticSearch(data);
}
