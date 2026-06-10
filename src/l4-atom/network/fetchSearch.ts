import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawSearchResponse } from "./chatlogRawTypes";
import { adaptSearchResponse } from "./chatlogAdapters";

export interface FetchSearchOptions {
  keyword: string;
  limit?: number;
  offset?: number;
  chats?: string[];
  time?: string;
  since?: number;
  until?: number;
  msgType?: string;
}

export async function fetchSearch(
  options: FetchSearchOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("keyword", options.keyword);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.chats && options.chats.length > 0) params.set("chats", options.chats.join(","));
  if (options.time) params.set("time", options.time);
  if (options.since !== undefined) params.set("since", String(options.since));
  if (options.until !== undefined) params.set("until", String(options.until));
  if (options.msgType) params.set("msg_type", options.msgType);

  const raw = await requestJson<RawSearchResponse>(
    buildChatlogApiUrl(`/api/v1/search?${params.toString()}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 20000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "search",
        method: "GET",
      }),
    },
  );
  return adaptSearchResponse(raw);
}
