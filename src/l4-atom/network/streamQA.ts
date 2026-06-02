import { AI_BASE_URL, SSE_TIMEOUT_MS } from '@/utils/constants';
import { createDiagnosticEvent } from "./diagnosticEvents";
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
  requestOptions?: RequestDiagnosticsOptions,
): StreamQAHandle {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);
  const startedAt = nowMs();
  const endpointFamily = requestOptions?.diagnostics?.endpointFamily ?? "semantic-qa-stream";

  const emitLifecycleEvent = (
    category: string,
    level: "info" | "warn" | "error",
    summary: string,
    attributes: Record<string, unknown> = {},
  ) => {
    requestOptions?.onDiagnosticEvent?.(
      createDiagnosticEvent({
        source: "http",
        level,
        category,
        summary,
        correlationId: requestOptions.diagnostics?.correlationId,
        recoveryHint: requestOptions.diagnostics?.recoveryHint,
        attributes: {
          endpointFamily,
          method: "POST",
          durationMs: Math.max(0, Math.round(nowMs() - startedAt)),
          ...attributes,
        },
      }),
    );
  };

  const combinedSignal = signal
    ? combineSignals(signal, controller.signal)
    : controller.signal;

  emitLifecycleEvent(
    "http.stream.start",
    "info",
    "POST semantic-qa-stream started",
  );

  fetch(`${AI_BASE_URL}/api/v1/semantic/qa/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSemanticQARequestPayload(params)),
    signal: combinedSignal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        emitLifecycleEvent(
          "http.stream.error",
          "warn",
          `POST semantic-qa-stream failed with HTTP ${response.status}`,
          {
            status: response.status,
            errorKind: "http-status",
            retryable: response.status >= 500,
          },
        );
        throw new Error(`QA 流请求失败: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      const parser = createSemanticSSEParser();
      let completed = false;
      const forwardEvent = (event: SemanticStreamEvent) => {
        onChunk(event);
        if (event.type === "done" && !completed) {
          completed = true;
          emitLifecycleEvent(
            "http.stream.done",
            "info",
            "POST semantic-qa-stream completed",
            {
              status: response.status,
            },
          );
        }
      };

      try {
        let reading = true;
        while (reading) {
          const { done, value } = await reader.read();
          if (done) {
            for (const event of parser.flush()) forwardEvent(event);
            reading = false;
            continue;
          }

          const text = decoder.decode(value, { stream: true });
          for (const event of parser.push(text)) forwardEvent(event);
        }
      } catch (err) {
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          emitLifecycleEvent(
            "http.stream.error",
            "error",
            "POST semantic-qa-stream failed while reading",
            {
              status: response.status,
              errorKind: "network",
              retryable: true,
            },
          );
          onError(err instanceof Error ? err : new Error(String(err)));
        } else {
          emitLifecycleEvent(
            "http.stream.abort",
            "warn",
            "POST semantic-qa-stream was cancelled",
            {
              status: response.status,
              errorKind: "abort",
              retryable: false,
            },
          );
        }
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        emitLifecycleEvent(
          "http.stream.error",
          "error",
          "POST semantic-qa-stream failed",
          {
            errorKind: "network",
            retryable: true,
          },
        );
        onError(err instanceof Error ? err : new Error(String(err)));
      } else {
        emitLifecycleEvent(
          "http.stream.abort",
          "warn",
          "POST semantic-qa-stream was cancelled",
          {
            errorKind: "abort",
            retryable: false,
          },
        );
      }
    });

  return {
    cancel: () => controller.abort(),
  };
}

function nowMs(): number {
  return globalThis.performance?.now?.() ?? Date.now();
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
