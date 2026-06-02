import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptGraphStatus, type GraphStatusView } from "./graphAdapters";

export async function fetchGraphStatus(
  requestOptions?: RequestDiagnosticsOptions,
): Promise<GraphStatusView | null> {
  try {
    const data = await requestJson(`${GRAPH_BASE_URL}/api/v1/graph/status`, {
      timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "graph-status" }),
    });
    return adaptGraphStatus(data);
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status === 404) return null;
    throw error;
  }
}
