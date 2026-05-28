import { AI_BASE_URL } from '@/utils/constants';
import type { QARequest } from '@/l2-coordinator/api-docs/semantic';

export async function fetchSemanticQA(params: QARequest): Promise<string> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);

  try {
    const response = await fetch(`${AI_BASE_URL}/api/v1/semantic/qa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`QA 请求失败: HTTP ${response.status}`);
    }

    const data = await response.json();
    return data.answer || data.content || JSON.stringify(data);
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error('QA 请求超时');
    }
    throw error;
  }
}
