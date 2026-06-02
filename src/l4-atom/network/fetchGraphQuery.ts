import {
  GRAPH_BASE_URL,
  GRAPH_DEFAULT_LIMIT,
  GRAPH_MAX_LIMIT,
  GRAPH_FETCH_TIMEOUT_MS,
} from "@/utils/constants";
import { requestJson } from "./httpClient";
import { adaptGraphQuery, type GraphQueryView } from "./graphAdapters";

interface GraphQueryParams {
  keyword?: string;
  entity?: string;
  relation?: string;
  window?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export async function fetchGraphQuery(
  params: GraphQueryParams | string = {},
  legacyLimit?: number,
): Promise<GraphQueryView> {
  const options: GraphQueryParams =
    typeof params === "string" ? { keyword: params, limit: legacyLimit } : params;
  const limit = Math.min(options.limit ?? GRAPH_DEFAULT_LIMIT, GRAPH_MAX_LIMIT);
  const url = new URL(`${GRAPH_BASE_URL}/api/v1/graph/query`);
  url.searchParams.set("limit", String(limit));
  if (options.keyword) url.searchParams.set("keyword", options.keyword);
  if (options.entity) url.searchParams.set("entity", options.entity);
  if (options.relation) url.searchParams.set("relation", options.relation);
  if (options.window) url.searchParams.set("window", options.window);
  if (options.start) url.searchParams.set("start", options.start);
  if (options.end) url.searchParams.set("end", options.end);

  const data = await requestJson(url.toString(), { timeoutMs: GRAPH_FETCH_TIMEOUT_MS });
  return adaptGraphQuery(data);
}
