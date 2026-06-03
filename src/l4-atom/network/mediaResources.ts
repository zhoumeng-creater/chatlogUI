import { SIDECAR_PORT } from "@/utils/constants";
import type { RawMediaInfo } from "./chatlogRawTypes";
import {
  createHttpDiagnosticEvent,
  type DiagnosticEvent,
  type DiagnosticRecoveryHint,
} from "./diagnosticEvents";
import {
  ChatlogHttpError,
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { MediaEndpointFamily } from "./mediaAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export interface MediaResourceInput {
  endpointFamily: MediaEndpointFamily;
  key: string;
}

export interface MediaBlobResult {
  blob: Blob;
  mimeType: string;
}

interface MediaBlobOptions extends RequestDiagnosticsOptions {
  signal?: AbortSignal;
  timeoutMs?: number;
}

export async function fetchMediaInfo(
  input: MediaResourceInput,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<RawMediaInfo> {
  const params = new URLSearchParams();
  params.set("info", "1");

  return requestJson<RawMediaInfo>(
    `${BASE_URL}/${input.endpointFamily}/${encodeURIComponent(input.key)}?${params.toString()}`,
    withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: input.endpointFamily,
      method: "GET",
    }),
  );
}

export async function fetchMediaBlob(
  input: MediaResourceInput,
  options: MediaBlobOptions = {},
): Promise<MediaBlobResult> {
  const {
    diagnostics,
    onDiagnosticEvent,
    signal: callerSignal,
    timeoutMs = 30000,
  } = options;
  const url = `${BASE_URL}/${input.endpointFamily}/${encodeURIComponent(input.key)}`;
  const controller = new AbortController();
  const abortState: { reason: "timeout" | "abort" } = { reason: "timeout" };
  const startedAt = nowMs();
  const timeoutId = setTimeout(() => abortWithReason("timeout"), timeoutMs);

  function abortWithReason(reason: "timeout" | "abort") {
    if (controller.signal.aborted) return;
    abortState.reason = reason;
    controller.abort();
  }

  function abortFromCaller() {
    abortWithReason("abort");
  }

  function emit(status: number | null, errorKind?: "http-status" | "timeout" | "abort" | "network") {
    emitMediaDiagnosticEvent({
      endpointFamily: input.endpointFamily,
      method: "GET",
      status,
      errorKind,
      durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
      correlationId: diagnostics?.correlationId,
      recoveryHint: diagnostics?.recoveryHint,
      onDiagnosticEvent,
    });
  }

  if (callerSignal?.aborted) {
    abortWithReason("abort");
  } else {
    callerSignal?.addEventListener("abort", abortFromCaller, { once: true });
  }

  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      emit(response.status, "http-status");
      throw new ChatlogHttpError(`HTTP ${response.status}`, {
        status: response.status,
        body: null,
        url,
      });
    }

    const blob = await response.blob();
    emit(response.status);
    return {
      blob,
      mimeType: response.headers.get("content-type") ?? blob.type,
    };
  } catch (error) {
    if (error instanceof ChatlogHttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      const reason = abortState.reason;
      emit(null, reason);
      throw new ChatlogHttpError(reason === "abort" ? "请求已取消" : "请求超时", {
        status: null,
        body: null,
        url,
      });
    }

    emit(null, "network");
    throw error;
  } finally {
    clearTimeout(timeoutId);
    callerSignal?.removeEventListener("abort", abortFromCaller);
  }
}

function emitMediaDiagnosticEvent(input: {
  endpointFamily: MediaEndpointFamily;
  method: string;
  status: number | null;
  durationMs: number;
  errorKind?: "http-status" | "timeout" | "abort" | "network";
  correlationId?: string;
  recoveryHint?: DiagnosticRecoveryHint;
  onDiagnosticEvent?: (event: DiagnosticEvent) => void;
}) {
  input.onDiagnosticEvent?.(
    createHttpDiagnosticEvent({
      endpointFamily: input.endpointFamily,
      method: input.method,
      status: input.status,
      durationMs: input.durationMs,
      errorKind: input.errorKind,
      correlationId: input.correlationId,
      recoveryHint: input.recoveryHint,
    }),
  );
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}
