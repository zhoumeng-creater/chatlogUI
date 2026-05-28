import { SIDECAR_PORT } from "@/utils/constants";
import { ContactsResponse, ChatRoom } from "@l2/api-docs/contacts";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export async function fetchContacts(): Promise<ContactsResponse> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/contacts`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data as ContactsResponse;
    }
    return json as ContactsResponse;
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求通讯录数据超时");
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    throw new Error("无法获取通讯录数据");
  }
}

export async function fetchChatRooms(): Promise<ChatRoom[]> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(`${BASE_URL}/api/v1/chatrooms`, {
      method: "GET",
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`服务器返回错误 HTTP ${response.status}`);
    }

    const json = await response.json();
    if (json.data) {
      return json.data as ChatRoom[];
    }
    return json as ChatRoom[];
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("请求群聊数据超时");
    }
    if (error instanceof Error && error.message.startsWith("服务器返回错误")) {
      throw error;
    }
    throw new Error("无法获取群聊数据");
  }
}
