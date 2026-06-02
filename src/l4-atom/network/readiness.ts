import {
  requestJson,
  ChatlogHttpError,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";

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
  const trimmed = value.trim().replace(/\/+$/, "");
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }
  return `http://${trimmed}`;
}

export async function fetchHealth(
  baseUrl: string,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<boolean> {
  const result = await requestJson<HealthResponse>(`${normalizeServiceBaseUrl(baseUrl)}/health`, {
    timeoutMs: 5000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "health",
      method: "GET",
    }),
  });
  return result.status === "ok" || result.ok === true;
}

export async function fetchDbReadiness(
  baseUrl: string,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<DbReadiness> {
  try {
    await requestJson(`${normalizeServiceBaseUrl(baseUrl)}/api/v1/db`, {
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
        message: "服务已启动，但数据库尚未就绪",
        detail: error.body ?? undefined,
      };
    }
    if (error instanceof ChatlogHttpError) {
      return {
        ready: false,
        status: error.status === null ? "unreachable" : "error",
        message: error.message,
        detail: error.body ?? undefined,
      };
    }
    return { ready: false, status: "error", message: String(error) };
  }
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
