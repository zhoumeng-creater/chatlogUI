import { AI_BASE_URL, SEMANTIC_SEARCH_DEFAULT_LIMIT } from '@/utils/constants';
import { requestJson } from "./httpClient";
import {
  adaptSemanticSearch,
  type SemanticSearchResultSet,
} from "./semanticAdapters";

export interface SemanticSearchRequestInput {
  query: string;
  limit?: number;
  chat?: string;
  scope?: "contact" | "all";
}

export async function fetchSemanticSearch(
  params: SemanticSearchRequestInput
): Promise<SemanticSearchResultSet> {
  const { query, limit = SEMANTIC_SEARCH_DEFAULT_LIMIT, chat } = params;
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(limit));
  if (chat) url.searchParams.set('chat', chat);

  const data = await requestJson(url.toString(), { timeoutMs: 30000 });
  return adaptSemanticSearch(data);
}
