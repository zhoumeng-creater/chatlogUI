import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticIndexStatus, type SemanticIndexStatus } from "./semanticAdapters";

export async function fetchIndexStatus(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticIndexStatus> {
  const data = await requestJson(buildChatlogApiUrl("/api/v1/semantic/index/status", diagnosticOptions?.serviceBaseUrl), {
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticIndexStatus(data);
}
