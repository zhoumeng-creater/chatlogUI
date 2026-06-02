import { SIDECAR_PORT } from "@/utils/constants";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export interface DbReadyResponse {
  ready: boolean;
  message: string;
  dbCount?: number;
}

export async function fetchDbReady(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<DbReadyResponse> {
  try {
    const json = await requestJson<{ message?: string; dbCount?: number }>(`${BASE_URL}/api/v1/db`, {
      timeoutMs: 10000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "db",
        method: "GET",
      }),
    });
    return {
      ready: true,
      message: json.message ?? "数据库就绪",
      dbCount: json.dbCount,
    };
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status === 503) {
      return { ready: false, message: "数据库正在初始化" };
    }
    if (error instanceof ChatlogHttpError && error.status !== null) {
      throw new Error(`服务器返回错误 HTTP ${error.status}`);
    }
    if (error instanceof ChatlogHttpError && error.message === "请求超时") {
      return { ready: false, message: "数据库状态检查超时" };
    }
    return { ready: false, message: "无法连接数据库服务" };
  }
}
