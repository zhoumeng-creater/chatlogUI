import { SIDECAR_PORT } from "@/utils/constants";
import { requestJson } from "./httpClient";
import type {
  RawSessionsResponse,
  RawContactsResponse,
  RawChatRoomsResponse,
} from "./chatlogRawTypes";
import { mergeConversations } from "./chatlogAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export interface FetchConversationsOptions {
  limit?: number;
  offset?: number;
  query?: string;
  isFriend?: boolean;
}

export async function fetchSessions(options: FetchConversationsOptions = {}): Promise<RawSessionsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.query) params.set("query", options.query);

  const qs = params.toString();
  return requestJson<RawSessionsResponse>(`${BASE_URL}/api/v1/sessions${qs ? "?" + qs : ""}`, { timeoutMs: 15000 });
}

export async function fetchContactsApi(options: FetchConversationsOptions = {}): Promise<RawContactsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("query", options.query);
  if (options.isFriend !== undefined) params.set("is_friend", String(options.isFriend));

  const qs = params.toString();
  return requestJson<RawContactsResponse>(`${BASE_URL}/api/v1/contacts${qs ? "?" + qs : ""}`, { timeoutMs: 15000 });
}

export async function fetchChatRoomsApi(options: FetchConversationsOptions = {}): Promise<RawChatRoomsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("query", options.query);

  const qs = params.toString();
  return requestJson<RawChatRoomsResponse>(`${BASE_URL}/api/v1/chatrooms${qs ? "?" + qs : ""}`, { timeoutMs: 15000 });
}

export async function fetchConversations(options: FetchConversationsOptions = {}) {
  const [sessions, contacts, chatrooms] = await Promise.all([
    fetchSessions(options),
    fetchContactsApi(options),
    fetchChatRoomsApi(options),
  ]);

  return {
    conversations: mergeConversations(sessions, contacts, chatrooms),
    contacts,
    chatrooms,
  };
}
