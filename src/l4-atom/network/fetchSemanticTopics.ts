import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticTopics, type SemanticTopicsView } from "./semanticAdapters";

export interface SemanticTopicsRequestInput {
  chat?: string;
  window?: string;
}

export async function fetchSemanticTopics(
  input: string | SemanticTopicsRequestInput,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticTopicsView> {
  const { chat, window } = normalizeSemanticTopicsRequest(input);
  const url = new URL(buildChatlogApiUrl("/api/v1/semantic/topics", diagnosticOptions?.serviceBaseUrl));
  if (chat) url.searchParams.set('chat', chat);
  if (window) url.searchParams.set('window', window);

  const data = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticTopics(data);
}

function normalizeSemanticTopicsRequest(input: string | SemanticTopicsRequestInput): SemanticTopicsRequestInput {
  return typeof input === "string" ? { chat: input } : input;
}
