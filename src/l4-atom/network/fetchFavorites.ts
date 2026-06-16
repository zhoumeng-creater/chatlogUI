import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawFavoritesResponse } from "./chatlogRawTypes";
import { adaptFavoriteResponse } from "./mediaAdapters";

export interface FetchFavoritesOptions {
  chat?: string;
  limit?: number;
  offset?: number;
  type?: string;
}

export async function fetchFavorites(
  options: FetchFavoritesOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  if (options.chat) params.set("chat", options.chat);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.type) params.set("type", options.type);
  const qs = params.toString();

  const raw = await requestJson<RawFavoritesResponse>(
    buildChatlogApiUrl(`/api/v1/favorites${qs ? "?" + qs : ""}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "favorites",
        method: "GET",
      }),
    },
  );

  return adaptFavoriteResponse(raw);
}
