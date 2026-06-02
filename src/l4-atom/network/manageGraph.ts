import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptGraphActionResult, type GraphActionResult } from "./graphAdapters";

export type GraphAction = "rebuild" | "pause" | "resume";

export async function manageGraph(
  action: GraphAction,
  requestOptions?: RequestDiagnosticsOptions,
): Promise<GraphActionResult> {
  const data = await requestJson(`${GRAPH_BASE_URL}/api/v1/graph/${action}`, {
    method: "POST",
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    ...withRequestDiagnostics(requestOptions, {
      endpointFamily: "graph-action",
      method: "POST",
    }),
  });
  return adaptGraphActionResult(data);
}
