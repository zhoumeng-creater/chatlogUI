import { SIDECAR_PORT } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawStatsResponse, RawDashboardTrendResponse } from "./chatlogRawTypes";
import { adaptStatsResponse, adaptDashboardTrendResponse } from "./chatlogAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

export interface FetchStatsOptions {
  chat: string;
  time?: string;
  since?: number;
  until?: number;
}

export async function fetchStats(
  options: FetchStatsOptions,
  requestOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("chat", options.chat);
  if (options.time) params.set("time", options.time);
  if (options.since !== undefined) params.set("since", String(options.since));
  if (options.until !== undefined) params.set("until", String(options.until));

  const raw = await requestJson<RawStatsResponse>(
    `${BASE_URL}/api/v1/stats?${params.toString()}`,
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "stats" }),
    },
  );
  return adaptStatsResponse(raw);
}

export interface FetchDashboardTrendOptions {
  chat?: string;
  window?: string;
  summary?: boolean;
}

export async function fetchDashboardTrend(
  options: FetchDashboardTrendOptions = {},
  requestOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  if (options.chat) params.set("chat", options.chat);
  if (options.window) params.set("window", options.window);
  params.set("summary", options.summary !== false ? "1" : "0");

  const raw = await requestJson<RawDashboardTrendResponse>(
    `${BASE_URL}/api/v1/dashboard/trend?${params.toString()}`,
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(requestOptions, { endpointFamily: "dashboard-trend" }),
    },
  );
  return adaptDashboardTrendResponse(raw);
}
