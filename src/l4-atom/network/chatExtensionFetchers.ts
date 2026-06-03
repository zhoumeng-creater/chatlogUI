import { SIDECAR_PORT } from "@/utils/constants";
import type {
  RawFavoritesResponse,
  RawMembersResponse,
  RawNewMessagesResponse,
  RawUnreadResponse,
} from "./chatlogRawTypes";
import {
  adaptFavoritesResponse,
  adaptMembersResponse,
  adaptNewMessagesResponse,
  adaptUnreadResponse,
} from "./chatExtensionsAdapters";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export interface FetchUnreadOptions {
  limit?: number;
}

export interface FetchMembersOptions {
  chat: string;
}

export interface FetchNewMessagesOptions {
  limit?: number;
  state?: Record<string, number>;
}

export interface FetchFavoritesOptions {
  limit?: number;
  favType?: string;
  query?: string;
}

export async function fetchUnread(
  options: FetchUnreadOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));

  const raw = await requestJson<RawUnreadResponse>(
    `${BASE_URL}/api/v1/unread?${params.toString()}`,
    withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "unread",
      method: "GET",
    }),
  );

  return adaptUnreadResponse(raw);
}

export async function fetchMembers(
  options: FetchMembersOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("chat", options.chat);

  const raw = await requestJson<RawMembersResponse>(
    `${BASE_URL}/api/v1/members?${params.toString()}`,
    withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "members",
      method: "GET",
    }),
  );

  return adaptMembersResponse(raw);
}

export async function fetchNewMessages(
  options: FetchNewMessagesOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.state && Object.keys(options.state).length > 0) {
    params.set("state", JSON.stringify(options.state));
  }

  const raw = await requestJson<RawNewMessagesResponse>(
    `${BASE_URL}/api/v1/new_messages?${params.toString()}`,
    withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "new_messages",
      method: "GET",
    }),
  );

  return adaptNewMessagesResponse(raw);
}

export async function fetchFavorites(
  options: FetchFavoritesOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.favType) params.set("fav_type", options.favType);
  if (options.query) params.set("query", options.query);

  const raw = await requestJson<RawFavoritesResponse>(
    `${BASE_URL}/api/v1/favorites?${params.toString()}`,
    withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "favorites",
      method: "GET",
    }),
  );

  return adaptFavoritesResponse(raw);
}
