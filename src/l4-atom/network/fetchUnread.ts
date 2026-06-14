import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawUnreadResponse } from "./chatlogRawTypes";
import { adaptUnreadResponse } from "./mediaAdapters";

export async function fetchUnread(diagnosticOptions?: RequestDiagnosticsOptions) {
  const raw = await requestJson<RawUnreadResponse>(buildChatlogApiUrl("/api/v1/unread", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "unread",
      method: "GET",
    }),
  });

  return adaptUnreadResponse(raw);
}
