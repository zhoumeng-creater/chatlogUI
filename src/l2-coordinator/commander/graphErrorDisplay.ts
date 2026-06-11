import { ChatlogHttpError } from "@l4/network";

export function formatGraphFailureMessage(error: unknown, fallback: string): string {
  if (isHttpStatusError(error)) {
    return `${fallback}，请检查本地服务状态后重试。`;
  }

  if (isNetworkError(error)) {
    return `${fallback}，请确认本地服务可用后重试。`;
  }

  return fallback;
}

function isHttpStatusError(error: unknown): boolean {
  if (error instanceof ChatlogHttpError && error.status !== null) return true;
  return error instanceof Error && /^HTTP\s+\d{3}\b/i.test(error.message.trim());
}

function isNetworkError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  return /fetch|network|failed|timeout|超时|连接|service/i.test(error.message);
}
