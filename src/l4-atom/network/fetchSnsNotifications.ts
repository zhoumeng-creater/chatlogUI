import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawSnsNotificationResponse } from "./chatlogRawTypes";
import { adaptSnsNotificationsResponse } from "./snsAdapters";

export interface FetchSnsNotificationsOptions {
  limit?: number;
  time?: string;
  since?: string;
  until?: string;
  includeRead?: boolean;
}

export async function fetchSnsNotifications(
  options: FetchSnsNotificationsOptions = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("format", "json");
  if (options.limit !== undefined) params.set("limit", String(options.limit));
  if (options.time) params.set("time", options.time);
  if (options.since) params.set("since", options.since);
  if (options.until) params.set("until", options.until);
  if (options.includeRead !== undefined) {
    params.set("include_read", options.includeRead ? "true" : "false");
  }

  const raw = await requestJson<RawSnsNotificationResponse>(
    buildChatlogApiUrl(`/api/v1/sns_notifications?${params}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "sns_notifications",
        method: "GET",
      }),
    },
  );

  return adaptSnsNotificationsResponse(raw);
}
