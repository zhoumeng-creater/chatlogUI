import { GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
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
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/graph/config?format=json", diagnosticOptions?.serviceBaseUrl), {
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
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/graph/config?format=json", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildGraphConfigPayload(draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph_config",
      method: "POST",
    }),
  });
  const record = raw && typeof raw === "object" && !Array.isArray(raw)
    ? (raw as Record<string, unknown>)
    : {};
  return adaptGraphConfig(record.status ?? raw);
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
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/graph/qa?format=json", diagnosticOptions?.serviceBaseUrl), {
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
  const raw = await requestJson(buildChatlogApiUrl(`/api/v1/graph/ingest/${kind}?format=json`, diagnosticOptions?.serviceBaseUrl), {
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
