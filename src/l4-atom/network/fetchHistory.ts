import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawHistoryResponse } from "./chatlogRawTypes";
import { adaptHistoryResponse } from "./chatlogAdapters";

export interface FetchHistoryOptions {
  chat: string;
  limit?: number;
  offset?: number;
  time?: string;
  since?: number;
  until?: number;
  msgType?: string;
  subType?: string;
  hour?: number;
  isSelf?: boolean;
  hasMedia?: boolean;
}

export async function fetchHistory(
  options: FetchHistoryOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("chat", options.chat);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.time) params.set("time", options.time);
  if (options.since !== undefined) params.set("since", String(options.since));
  if (options.until !== undefined) params.set("until", String(options.until));
  if (options.msgType) params.set("msg_type", options.msgType);
  if (options.subType) params.set("sub_type", options.subType);
  if (options.hour !== undefined) params.set("hour", String(options.hour));
  if (options.isSelf !== undefined) params.set("is_self", options.isSelf ? "1" : "0");
  if (options.hasMedia !== undefined) params.set("has_media", options.hasMedia ? "1" : "0");

  const raw = await requestJson<RawHistoryResponse>(
    buildChatlogApiUrl(`/api/v1/history?${params.toString()}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 30000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "history",
        method: "GET",
      }),
    },
  );
  return adaptHistoryResponse(raw);
}
