import { GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawGraphActionResponse } from "./chatlogRawTypes";
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
  const data = await requestJson<RawGraphActionResponse>(buildChatlogApiUrl(`/api/v1/graph/${endpoint}`, diagnosticOptions?.serviceBaseUrl), {
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
