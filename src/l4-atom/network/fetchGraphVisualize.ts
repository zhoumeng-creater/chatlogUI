import {
  GRAPH_DEFAULT_LIMIT,
  GRAPH_MAX_LIMIT,
  GRAPH_FETCH_TIMEOUT_MS,
} from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptGraphVisualize, type GraphVisualizeView } from "./graphAdapters";

interface GraphVisualizeParams {
  keyword?: string;
  window?: string;
  limit?: number;
  start?: string;
  end?: string;
}

export async function fetchGraphVisualize(
  params: GraphVisualizeParams = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphVisualizeView> {
  const { keyword, window, limit = GRAPH_DEFAULT_LIMIT, start, end } = params;
  const cappedLimit = Math.min(limit, GRAPH_MAX_LIMIT);
  const url = new URL(buildChatlogApiUrl("/api/v1/graph/visualize", diagnosticOptions?.serviceBaseUrl));
  url.searchParams.set("limit", String(cappedLimit));
  if (keyword) url.searchParams.set("keyword", keyword);
  if (window) url.searchParams.set("window", window);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);

  const data = await requestJson(url.toString(), {
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph",
      method: "GET",
    }),
  });
  return adaptGraphVisualize(data, { visualizationCap: cappedLimit });
}
