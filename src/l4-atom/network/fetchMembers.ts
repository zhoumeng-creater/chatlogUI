import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import type { RawMembersResponse } from "./chatlogRawTypes";
import { adaptMembersResponse } from "./mediaAdapters";

export interface FetchMembersOptions {
  chat: string;
}

export async function fetchMembers(
  options: FetchMembersOptions,
  diagnosticOptions?: RequestDiagnosticsOptions,
) {
  const params = new URLSearchParams();
  params.set("format", "json");
  params.set("chat", options.chat);

  const raw = await requestJson<RawMembersResponse>(
    buildChatlogApiUrl(`/api/v1/members?${params.toString()}`, diagnosticOptions?.serviceBaseUrl),
    {
      timeoutMs: 15000,
      ...withRequestDiagnostics(diagnosticOptions, {
        endpointFamily: "members",
        method: "GET",
      }),
    },
  );

  return adaptMembersResponse(raw);
}
