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
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphActionResult> {
  const data = await requestJson(`${GRAPH_BASE_URL}/api/v1/graph/${action}`, {
    method: "POST",
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph",
      method: "POST",
    }),
  });
  return adaptGraphActionResult(data);
}
