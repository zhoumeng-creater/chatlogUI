import { SIDECAR_PORT } from "@/utils/constants";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export interface DbReadyResponse {
  ready: boolean;
  message: string;
  dbCount?: number;
}

export async function fetchDbReady(): Promise<DbReadyResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/db`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.status === 503) {
      return { ready: false, message: "数据库正在初始化" };
    }

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    return {
      ready: true,
      message: json.message ?? "数据库就绪",
      dbCount: json.dbCount,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ready: false, message: "数据库状态检查超时" };
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    return { ready: false, message: "无法连接数据库服务" };
  }
}
