import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type {
  RawSessionsResponse,
  RawContactsResponse,
  RawChatRoomsResponse,
} from "./chatlogRawTypes";
import { mergeConversations } from "./chatlogAdapters";

export interface FetchConversationsOptions {
  limit?: number;
  offset?: number;
  query?: string;
  isFriend?: boolean;
}

export async function fetchSessions(
  options: FetchConversationsOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<RawSessionsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.query) params.set("query", options.query);

  const qs = params.toString();
  return requestJson<RawSessionsResponse>(buildChatlogApiUrl(`/api/v1/sessions${qs ? "?" + qs : ""}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "sessions",
      method: "GET",
    }),
  });
}

export async function fetchContactsApi(
  options: FetchConversationsOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<RawContactsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("query", options.query);
  if (options.isFriend !== undefined) params.set("is_friend", String(options.isFriend));

  const qs = params.toString();
  return requestJson<RawContactsResponse>(buildChatlogApiUrl(`/api/v1/contacts${qs ? "?" + qs : ""}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "contacts",
      method: "GET",
    }),
  });
}

export async function fetchChatRoomsApi(
  options: FetchConversationsOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<RawChatRoomsResponse> {
  const params = new URLSearchParams();
  if (options.limit) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.query) params.set("query", options.query);

  const qs = params.toString();
  return requestJson<RawChatRoomsResponse>(buildChatlogApiUrl(`/api/v1/chatrooms${qs ? "?" + qs : ""}`, diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "chatrooms",
      method: "GET",
    }),
  });
}

export async function fetchConversations(
  options: FetchConversationsOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const [sessions, contacts, chatrooms] = await Promise.all([
    fetchSessions(options, diagnosticOptions),
    fetchContactsApi(options, diagnosticOptions),
    fetchChatRoomsApi(options, diagnosticOptions),
  ]);

  return {
    conversations: mergeConversations(sessions, contacts, chatrooms),
    contacts,
    chatrooms,
  };
}
