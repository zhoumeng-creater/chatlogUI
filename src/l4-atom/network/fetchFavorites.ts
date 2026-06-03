import { SIDECAR_PORT } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawFavoritesResponse } from "./chatlogRawTypes";
import { adaptFavoriteResponse } from "./mediaAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

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
  params.set("format", "json");
  if (options.chat) params.set("chat", options.chat);
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.offset !== undefined) params.set("offset", String(options.offset));
  if (options.type) params.set("type", options.type);
  const qs = params.toString();

  const raw = await requestJson<RawFavoritesResponse>(
    `${BASE_URL}/api/v1/favorites${qs ? "?" + qs : ""}`,
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
