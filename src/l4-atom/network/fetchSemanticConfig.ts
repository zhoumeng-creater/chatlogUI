import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticConfig, type SemanticConfigView } from "./semanticAdapters";

export type SemanticConfigDraft = SemanticConfigView | object;

export async function fetchSemanticConfig(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticConfigView | null> {
  const data = await requestJson(`${AI_BASE_URL}/api/v1/semantic/config`, {
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
  await requestJson(`${AI_BASE_URL}/api/v1/semantic/config`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "POST",
    }),
  });
}
