import { SIDECAR_PORT } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawSearchResponse } from "./chatlogRawTypes";
import { adaptSearchResponse } from "./chatlogAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

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
  requestOptions?: RequestDiagnosticsOptions,
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
    `${BASE_URL}/api/v1/search?${params.toString()}`,
    {
      timeoutMs: 20000,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "search" }),
    },
  );
  return adaptSearchResponse(raw);
}
