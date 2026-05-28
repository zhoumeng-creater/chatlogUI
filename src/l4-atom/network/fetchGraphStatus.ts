import { GRAPH_BASE_URL, GRAPH_FETCH_TIMEOUT_MS } from "@/utils/constants";
import type { GraphStatus } from "@/l2-coordinator/api-docs/graph";

export async function fetchGraphStatus(): Promise<GraphStatus | null> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), GRAPH_FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${GRAPH_BASE_URL}/api/v1/graph/status`,
      { signal: controller.signal },
    );
    clearTimeout(timeoutId);

    if (response.status === 404) return null;

    if (!response.ok) {
      throw new Error(`图谱状态查询失败: HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图谱状态查询超时");
    }
    throw error;
  }
}
