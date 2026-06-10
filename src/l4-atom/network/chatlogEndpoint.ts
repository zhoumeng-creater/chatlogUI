export const DEFAULT_CHATLOG_SERVICE_BASE_URL = "http://127.0.0.1:5030";

export interface ValidChatlogServiceBaseUrl {
  ok: true;
  baseUrl: string;
  host: string;
  port: number;
}

export interface InvalidChatlogServiceBaseUrl {
  ok: false;
  error: string;
}

export type ChatlogServiceBaseUrlValidation =
  | ValidChatlogServiceBaseUrl
  | InvalidChatlogServiceBaseUrl;

export class ChatlogEndpointError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ChatlogEndpointError";
  }
}

export interface ChatlogServiceBaseUrlOptions {
  serviceBaseUrl?: string;
}

export function validateChatlogServiceBaseUrl(
  value: string | null | undefined,
): ChatlogServiceBaseUrlValidation {
  const raw = value?.trim();
  if (!raw) {
    return {
      ok: false,
      error: "请输入本机 chatlog 服务地址，例如 127.0.0.1:5030",
    };
  }

  const candidate = /^https?:\/\//i.test(raw) ? raw : `http://${raw}`;
  let url: URL;
  try {
    url = new URL(candidate);
  } catch {
    return {
      ok: false,
      error: "服务地址格式不正确，请输入本机地址和端口，例如 127.0.0.1:5030",
    };
  }

  if (url.protocol !== "http:") {
    return {
      ok: false,
      error: "当前版本仅支持 HTTP 本机 chatlog 服务",
    };
  }

  if (url.pathname !== "/" || url.search || url.hash) {
    return {
      ok: false,
      error: "服务地址只填写 origin，不要包含路径、查询参数或片段",
    };
  }

  if (!isLoopbackHost(url.hostname)) {
    return {
      ok: false,
      error: "当前版本只支持本机 chatlog 服务地址",
    };
  }

  const port = Number(url.port);
  if (!Number.isInteger(port) || port <= 0 || port > 65535) {
    return {
      ok: false,
      error: "服务地址需要包含有效端口，例如 127.0.0.1:5030",
    };
  }

  return {
    ok: true,
    baseUrl: url.origin,
    host: url.hostname,
    port,
  };
}

export function normalizeChatlogServiceBaseUrl(value: string | null | undefined): string {
  const validation = validateChatlogServiceBaseUrl(value);
  if (!validation.ok) {
    throw new ChatlogEndpointError(validation.error);
  }
  return validation.baseUrl;
}

export function getChatlogServiceBaseUrl(
  options?: ChatlogServiceBaseUrlOptions,
): string {
  return normalizeChatlogServiceBaseUrl(
    options?.serviceBaseUrl ?? DEFAULT_CHATLOG_SERVICE_BASE_URL,
  );
}

export function buildChatlogApiUrl(
  endpointPath: string,
  serviceBaseUrl?: string,
): string {
  const baseUrl = normalizeChatlogServiceBaseUrl(
    serviceBaseUrl ?? DEFAULT_CHATLOG_SERVICE_BASE_URL,
  );
  const path = endpointPath.startsWith("/") ? endpointPath : `/${endpointPath}`;
  const url = new URL(path, baseUrl);
  return url.toString();
}

export function formatChatlogServiceLabel(value: string | null | undefined): string {
  const validation = validateChatlogServiceBaseUrl(value ?? DEFAULT_CHATLOG_SERVICE_BASE_URL);
  if (!validation.ok) {
    return "本机服务未配置";
  }
  return `本机服务 ${validation.host}:${validation.port}`;
}

export function sameChatlogServiceOrigin(a: string, b: string): boolean {
  return normalizeChatlogServiceBaseUrl(a) === normalizeChatlogServiceBaseUrl(b);
}

function isLoopbackHost(host: string): boolean {
  const normalized = host.toLowerCase();
  return normalized === "localhost" || normalized === "127.0.0.1" || normalized === "::1" || normalized === "[::1]";
}
