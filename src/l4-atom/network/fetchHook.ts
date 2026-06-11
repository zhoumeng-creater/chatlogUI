import { SSE_TIMEOUT_MS } from "@/utils/constants";
import { buildChatlogApiUrl } from "./chatlogEndpoint";
import {
  requestJson,
  withRequestDiagnostics,
  type RequestDiagnosticsOptions,
} from "./httpClient";
import {
  adaptHermesStatus,
  adaptHookClearResult,
  adaptHookConfig,
  adaptHookEventsResponse,
  adaptHookStatus,
  buildHermesQQPayload,
  buildHermesWeixinPayload,
  buildHookConfigPayload,
  type HermesQQDraft,
  type HermesStatusView,
  type HermesWeixinDraft,
  type HookClearResult,
  type HookConfigDraft,
  type HookConfigView,
  type HookEventSummary,
  type HookStatusView,
} from "./hookAdapters";
import {
  createHookSSEParser,
  type HookStreamEvent,
} from "./hookStreamParser";

export async function fetchHookConfig(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HookConfigView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/config?format=json", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_config",
      method: "GET",
    }),
  });
  return adaptHookConfig(raw);
}

export async function saveHookConfig(
  draft: Partial<HookConfigDraft> & Pick<HookConfigDraft, "notifyTargets">,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HookConfigView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/config?format=json", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: 15000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildHookConfigPayload(draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_config",
      method: "POST",
    }),
  });
  return adaptHookConfig(raw);
}

export async function fetchHookStatus(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HookStatusView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/status?format=json", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_status",
      method: "GET",
    }),
  });
  return adaptHookStatus(raw);
}

export async function fetchHookEvents(
  options: { limit?: number } = {},
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HookEventSummary[]> {
  const url = new URL(buildChatlogApiUrl("/api/v1/hook/events", diagnosticOptions?.serviceBaseUrl));
  url.searchParams.set("format", "json");
  if (options.limit !== undefined) url.searchParams.set("limit", String(options.limit));

  const raw = await requestJson(url.toString(), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_events",
      method: "GET",
    }),
  });
  return adaptHookEventsResponse(raw);
}

export async function clearHookEvents(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HookClearResult> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/events/clear?format=json", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_events_clear",
      method: "POST",
    }),
  });
  return adaptHookClearResult(raw);
}

export async function fetchHermesWeixinStatus(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HermesStatusView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/hermes/weixin?format=json", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_hermes_weixin",
      method: "GET",
    }),
  });
  return adaptHermesStatus("weixin", raw);
}

export async function fetchHermesQQStatus(
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HermesStatusView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/hermes/qq?format=json", diagnosticOptions?.serviceBaseUrl), {
    timeoutMs: 15000,
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_hermes_qq",
      method: "GET",
    }),
  });
  return adaptHermesStatus("qq", raw);
}

export async function saveHermesWeixinConfig(
  draft: HermesWeixinDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HermesStatusView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/hermes/weixin?format=json", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: 15000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildHermesWeixinPayload(draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_hermes_weixin",
      method: "POST",
    }),
  });
  return adaptHermesStatus("weixin", raw);
}

export async function saveHermesQQConfig(
  draft: HermesQQDraft,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<HermesStatusView> {
  const raw = await requestJson(buildChatlogApiUrl("/api/v1/hook/hermes/qq?format=json", diagnosticOptions?.serviceBaseUrl), {
    method: "POST",
    timeoutMs: 15000,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(buildHermesQQPayload(draft)),
    ...withRequestDiagnostics(diagnosticOptions, {
      endpointFamily: "hook_hermes_qq",
      method: "POST",
    }),
  });
  return adaptHermesStatus("qq", raw);
}

export async function streamHookEvents(
  onEvent: (event: HookStreamEvent) => void,
  onError: (error: Error) => void,
  signal?: AbortSignal,
  diagnosticOptions?: RequestDiagnosticsOptions,
): Promise<void> {
  const response = await fetch(buildChatlogApiUrl("/api/v1/hook/stream?format=json", diagnosticOptions?.serviceBaseUrl), {
    signal,
  });
  if (!response.ok || !response.body) {
    onError(new Error(`Hook stream failed with HTTP ${response.status}`));
    return;
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const parser = createHookSSEParser();
  const timeoutId = setTimeout(() => {
    if (!signal?.aborted) reader.cancel().catch(() => undefined);
  }, SSE_TIMEOUT_MS);

  try {
    let reading = true;
    while (reading) {
      const { done, value } = await reader.read();
      if (done) {
        reading = false;
        continue;
      }
      for (const event of parser.push(decoder.decode(value, { stream: true }))) {
        onEvent(event);
      }
    }
    for (const event of parser.flush()) onEvent(event);
  } catch (error) {
    if (signal?.aborted) {
      onEvent({ type: "aborted" });
      return;
    }
    onError(error instanceof Error ? error : new Error("Hook stream failed"));
  } finally {
    clearTimeout(timeoutId);
  }
}
