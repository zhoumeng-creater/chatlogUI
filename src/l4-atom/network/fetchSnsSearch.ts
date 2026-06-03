import { SIDECAR_PORT } from "@/utils/constants";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawSnsSearchResponse } from "./chatlogRawTypes";
import { adaptSnsSearchResponse } from "./snsAdapters";
import { snsBaseParams, type FetchSnsFeedOptions } from "./fetchSnsFeed";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

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
      url: `${BASE_URL}/api/v1/sns_search`,
    });
  }

  const params = snsBaseParams(options);
  params.set("keyword", keyword);
  const raw = await requestJson<RawSnsSearchResponse>(`${BASE_URL}/api/v1/sns_search?${params}`, {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "sns_search",
      method: "GET",
    }),
  });

  return adaptSnsSearchResponse(raw);
}
