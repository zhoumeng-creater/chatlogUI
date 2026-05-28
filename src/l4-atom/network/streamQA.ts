import { AI_BASE_URL, SSE_TIMEOUT_MS } from '@/utils/constants';
import type { QARequest, SSEChunk } from '@/l2-coordinator/api-docs/semantic';

type ChunkCallback = (chunk: SSEChunk) => void;
type ErrorCallback = (error: Error) => void;

export function streamQA(
  params: QARequest,
  onChunk: ChunkCallback,
  onError: ErrorCallback,
  signal?: AbortSignal
): void {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), SSE_TIMEOUT_MS);

  const combinedSignal = signal
    ? combineSignals(signal, controller.signal)
    : controller.signal;

  fetch(`${AI_BASE_URL}/api/v1/semantic/qa/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: combinedSignal,
  })
    .then((response) => {
      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`QA 流请求失败: HTTP ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('无法读取响应流');

      const decoder = new TextDecoder();
      let buffer = '';

      function processStream() {
        reader!.read().then(({ done, value }) => {
          if (done) {
            onChunk({ type: 'done' });
            return;
          }

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');

          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data: SSEChunk = JSON.parse(line.slice(6));
                onChunk(data);
              } catch {
                // skip non-JSON lines
              }
            }
          }

          processStream();
        }).catch((err) => {
          if (err.name !== 'AbortError') {
            onError(err instanceof Error ? err : new Error(String(err)));
          }
        });
      }

      processStream();
    })
    .catch((err) => {
      clearTimeout(timeoutId);
      if (err.name !== 'AbortError') {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    });
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
