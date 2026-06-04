import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptConnectionTestResult } from "./semanticAdapters";

export interface ConnectionTestResultView {
  ok?: boolean;
  message: string;
  success?: boolean;
  latencyMs?: number;
}

export async function testLLMConnection(
  provider: string,
  config: object,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<ConnectionTestResultView> {
  const startTime = Date.now();

  const data = await requestJson(`${AI_BASE_URL}/api/v1/semantic/test`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ provider, ...config }),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "POST",
    }),
  });
  const latencyMs = Date.now() - startTime;
  const result = adaptConnectionTestResult(data);

  return {
    ...result,
    success: result.ok,
    latencyMs,
  };
}
