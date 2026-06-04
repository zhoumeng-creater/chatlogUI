import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticProfiles, type SemanticProfilesView } from "./semanticAdapters";

export interface SemanticProfilesRequestInput {
  chat?: string;
  window?: string;
}

export async function fetchSemanticProfiles(
  input: string | SemanticProfilesRequestInput,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticProfilesView> {
  const { chat, window } = normalizeSemanticProfilesRequest(input);
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/profiles`);
  if (chat) url.searchParams.set('chat', chat);
  if (window) url.searchParams.set('window', window);

  const data = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticProfiles(data);
}

function normalizeSemanticProfilesRequest(input: string | SemanticProfilesRequestInput): SemanticProfilesRequestInput {
  return typeof input === "string" ? { chat: input } : input;
}
