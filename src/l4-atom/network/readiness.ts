import {
  requestJson,
  ChatlogHttpError,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import {
  ChatlogEndpointError,
  buildChatlogApiUrl,
  normalizeChatlogServiceBaseUrl,
} from "./chatlogEndpoint";

export interface HealthResponse {
  status?: string;
  ok?: boolean;
}

export interface DbReadiness {
  ready: boolean;
  status: "ready" | "initializing" | "unreachable" | "error";
  message: string;
  detail?: string;
}

export function normalizeServiceBaseUrl(value: string): string {
  return normalizeChatlogServiceBaseUrl(value);
}

export async function fetchHealth(
  baseUrl: string,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<boolean> {
  try {
    const result = await requestJson<HealthResponse>(buildChatlogApiUrl("/health", baseUrl), {
      timeoutMs: 5000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "health",
        method: "GET",
      }),
    });
    return result.status === "ok" || result.ok === true;
  } catch (error) {
    if (error instanceof ChatlogEndpointError) throw error;
    return false;
  }
}

export async function fetchDbReadiness(
  baseUrl: string,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<DbReadiness> {
  try {
    await requestJson(buildChatlogApiUrl("/api/v1/db", baseUrl), {
      timeoutMs: 10000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "db",
        method: "GET",
      }),
    });
    return { ready: true, status: "ready", message: "数据库就绪" };
  } catch (error) {
    if (error instanceof ChatlogHttpError && error.status === 503) {
      return {
        ready: false,
        status: "initializing",
        message: "服务已启动，数据库尚未就绪",
        detail: error.body ?? undefined,
      };
    }
    if (error instanceof ChatlogHttpError) {
      return {
        ready: false,
        status: error.status === null ? "unreachable" : "error",
        message: formatReadinessFailureMessage(error, "database"),
        detail: error.body ?? undefined,
      };
    }
    return {
      ready: false,
      status: "error",
      message: formatReadinessFailureMessage(error, "database"),
    };
  }
}

export function formatReadinessFailureMessage(
  error: unknown,
  scope: "service" | "database",
): string {
  if (error instanceof ChatlogEndpointError) return error.message;

  if (scope === "service") {
    return "无法连接到本机 chatlog 服务，请检查服务地址或服务进程后重试。";
  }

  if (error instanceof ChatlogHttpError && error.status === null) {
    return "无法连接到数据库状态接口，请确认本机服务仍在运行。";
  }

  return "数据库状态检查失败，请稍后重试或查看诊断信息。";
}

export function pollReadiness(
  baseUrl: string,
  intervalMs: number,
  onUpdate: (readiness: DbReadiness) => void,
  signal?: AbortSignal,
): () => void {
  let timer: ReturnType<typeof setInterval>;
  let stopped = false;

  const tick = () => {
    fetchDbReadiness(baseUrl).then(onUpdate).catch(() => {});
    if (!stopped && !signal?.aborted) {
      timer = setTimeout(tick, intervalMs);
    }
  };

  timer = setTimeout(tick, 0);

  const onAbort = () => {
    stopped = true;
    clearTimeout(timer);
  };
  signal?.addEventListener("abort", onAbort, { once: true });

  return () => {
    stopped = true;
    clearTimeout(timer);
    signal?.removeEventListener("abort", onAbort);
  };
}
