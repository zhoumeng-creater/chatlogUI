import { HEALTH_CHECK_URL } from "@/utils/constants";

interface DbStatusResponse {
  ok: boolean;
  message: string;
}

export async function fetchDbStatus(): Promise<DbStatusResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 5000);

  try {
    const response = await fetch(HEALTH_CHECK_URL, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (response.ok) {
      return { ok: true, message: "引擎连接正常" };
    }

    return { ok: false, message: `HTTP ${response.status}` };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      return { ok: false, message: "健康检查超时" };
    }
    return { ok: false, message: "无法连接到引擎" };
  }
}
