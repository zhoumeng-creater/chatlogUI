import { AI_BASE_URL } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import {
  adaptSemanticIndexPreview,
  type SemanticIndexPreviewView,
  type SemanticPreviewKind,
} from "./semanticPreviewAdapters";

export interface FetchSemanticIndexPreviewOptions {
  kind?: SemanticPreviewKind;
  talker?: string;
  limit?: number;
  offset?: number;
}

export async function fetchSemanticIndexPreview(
  options: FetchSemanticIndexPreviewOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<SemanticIndexPreviewView> {
  const url = new URL(`${AI_BASE_URL}/api/v1/semantic/index/preview`);
  url.searchParams.set("format", "json");
  if (options.kind) url.searchParams.set("kind", options.kind);
  if (options.talker) url.searchParams.set("talker", options.talker);
  if (options.limit !== undefined) url.searchParams.set("limit", String(options.limit));
  if (options.offset !== undefined) url.searchParams.set("offset", String(options.offset));

  const raw = await requestJson(url.toString(), {
    timeoutMs: 30000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "semantic_preview",
      method: "GET",
    }),
  });
  return adaptSemanticIndexPreview(raw);
}
