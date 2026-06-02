import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import { requestJson } from "./httpClient";
import { adaptGraphTimeline, type GraphTimelineView } from "./graphAdapters";

interface GraphTimelineParams {
  keyword?: string;
  window?: string;
  start?: string;
  end?: string;
  limit?: number;
}

export async function fetchGraphTimeline(
  params: GraphTimelineParams = {},
): Promise<GraphTimelineView> {
  const url = new URL(`${GRAPH_BASE_URL}/api/v1/graph/timeline`);
  if (params.keyword) url.searchParams.set("keyword", params.keyword);
  if (params.window) url.searchParams.set("window", params.window);
  if (params.start) url.searchParams.set("start", params.start);
  if (params.end) url.searchParams.set("end", params.end);
  if (params.limit !== undefined) url.searchParams.set("limit", String(params.limit));

  const data = await requestJson(url.toString(), { timeoutMs: GRAPH_FETCH_TIMEOUT_MS });
  return adaptGraphTimeline(data);
}
