import { AI_BASE_URL } from '@/utils/constants';
import type { IndexStatusResponse } from '@/l2-coordinator/api-docs/semantic';

export async function fetchIndexStatus(): Promise<IndexStatusResponse> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/index/status`);

  if (!response.ok) {
    throw new Error(`获取索引状态失败: HTTP ${response.status}`);
  }

  return await response.json();
}
