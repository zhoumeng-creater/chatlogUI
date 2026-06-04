import { AI_BASE_URL } from '@/utils/constants';
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptSemanticTopics, type SemanticTopicsView } from "./semanticAdapters";

export interface FetchSemanticTopicsOptions {
  chat: string;
  window?: string;
}

export async function fetchSemanticTopics(
  input: string | FetchSemanticTopicsOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticTopicsView> {
  const options = typeof input === "string" ? { chat: input } : input;
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/topics`);
  url.searchParams.set('chat', options.chat);
  if (options.window) url.searchParams.set("window", options.window);

  const data = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic",
      method: "GET",
    }),
  });
  return adaptSemanticTopics(data);
}
