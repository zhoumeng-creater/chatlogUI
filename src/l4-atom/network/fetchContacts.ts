import { SIDECAR_PORT } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
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

export async function fetchSessions(
  options: FetchConversationsOptions = {},
  requestOptions?: RequestDiagnosticsOptions,
): Promise<RawSessionsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.query) params.set("query", options.query);

  const qs = params.toString();
  return requestJson<RawSessionsResponse>(
    `${BASE_URL}/api/v1/sessions${qs ? "?" + qs : ""}`,
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "sessions" }),
    },
  );
}

export async function fetchContactsApi(
  options: FetchConversationsOptions = {},
  requestOptions?: RequestDiagnosticsOptions,
): Promise<RawContactsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("query", options.query);
  if (options.isFriend !== undefined) params.set("is_friend", String(options.isFriend));

  const qs = params.toString();
  return requestJson<RawContactsResponse>(
    `${BASE_URL}/api/v1/contacts${qs ? "?" + qs : ""}`,
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "contacts" }),
    },
  );
}

export async function fetchChatRoomsApi(
  options: FetchConversationsOptions = {},
  requestOptions?: RequestDiagnosticsOptions,
): Promise<RawChatRoomsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("query", options.query);

  const qs = params.toString();
  return requestJson<RawChatRoomsResponse>(
    `${BASE_URL}/api/v1/chatrooms${qs ? "?" + qs : ""}`,
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "chatrooms" }),
    },
  );
}

export async function fetchConversations(
  options: FetchConversationsOptions = {},
  requestOptions?: RequestDiagnosticsOptions,
) {
  const [sessions, contacts, chatrooms] = await Promise.all([
    fetchSessions(options, requestOptions),
    fetchContactsApi(options, requestOptions),
    fetchChatRoomsApi(options, requestOptions),
  ]);

  return {
    conversations: mergeConversations(sessions, contacts, chatrooms),
    contacts,
    chatrooms,
  };
}
