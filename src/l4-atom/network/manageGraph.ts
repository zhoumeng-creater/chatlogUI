import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { requestJson } from "./httpClient";
import { adaptGraphActionResult, type GraphActionResult } from "./graphAdapters";

export type GraphAction = "rebuild" | "pause" | "resume";

export async function manageGraph(action: GraphAction): Promise<GraphActionResult> {
  const data = await requestJson(`${GRAPH_BASE_URL}/api/v1/graph/${action}`, {
    method: "POST",
    timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
  });
  return adaptGraphActionResult(data);
}
