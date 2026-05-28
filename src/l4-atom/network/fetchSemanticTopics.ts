import { AI_BASE_URL } from '@/utils/constants';
import type { TopicsResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticTopics(
  chat: string
): Promise<TopicsResponse> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/topics`);
  url.searchParams.set('chat', chat);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`话题提取失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('话题提取超时');
    }
    throw error;
  }
}
