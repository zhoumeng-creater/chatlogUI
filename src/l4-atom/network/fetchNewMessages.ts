import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawNewMessagesResponse } from "./chatlogRawTypes";
import { adaptNewMessagesResponse } from "./mediaAdapters";

export interface FetchNewMessagesOptions {
  chat?: string;
  since?: number;
  limit?: number;
}

export async function fetchNewMessages(
  options: FetchNewMessagesOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("format", "json");
  if (options.chat) params.set("chat", options.chat);
  if (options.since !== undefined) params.set("since", String(options.since));
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  const qs = params.toString();

  const raw = await requestJson<RawNewMessagesResponse>(
    buildChatlogApiUrl(`/api/v1/new_messages${qs ? "?" + qs : ""}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "new_messages",
        method: "GET",
      }),
    },
  );

  return adaptNewMessagesResponse(raw);
}
