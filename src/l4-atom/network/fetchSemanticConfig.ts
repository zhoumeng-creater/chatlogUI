import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawSemanticConfigResponse } from "./chatlogRawTypes";
import { adaptSemanticConfig, type SemanticConfigView } from "./semanticAdapters";

export type SemanticConfigDraft = SemanticConfigView | object;

export async function fetchSemanticConfig(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticConfigView | null> {
  const data = await requestJson<RawSemanticConfigResponse>(buildChatlogApiUrl("/api/v1/semantic/config", diagnosticOptions?.serviceBaseUrl), {
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticConfig(data);
}

export async function setSemanticConfig(
  config: SemanticConfigDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<void> {
  await requestJson(buildChatlogApiUrl("/api/v1/semantic/config", diagnosticOptions?.serviceBaseUrl), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "POST",
    }),
  });
}
