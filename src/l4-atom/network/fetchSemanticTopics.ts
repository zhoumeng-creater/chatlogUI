import { AI_BASE_URL } from '@/utils/constants';
import { requestJson } from "./httpClient";
import { adaptSemanticTopics, type SemanticTopicsView } from "./semanticAdapters";

export async function fetchSemanticTopics(
  chat: string
): Promise<SemanticTopicsView> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/topics`);
  url.searchParams.set('chat', chat);

  const data = await requestJson(url.toString(), { timeoutMs: 30000 });
  return adaptSemanticTopics(data);
}
