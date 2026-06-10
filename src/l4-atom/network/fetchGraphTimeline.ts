import { GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptGraphTimeline, type GraphTimelineView } from "./graphAdapters";

interface GraphTimelineParams {
  keyword?: string;
  window?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export async function fetchGraphTimeline(
  params: GraphTimelineParams = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphTimelineView> {
  const url = new URL(buildChatlogApiUrl("/api/v1/graph/timeline", diagnosticOptions?.serviceBaseUrl));
  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.window) url.searchParams.set("window", params.window);
  if (params.start) url.searchParams.set("start", params.start);
  if (params.end) url.searchParams.set("end", params.end);
  if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));

  const data = await requestJson(url.toString(), {
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph",
      method: "GET",
    }),
  });
  return adaptGraphTimeline(data);
}
