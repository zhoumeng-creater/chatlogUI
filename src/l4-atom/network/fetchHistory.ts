import { SIDECAR_PORT } from "@/utils/constants";
import { HistoryResponse, HistoryQueryParams } from "@l2/api-docs/history";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchHistory(params: HistoryQueryParams): Promise<HistoryResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 30000);

  try {
    const searchParams = new URLSearchParams();
    searchParams.set("chat", params.chat);
    if (params.limit !== undefined) searchParams.set("limit", String(params.limit));
    if (params.offset !== undefined) searchParams.set("offset", String(params.offset));

    const response = await fetch(`${BASE_URL}/api/v1/history?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data as HistoryResponse;
    }
    return json as HistoryResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求聊天记录超时");
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    throw new Error("无法获取聊天记录");
  }
}
