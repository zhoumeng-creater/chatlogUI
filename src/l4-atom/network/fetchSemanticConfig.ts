import { AI_BASE_URL } from '@/utils/constants';
import type { SemanticConfig } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticConfig(): Promise<SemanticConfig | null> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/config`);

  if (!response.ok) {
    if (response.status === 404) return null;
    throw new Error(`获取语义配置失败: HTTP ${response.status}`);
  }

  const data = await response.json();
  return data.config || null;
}

export async function setSemanticConfig(
  config: SemanticConfig
): Promise<void> {
  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
  });

  if (!response.ok) {
    throw new Error(`保存语义配置失败: HTTP ${response.status}`);
  }
}
