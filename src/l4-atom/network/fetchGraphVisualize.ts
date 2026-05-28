import {
  GRAPH_BASE_URL,
  GRAPH_DEFAULT_LIMIT,
  GRAPH_MAX_LIMIT,
  GRAPH_FETCH_TIMEOUT_MS,
} from "@/utils/constants";
import type { VisualizeResult, VisualizeParams } from "@/l2-coordinator/api-docs/graph";

export async function fetchGraphVisualize(
  params: VisualizeParams = {},
): Promise<VisualizeResult> {
  const { keyword, window, limit = GRAPH_DEFAULT_LIMIT, start, end } = params;
  const url = new URL(`${GRAPH_BASE_URL}/api/v1/graph/visualize`);
  url.searchParams.set("limit", String(Math.min(limit, GRAPH_MAX_LIMIT)));
  if (keyword) url.searchParams.set("keyword", keyword);
  if (window) url.searchParams.set("window", window);
  if (start) url.searchParams.set("start", start);
  if (end) url.searchParams.set("end", end);

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GRAPH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(url.toString(), { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`图谱可视化请求失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图谱数据请求超时");
    }
    throw error;
  }
}
