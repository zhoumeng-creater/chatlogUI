import { SIDECAR_PORT } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawUnreadResponse } from "./chatlogRawTypes";
import { adaptUnreadResponse } from "./mediaAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchUnread(diagnosticOptions?: RequestDiagnosticsOptions) {
  const raw = await requestJson<RawUnreadResponse>(`${BASE_URL}/api/v1/unread?format=json`, {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "unread",
      method: "GET",
    }),
  });

  return adaptUnreadResponse(raw);
}
