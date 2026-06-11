import { GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { adaptGraphStatus, type GraphStatusView } from "./graphAdapters";

export async function fetchGraphStatus(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<GraphStatusView | null> {
  try {
    const data = await requestJson(buildChatlogApiUrl("/api/v1/graph/status", diagnosticOptions?.serviceBaseUrl), {
      timeoutMs: GRAPH_FETCH_TIMEOUT_MS,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "graph",
        method: "GET",
      }),
    });
    return adaptGraphStatus(data);
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status === 404) return null;
    throw error;
  }
}
