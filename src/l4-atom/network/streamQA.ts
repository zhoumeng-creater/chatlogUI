import { AI_BASE_URL, SSE_TIMEOUT_MS } from '@/utils/constants';
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
  signal?: AbortSignal
): StreamQAHandle {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);

  const combinedSignal = signal
    ? combineSignals(signal, controller.signal)
    : controller.signal;

  fetch(`${AI_BASE_URL}/api/v1/semantic/qa/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(buildSemanticQARequestPayload(params)),
    signal: combinedSignal,
  })
    .then(async (response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`QA 流请求失败: HTTP ${response.status}`);
      }

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
        if (!(err instanceof DOMException && err.name === 'AbortError')) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      }
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (!(err instanceof DOMException && err.name === 'AbortError')) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    });

  return {
    cancel: () => controller.abort(),
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
