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
}

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
  const controller = new AbortController();
  const timeoutId = setTimeout(
    () => controller.abort(),
    options.timeoutMs ?? 15000,
  );
  const finalUrl = withJsonFormat(url);

  try {
    const response = await fetch(finalUrl, {
      ...options,
      signal: controller.signal,
    });
    const body = await response.text();

    if (!response.ok) {
      throw new ChatlogHttpError(`HTTP ${response.status}`, {
        status: response.status,
        body,
        url: finalUrl,
      });
    }

    return body ? (JSON.parse(body) as T) : ({} as T);
  } catch (error) {
    if (error instanceof ChatlogHttpError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ChatlogHttpError("请求超时", {
        status: null,
        body: null,
        url: finalUrl,
      });
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}
