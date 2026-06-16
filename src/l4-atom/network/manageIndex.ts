import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawSemanticIndexActionResponse } from "./chatlogRawTypes";
import { adaptSemanticIndexActionResult, type SemanticIndexActionResult } from "./semanticAdapters";

type IndexAction = 'rebuild' | 'pause' | 'resume' | 'clear';

export async function manageIndex(
  action: IndexAction,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticIndexActionResult> {
  const endpoints: Record<IndexAction, string> = {
    rebuild: buildChatlogApiUrl("/api/v1/semantic/index/rebuild", diagnosticOptions?.serviceBaseUrl),
    pause: buildChatlogApiUrl("/api/v1/semantic/index/pause", diagnosticOptions?.serviceBaseUrl),
    resume: buildChatlogApiUrl("/api/v1/semantic/index/resume", diagnosticOptions?.serviceBaseUrl),
    clear: buildChatlogApiUrl("/api/v1/semantic/index/clear", diagnosticOptions?.serviceBaseUrl),
  };

  const data = await requestJson<RawSemanticIndexActionResponse>(endpoints[action], {
    method: 'POST',
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "POST",
    }),
  });
  return adaptSemanticIndexActionResult(data);
}
