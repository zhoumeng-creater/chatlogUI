import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticProfiles, type SemanticProfilesView } from "./semanticAdapters";

export async function fetchSemanticProfiles(
  chat: string,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticProfilesView> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/profiles`);
  url.searchParams.set('chat', chat);

  const data = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticProfiles(data);
}
