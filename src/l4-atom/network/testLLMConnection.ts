import { AI_BASE_URL } from '@/utils/constants';
import type { ConnectionTestResult } from '@/l2-coordinator/api-docs/semantic';

export async function testLLMConnection(
  provider: string,
  config: Record<string, string>
): Promise<ConnectionTestResult> {
  const startTime = Date.now();

  const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...config }),
  });

  const data = await response.json();
  const latencyMs = Date.now() - startTime;

  return {
    success: response.ok && data.success !== false,
    message: data.message || (response.ok ? '连接成功' : '连接失败'),
    latencyMs,
  };
}
