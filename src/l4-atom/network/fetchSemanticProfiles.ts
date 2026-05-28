import { AI_BASE_URL } from '@/utils/constants';
import type { ContactProfileData } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticProfiles(
  chat: string
): Promise<ContactProfileData> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/profiles`);
  url.searchParams.set('chat', chat);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`联系人画像获取失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('联系人画像获取超时');
    }
    throw error;
  }
}
