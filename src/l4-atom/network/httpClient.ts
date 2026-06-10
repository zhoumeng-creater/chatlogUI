import {
  createHttpDiagnosticEvent,
  type DiagnosticEvent,
  type DiagnosticRecoveryHint,
} from "./diagnosticEvents";

export class ChatlogHttpError extends Error {
  readonly status: number | null;
  readonly body: string | null;
  readonly url: string;

  constructor(
    message: string,
    options: { status: number | null; body: string | null; url: string },
  ) {
    super(message);
    this.name = "ChatlogHttpError";
    this.status = options.status;
    this.body = options.body;
    this.url = options.url;
  }
}

export interface RequestJsonOptions extends RequestInit {
  timeoutMs?: number;
  serviceBaseUrl?: string;
  diagnostics?: {
    endpointFamily?: string;
    method?: string;
    correlationId?: string;
    recoveryHint?: DiagnosticRecoveryHint;
  };
  onDiagnosticEvent?: (event: DiagnosticEvent) => void;
}

export type RequestDiagnosticsOptions = Pick<
  RequestJsonOptions,
  "diagnostics" | "onDiagnosticEvent" | "serviceBaseUrl"
>;

export function withJsonFormat(rawUrl: string): string {
  const url = new URL(rawUrl);
  if (!url.searchParams.has("format")) {
    url.searchParams.set("format", "json");
  }
  return url.toString();
}

export async function requestJson<T = unknown>(
  url: string,
  options: RequestJsonOptions = {},
): Promise<T> {
  const {
    timeoutMs = 15000,
    diagnostics,
    onDiagnosticEvent,
    signal: callerSignal,
    ...fetchOptions
  } = options;
  delete (fetchOptions as { serviceBaseUrl?: string }).serviceBaseUrl;
  const controller = new AbortController();
  const abortState: { reason: "timeout" | "abort" } = { reason: "timeout" };
  const abortWithReason = (reason: "timeout" | "abort") => {
    if (controller.signal.aborted) return;
    abortState.reason = reason;
    controller.abort();
  };
  const timeoutId = setTimeout(() => abortWithReason("timeout"), timeoutMs);
  const abortFromCaller = () => abortWithReason("abort");
  if (callerSignal?.aborted) {
    abortWithReason("abort");
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }
  const finalUrl = withJsonFormat(url);
  const startedAt = nowMs();
  const method = (
    diagnostics?.method ??
    fetchOptions.method ??
    "GET"
  ).toUpperCase();

  const emitDiagnosticEvent = (event: Parameters<typeof createHttpDiagnosticEvent>[0]) => {
    onDiagnosticEvent?.(
      createHttpDiagnosticEvent({
        url: finalUrl,
        method,
        endpointFamily: diagnostics?.endpointFamily,
        correlationId: diagnostics?.correlationId,
        recoveryHint: diagnostics?.recoveryHint,
        durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
        ...event,
      }),
    );
  };

  try {
    const response = await fetch(finalUrl, {
      ...fetchOptions,
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      emitDiagnosticEvent({
        status: response.status,
        errorKind: "http-status",
      });
      throw new ChatlogHttpError(`HTTP ${response.status}`, {
        status: response.status,
        body,
        url: finalUrl,
      });
    }

    emitDiagnosticEvent({ status: response.status });
    return body ? (JSON.parse(body) as T) : ({} as T);
  } catch (error) {
    if (error instanceof ChatlogHttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      const abortReason = abortState.reason;
      emitDiagnosticEvent({
        status: null,
        errorKind: abortReason,
      });
      throw new ChatlogHttpError(abortReason === "abort" ? "请求已取消" : "请求超时", {
        status: null,
        body: null,
        url: finalUrl,
      });
    }
    emitDiagnosticEvent({
      status: null,
      errorKind: "network",
    });
    throw error;
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

export function withRequestDiagnostics(
  options: RequestDiagnosticsOptions | undefined,
  diagnostics: NonNullable<RequestJsonOptions["diagnostics"]>,
): RequestDiagnosticsOptions {
  const callerDiagnostics = options?.diagnostics;

  return {
    serviceBaseUrl: options?.serviceBaseUrl,
    diagnostics: {
      ...callerDiagnostics,
      ...diagnostics,
      endpointFamily: diagnostics.endpointFamily ?? callerDiagnostics?.endpointFamily,
      method: diagnostics.method ?? callerDiagnostics?.method,
      correlationId: callerDiagnostics?.correlationId ?? diagnostics.correlationId,
      recoveryHint: callerDiagnostics?.recoveryHint ?? diagnostics.recoveryHint,
    },
    onDiagnosticEvent: options?.onDiagnosticEvent,
  };
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}
