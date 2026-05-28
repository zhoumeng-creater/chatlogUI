import { AI_BASE_URL } from '@/utils/constants';

type IndexAction = 'rebuild' | 'pause' | 'resume' | 'clear';

export async function manageIndex(action: IndexAction): Promise<void> {
  const endpoints: Record<IndexAction, string> = {
    rebuild: `${AI_BASE_URL}/api/v1/semantic/index/rebuild`,
    pause: `${AI_BASE_URL}/api/v1/semantic/index/pause`,
    resume: `${AI_BASE_URL}/api/v1/semantic/index/resume`,
    clear: `${AI_BASE_URL}/api/v1/semantic/index/clear`,
  };

  const response = await fetch(endpoints[action], { method: 'POST' });

  if (!response.ok) {
    throw new Error(`索引操作 (${action}) 失败: HTTP ${response.status}`);
  }
}
