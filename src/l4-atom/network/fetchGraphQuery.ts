import {
  GRAPH_BASE_URL,
  GRAPH_DEFAULT_LIMIT,
  GRAPH_MAX_LIMIT,
  GRAPH_FETCH_TIMEOUT_MS,
} from "@/utils/constants";
import type { QueryResult } from "@/l2-coordinator/api-docs/graph";

export async function fetchGraphQuery(
  keyword: string,
  limit: number = GRAPH_DEFAULT_LIMIT,
): Promise<QueryResult> {
  const url = new URL(`${GRAPH_BASE_URL}/api/v1/graph/query`);
  url.searchParams.set("keyword", keyword);
  url.searchParams.set("limit", String(Math.min(limit, GRAPH_MAX_LIMIT)));

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GRAPH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`图谱查询失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图谱查询超时");
    }
    throw error;
  }
}
