export interface OverloadInfo {
  overloaded: boolean;
  message: string;
  retryAfterMs: number;
}

export function checkOverload(status: number, _body?: string): OverloadInfo {
  if (status === 503) {
    return {
      overloaded: true,
      message: 'AI 引擎处理繁忙，请稍后重试',
      retryAfterMs: 5000,
    };
  }

  if (status === 429) {
    return {
      overloaded: true,
      message: '请求过于频繁，请稍后重试',
      retryAfterMs: 3000,
    };
  }

  return { overloaded: false, message: '', retryAfterMs: 0 };
}

export async function withOverloadRetry<T>(
  fn: () => Promise<T>,
  maxRetries = 2
): Promise<T> {
  let lastError: unknown;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (error instanceof Error && error.message.includes('HTTP 503')) {
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }

      if (error instanceof Error && error.message.includes('HTTP 429')) {
        if (i < maxRetries) {
          await new Promise((r) => setTimeout(r, 3000));
          continue;
        }
      }

      throw error;
    }
  }

  throw lastError;
}
