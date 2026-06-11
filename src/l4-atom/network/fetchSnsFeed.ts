import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawSnsFeedResponse } from "./chatlogRawTypes";
import { adaptSnsFeedResponse } from "./snsAdapters";

export interface FetchSnsFeedOptions {
  limit?: number;
  user?: string;
  time?: string;
  since?: string;
  until?: string;
  media?: boolean;
  replace?: boolean;
}

export async function fetchSnsFeed(
  options: FetchSnsFeedOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = snsBaseParams(options);
  const raw = await requestJson<RawSnsFeedResponse>(buildChatlogApiUrl(`/api/v1/sns_feed?${params}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "sns_feed",
      method: "GET",
    }),
  });

  return adaptSnsFeedResponse(raw);
}

export function snsBaseParams(options: FetchSnsFeedOptions): URLSearchParams {
  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("media", options.media === false ? "0" : "1");
  params.set("replace", options.replace === false ? "0" : "1");
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.user) params.set("user", options.user);
  if (options.time) params.set("time", options.time);
  if (options.since) params.set("since", options.since);
  if (options.until) params.set("until", options.until);
  return params;
}
