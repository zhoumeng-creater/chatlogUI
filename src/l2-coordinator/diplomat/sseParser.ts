import type { SSEChunk } from '@/l2-coordinator/api-docs/semantic';

export interface ParsedToken {
  type: 'token' | 'done' | 'error';
  content: string;
  error?: string;
}

export function parseSSEChunk(chunk: SSEChunk): ParsedToken {
  if (chunk.type === 'done') {
    return { type: 'done', content: '' };
  }

  if (chunk.type === 'error') {
    return {
      type: 'error',
      content: '',
      error: chunk.error || 'AI 引擎返回错误',
    };
  }

  if (chunk.type === 'token' && chunk.content) {
    return { type: 'token', content: chunk.content };
  }

  const content =
    chunk.content ||
    (chunk as unknown as Record<string, string>).text ||
    (chunk as unknown as Record<string, string>).message ||
    '';

  if (content) {
    return { type: 'token', content };
  }

  return { type: 'token', content: '' };
}

function isCJK(char: string): boolean {
  const code = char.charCodeAt(0);
  return (
    (code >= 0x4E00 && code <= 0x9FFF) ||
    (code >= 0x3400 && code <= 0x4DBF) ||
    (code >= 0xF900 && code <= 0xFAFF) ||
    (code >= 0x3040 && code <= 0x309F) ||
    (code >= 0x30A0 && code <= 0x30FF) ||
    (code >= 0xAC00 && code <= 0xD7AF)
  );
}

export function createTokenBuffer(flushIntervalMs = 50) {
  let buffer = '';
  let timer: ReturnType<typeof setTimeout> | null = null;

  return {
    feed(token: string, onFlush: (text: string) => void): void {
      if (token.length === 1 && isCJK(token)) {
        if (buffer) {
          onFlush(buffer);
          buffer = '';
        }
        onFlush(token);
        return;
      }

      buffer += token;

      if (/[\s，。！？；：、\n]/.test(token)) {
        if (timer) clearTimeout(timer);
        onFlush(buffer);
        buffer = '';
        return;
      }

      if (timer) clearTimeout(timer);
      timer = setTimeout(() => {
        if (buffer) {
          onFlush(buffer);
          buffer = '';
        }
      }, flushIntervalMs);
    },
    flush(onFlush: (text: string) => void): void {
      if (timer) clearTimeout(timer);
      if (buffer) {
        onFlush(buffer);
        buffer = '';
      }
    },
  };
}
