import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticIndexStatus, type SemanticIndexStatus } from "./semanticAdapters";

export async function fetchIndexStatus(
  requestOptions?: RequestDiagnosticsOptions,
): Promise<SemanticIndexStatus> {
  const data = await requestJson(
    `${AI_BASE_URL}/api/v1/semantic/index/status`,
    withRequestDiagnostics(requestOptions, { endpointFamily: "semantic-index-status" }),
  );
  return adaptSemanticIndexStatus(data);
}
