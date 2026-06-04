import { AI_BASE_URL, SSE_TIMEOUT_MS } from '@/utils/constants';
import { createHttpDiagnosticEvent } from "./diagnosticEvents";
import type { RequestDiagnosticsOptions } from "./httpClient";
import type { SemanticQARequestInput } from "./semanticAdapters";
import {
  createSemanticSSEParser,
  type SemanticStreamEvent,
} from "./semanticStreamParser";
import { buildSemanticQARequestPayload } from "./semanticAdapters";

type ChunkCallback = (chunk: SemanticStreamEvent) => void;
type ErrorCallback = (error: Error) => void;

export interface StreamQAHandle {
  cancel: () => void;
}

export function streamQA(
  params: SemanticQARequestInput,
  onChunk: ChunkCallback,
  onError: ErrorCallback,
  signal?: AbortSignal,
  diagnosticOptions?: RequestDiagnosticsOptions,
): StreamQAHandle {
  const controller = new AbortController();
  let abortReason: "timeout" | "abort" = signal?.aborted ? "abort" : "timeout";
  const abortWithReason = (reason: "timeout" | "abort") => {
    abortReason = reason;
    controller.abort();
  };
  const timeoutId = setTimeout(() => abortWithReason("timeout"), SSE_TIMEOUT_MS);
  const startedAt = nowMs();
  const streamUrl = `${AI_BASE_URL}/api/v1/semantic/qa/stream`;
  const emitDiagnosticEvent = (
    status: number | null,
    errorKind?: "http-status" | "timeout" | "abort" | "network",
  ) => {
    diagnosticOptions?.onDiagnosticEvent?.(
      createHttpDiagnosticEvent({
        url: streamUrl,
        method: "POST",
        status,
        durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
        endpointFamily: diagnosticOptions.diagnostics?.endpointFamily ?? "semantic",
        correlationId: diagnosticOptions.diagnostics?.correlationId,
        recoveryHint: diagnosticOptions.diagnostics?.recoveryHint,
        errorKind,
      }),
    );
  };

  const combinedSignal = signal
    ? combineSignals(signal, controller.signal)
    : controller.signal;
  signal?.addEventListener("abort", () => {
    abortReason = "abort";
  }, { once: true });

  fetch(streamUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSemanticQARequestPayload(params)),
    signal: combinedSignal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        emitDiagnosticEvent(response.status, "http-status");
        throw new Error(`QA 流请求失败: HTTP ${response.status}`);
      }
      emitDiagnosticEvent(response.status);

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      const parser = createSemanticSSEParser();

      try {
        let reading = true;
        while (reading) {
          const { done, value } = await reader.read();
          if (done) {
            for (const event of parser.flush()) onChunk(event);
            reading = false;
            continue;
          }

          const text = decoder.decode(value, { stream: true });
          for (const event of parser.push(text)) onChunk(event);
        }
      } catch (err) {
        if (err instanceof DOMException && err.name === 'AbortError') {
          emitDiagnosticEvent(null, abortReason);
          if (abortReason === "timeout") onError(new Error("ESEMANTIC_TIMEOUT"));
          return;
        }
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err instanceof DOMException && err.name === 'AbortError') {
        emitDiagnosticEvent(null, abortReason);
        if (abortReason === "timeout") onError(new Error("ESEMANTIC_TIMEOUT"));
        return;
      }
      emitDiagnosticEvent(null, "network");
      onError(err instanceof Error ? err : new Error(String(err)));
    });

  return {
    cancel: () => abortWithReason("abort"),
  };
}

function combineSignals(...signals: AbortSignal[]): AbortSignal {
  const controller = new AbortController();
  for (const signal of signals) {
    if (signal.aborted) {
      controller.abort(signal.reason);
      return controller.signal;
    }
    signal.addEventListener('abort', () => controller.abort(signal.reason));
  }
  return controller.signal;
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
}
