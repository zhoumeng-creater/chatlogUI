import { GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type {
  RawGraphActionResponse,
  RawGraphConfigResponse,
  RawGraphQAResponse,
} from "./chatlogRawTypes";
import {
  adaptGraphConfig,
  adaptGraphIngestResponse,
  adaptGraphQAResponse,
  buildGraphConfigPayload,
  buildGraphIngestPayload,
  buildGraphQAPayload,
  type GraphConfigDraft,
  type GraphConfigView,
  type GraphIngestDraft,
  type GraphIngestKind,
  type GraphIngestResult,
  type GraphQADraft,
  type GraphQAResponseView,
} from "./graphResidualAdapters";

export async function fetchGraphConfig(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphConfigView> {
  const raw = await requestJson<RawGraphConfigResponse>(buildChatlogApiUrl("/api/v1/graph/config", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph_config",
      method: "GET",
    }),
  });
  return adaptGraphConfig(raw);
}

export async function saveGraphConfig(
  draft: GraphConfigDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphConfigView> {
  const raw = await requestJson<RawGraphConfigResponse>(buildChatlogApiUrl("/api/v1/graph/config", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGraphConfigPayload(draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph_config",
      method: "POST",
    }),
  });
  return adaptGraphConfig(raw);
}

export async function ingestGraphBusiness(
  draft: GraphIngestDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphIngestResult> {
  return ingestGraph("business", draft, diagnosticOptions);
}

export async function ingestGraphEvent(
  draft: GraphIngestDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphIngestResult> {
  return ingestGraph("event", draft, diagnosticOptions);
}

export async function askGraphQA(
  draft: GraphQADraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphQAResponseView> {
  const raw = await requestJson<RawGraphQAResponse>(buildChatlogApiUrl("/api/v1/graph/qa", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: 45000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGraphQAPayload(draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph_qa",
      method: "POST",
    }),
  });
  return adaptGraphQAResponse(raw);
}

async function ingestGraph(
  kind: GraphIngestKind,
  draft: GraphIngestDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphIngestResult> {
  const raw = await requestJson<RawGraphActionResponse>(buildChatlogApiUrl(`/api/v1/graph/ingest/${kind}`, diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: 30000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGraphIngestPayload(kind, draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: `graph_ingest_${kind}`,
      method: "POST",
    }),
  });
  return adaptGraphIngestResponse(kind, raw);
}
