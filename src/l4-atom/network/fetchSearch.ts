import { SIDECAR_PORT } from "@/utils/constants";
import { SearchResult, SearchQueryParams } from "@l2/api-docs/search";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchSearch(params: SearchQueryParams): Promise<SearchResult> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const searchParams = new URLSearchParams();
    searchParams.set("keyword", params.keyword);
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));
    if (params.chat !== undefined) searchParams.set("chat", params.chat);
    if (params.timeStart !== undefined) searchParams.set("timeStart", params.timeStart);
    if (params.timeEnd !== undefined) searchParams.set("timeEnd", params.timeEnd);
    if (params.type !== undefined) searchParams.set("type", params.type);

    const response = await fetch(`${BASE_URL}/api/v1/search?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data as SearchResult;
    }
    return json as SearchResult;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求搜索结果超时");
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    throw new Error("无法获取搜索结果");
  }
}
