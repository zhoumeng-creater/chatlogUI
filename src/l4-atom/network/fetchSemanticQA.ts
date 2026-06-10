import { buildChatlogApiUrl } from "./chatlogEndpoint";
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
  const data = await requestJson(buildChatlogApiUrl("/api/v1/semantic/qa", diagnosticOptions?.serviceBaseUrl), {
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
