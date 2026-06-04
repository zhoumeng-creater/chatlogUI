import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptGraphActionResult, type GraphActionResult } from "./graphAdapters";

export type GraphAction = "rebuild" | "reset-rebuild" | "pause" | "resume";

export async function manageGraph(
  action: GraphAction,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphActionResult> {
  const endpoint = action === "reset-rebuild" ? "rebuild" : action;
  const rebuildBody = action === "rebuild" || action === "reset-rebuild"
    ? JSON.stringify({ reset: action === "reset-rebuild" })
    : undefined;
  const data = await requestJson(`${GRAPH_BASE_URL}/api/v1/graph/${endpoint}`, {
    method: "POST",
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
    ...(rebuildBody
      ? {
          headers: { "Content-Type": "application/json" },
          body: rebuildBody,
        }
      : {}),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "graph",
      method: "POST",
    }),
  });
  return adaptGraphActionResult(data);
}
