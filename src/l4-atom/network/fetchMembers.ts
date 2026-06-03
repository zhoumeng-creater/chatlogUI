import { SIDECAR_PORT } from "@/utils/constants";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import type { RawMembersResponse } from "./chatlogRawTypes";
import { adaptMembersResponse } from "./mediaAdapters";

const BASE_URL = `http://127.0.0.1:${SIDECAR_PORT}`;

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
    `${BASE_URL}/api/v1/members?${params.toString()}`,
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
