import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawSnsSearchResponse } from "./chatlogRawTypes";
import { adaptSnsSearchResponse } from "./snsAdapters";
import { snsBaseParams, type FetchSnsFeedOptions } from "./fetchSnsFeed";

export interface FetchSnsSearchOptions extends FetchSnsFeedOptions {
  keyword: string;
}

export async function fetchSnsSearch(
  options: FetchSnsSearchOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const keyword = options.keyword.trim();
  if (!keyword) {
    throw new ChatlogHttpError("SNS search keyword is required", {
      status: null,
      body: null,
      url: buildChatlogApiUrl("/api/v1/sns_search", diagnosticOptions?.serviceBaseUrl),
    });
  }

  const params = snsBaseParams(options);
  params.set("keyword", keyword);
  const raw = await requestJson<RawSnsSearchResponse>(buildChatlogApiUrl(`/api/v1/sns_search?${params}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "sns_search",
      method: "GET",
    }),
  });

  return adaptSnsSearchResponse(raw);
}
