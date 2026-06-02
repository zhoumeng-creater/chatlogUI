import { HEALTH_CHECK_URL } from "@/utils/constants";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";

interface DbStatusResponse {
  ok: boolean;
  message: string;
}

export async function fetchDbStatus(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<DbStatusResponse> {
  try {
    await requestJson(HEALTH_CHECK_URL, {
      timeoutMs: 5000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "health",
        method: "GET",
      }),
    });
    return { ok: true, message: "引擎连接正常" };
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status !== null) {
      return { ok: false, message: `HTTP ${error.status}` };
    }
    if (error instanceof ChatlogHttpError && error.message === "请求超时") {
      return { ok: false, message: "健康检查超时" };
    }
    return { ok: false, message: "无法连接到引擎" };
  }
}
