export interface OpenExternalUrlResult {
  ok: boolean;
  message: string;
}

export async function openExternalUrl(value: string): Promise<OpenExternalUrlResult> {
  const url = parseOpenableUrl(value);
  if (!url) {
    return { ok: false, message: "仅支持打开 HTTP/HTTPS 外部链接。" };
  }

  if (typeof window === "undefined" || typeof window.open !== "function") {
    return { ok: false, message: "当前环境不支持打开外部链接。" };
  }

  const opened = window.open(url.toString(), "_blank", "noopener,noreferrer");
  if (!opened) {
    return { ok: false, message: "外部链接打开被系统阻止，请稍后重试。" };
  }
  try {
    opened.opener = null;
  } catch {
    // Some WebViews expose a restricted WindowProxy after opening externally.
  }
  return { ok: true, message: "已请求系统打开外部链接。" };
}

function parseOpenableUrl(value: string): URL | null {
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url : null;
  } catch {
    return null;
  }
}
