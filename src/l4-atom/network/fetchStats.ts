import { SIDECAR_PORT } from "@/utils/constants";
import { StatsResponse, StatsQueryParams, TrendResponse } from "@l2/api-docs/stats";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchStats(params: StatsQueryParams): Promise<StatsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const searchParams = new URLSearchParams();
    searchParams.set("chat", params.chat);
    if (params.timeStart !== undefined) searchParams.set("timeStart", params.timeStart);
    if (params.timeEnd !== undefined) searchParams.set("timeEnd", params.timeEnd);

    const response = await fetch(`${BASE_URL}/api/v1/stats?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data as StatsResponse;
    }
    return json as StatsResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求统计数据超时");
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    throw new Error("无法获取统计数据");
  }
}

export async function fetchDashboardTrend(
  chat: string,
  timeStart?: string,
  timeEnd?: string,
): Promise<TrendResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const searchParams = new URLSearchParams();
    searchParams.set("chat", chat);
    if (timeStart !== undefined) searchParams.set("timeStart", timeStart);
    if (timeEnd !== undefined) searchParams.set("timeEnd", timeEnd);

    const response = await fetch(`${BASE_URL}/api/v1/dashboard/trend?${searchParams.toString()}`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data as TrendResponse;
    }
    return json as TrendResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求趋势数据超时");
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    throw new Error("无法获取趋势数据");
  }
}
