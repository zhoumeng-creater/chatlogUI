import { AI_BASE_URL } from '@/utils/constants';
import { requestJson } from "./httpClient";
import { adaptConnectionTestResult } from "./semanticAdapters";

export interface ConnectionTestResultView {
  ok?: boolean;
  message: string;
  success?: boolean;
  latencyMs?: number;
}

export async function testLLMConnection(
  provider: string,
  config: Record<string, string>
): Promise<ConnectionTestResultView> {
  const startTime = Date.now();

  const data = await requestJson(`${AI_BASE_URL}/api/v1/semantic/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...config }),
  });
  const latencyMs = Date.now() - startTime;
  const result = adaptConnectionTestResult(data);

  return {
    ...result,
    success: result.ok,
    latencyMs,
  };
}
