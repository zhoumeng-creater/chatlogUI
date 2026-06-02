import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import {
  adaptSemanticQAResponse,
  buildSemanticQARequestPayload,
  type SemanticQADonePayload,
  type SemanticQARequestInput,
} from "./semanticAdapters";

export async function fetchSemanticQA(
  params: SemanticQARequestInput,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticQADonePayload> {
  const data = await requestJson(`${AI_BASE_URL}/api/v1/semantic/qa`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSemanticQARequestPayload(params)),
    timeoutMs: 60000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "POST",
    }),
  });

  return adaptSemanticQAResponse(data);
}
