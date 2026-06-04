import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticProfiles, type SemanticProfilesView } from "./semanticAdapters";

export interface FetchSemanticProfilesOptions {
  chat: string;
  window?: string;
}

export async function fetchSemanticProfiles(
  input: string | FetchSemanticProfilesOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticProfilesView> {
  const options = typeof input === "string" ? { chat: input } : input;
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/profiles`);
  url.searchParams.set('chat', options.chat);
  if (options.window) url.searchParams.set("window", options.window);

  const data = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticProfiles(data);
}
