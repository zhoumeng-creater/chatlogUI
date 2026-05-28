import { AI_BASE_URL, SEMANTIC_SEARCH_DEFAULT_LIMIT } from '@/utils/constants';
import type { SemanticSearchRequest, SemanticSearchResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticSearch(
  params: SemanticSearchRequest
): Promise<SemanticSearchResponse> {
  const { query, limit = SEMANTIC_SEARCH_DEFAULT_LIMIT, chat, scope } = params;
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/search`);
  url.searchParams.set('query', query);
  url.searchParams.set('limit', String(limit));
  if (chat) url.searchParams.set('chat', chat);
  if (scope) url.searchParams.set('scope', scope);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`语义搜索失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('语义搜索超时');
    }
    throw error;
  }
}
