import { useCallback, useMemo, useRef } from "react";
import {
  clearHookEvents,
  fetchHermesQQStatus,
  fetchHermesWeixinStatus,
  fetchHookConfig,
  fetchHookEvents,
  fetchHookStatus,
  saveHermesQQConfig,
  saveHermesWeixinConfig,
  saveHookConfig,
  streamHookEvents,
  type HermesQQDraft,
  type HermesWeixinDraft,
  type HookConfigDraft,
} from "@l4/network";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useHookStore, type HookSubtab } from "@l2/data-clerk/stores/useHookStore";
import { buildHookView, validateHookConfigSave } from "./hookViewModel";
import { createDiagnosticEventSink, createDiagnosticHttpOptions } from "./diagnosticEventBridge";

const HOOK_CORRELATION_ID = "p4e-hook";

function hookDiagnostics(endpointFamily: string, method: "GET" | "POST" = "GET") {
  return createDiagnosticHttpOptions({
    endpointFamily,
    method,
    correlationId: HOOK_CORRELATION_ID,
    recoveryHint: "retry",
  });
}

const recordHookStreamEvent = createDiagnosticEventSink({
  source: "ui",
  category: "hook.stream",
  correlationId: HOOK_CORRELATION_ID,
  recoveryHint: "retry",
});

export function useHookCommander() {
  const store = useHookStore();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const streamAbortRef = useRef<AbortController | null>(null);
  const hookView = useMemo(() => buildHookView(store, privacyOn), [store, privacyOn]);

  const refreshHookConfig = useCallback(async () => {
    useHookStore.getState().setConfigLoading();
    try {
      const config = await fetchHookConfig(hookDiagnostics("hook_config"));
      useHookStore.getState().setConfig(config);
    } catch {
      useHookStore.getState().setConfigError("加载 Hook 配置失败");
    }
  }, []);

  const refreshHookStatus = useCallback(async () => {
    useHookStore.getState().setStatusLoading();
    try {
      const status = await fetchHookStatus(hookDiagnostics("hook_status"));
      useHookStore.getState().setStatusSummary(status);
    } catch {
      useHookStore.getState().setStatusError("加载 Hook 状态失败");
    }
  }, []);

  const refreshHookEvents = useCallback(async () => {
    useHookStore.getState().setEventsLoading();
    try {
      const events = await fetchHookEvents({ limit: 100 }, hookDiagnostics("hook_events"));
      useHookStore.getState().setEvents(events);
    } catch {
      useHookStore.getState().setEventsError("加载 Hook 事件失败");
    }
  }, []);

  const loadHook = useCallback(async () => {
    await Promise.all([
      refreshHookConfig(),
      refreshHookStatus(),
      refreshHookEvents(),
    ]);
  }, [refreshHookConfig, refreshHookEvents, refreshHookStatus]);

  const saveConfig = useCallback(async (draft: Partial<HookConfigDraft> & Pick<HookConfigDraft, "notifyTargets">) => {
    const validationError = validateHookConfigSave(useHookStore.getState().config, draft);
    if (validationError) {
      useHookStore.getState().setConfigError(validationError);
      return;
    }

    useHookStore.getState().setConfigLoading();
    try {
      const config = await saveHookConfig(draft, hookDiagnostics("hook_config", "POST"));
      useHookStore.getState().setConfig(config);
      await refreshHookStatus();
    } catch {
      useHookStore.getState().setConfigError("保存 Hook 配置失败");
    }
  }, [refreshHookStatus]);

  const saveHermesWeixin = useCallback(async (draft: HermesWeixinDraft) => {
    useHookStore.getState().setStatusLoading();
    try {
      const status = await saveHermesWeixinConfig(draft, hookDiagnostics("hook_hermes_weixin", "POST"));
      useHookStore.getState().setHermesStatus("weixin", status);
      await refreshHookStatus();
    } catch {
      useHookStore.getState().setStatusError("保存 Hermes 企业微信配置失败");
    }
  }, [refreshHookStatus]);

  const saveHermesQQ = useCallback(async (draft: HermesQQDraft) => {
    useHookStore.getState().setStatusLoading();
    try {
      const status = await saveHermesQQConfig(draft, hookDiagnostics("hook_hermes_qq", "POST"));
      useHookStore.getState().setHermesStatus("qq", status);
      await refreshHookStatus();
    } catch {
      useHookStore.getState().setStatusError("保存 Hermes QQ 配置失败");
    }
  }, [refreshHookStatus]);

  const refreshHermesBridges = useCallback(async () => {
    try {
      const [weixin, qq] = await Promise.all([
        fetchHermesWeixinStatus(hookDiagnostics("hook_hermes_weixin")),
        fetchHermesQQStatus(hookDiagnostics("hook_hermes_qq")),
      ]);
      const hookStore = useHookStore.getState();
      hookStore.setHermesStatus("weixin", weixin);
      hookStore.setHermesStatus("qq", qq);
    } catch {
      useHookStore.getState().setStatusError("加载 Hermes 桥接状态失败");
    }
  }, []);

  const startStream = useCallback(() => {
    streamAbortRef.current?.abort();
    const abortController = new AbortController();
    streamAbortRef.current = abortController;
    useHookStore.getState().setStreamConnecting();

    recordHookStreamEvent({
      summary: "Hook SSE stream connecting",
      privacy: "safe",
      attributes: { redactionOk: true },
    });

    void streamHookEvents(
      (event) => {
        const hookStore = useHookStore.getState();
        if (event.type === "snapshot") {
          hookStore.setEvents(event.events);
          hookStore.markStreamStreaming();
          recordHookStreamEvent({
            summary: "Hook SSE snapshot received",
            privacy: "safe",
            attributes: { eventCount: event.events.length, redactionOk: true },
          });
          return;
        }

        if (event.type === "hook_event") {
          hookStore.prependStreamEvent(event.event);
          recordHookStreamEvent({
            summary: "Hook SSE event received",
            privacy: "safe",
            attributes: { count: 1, redactionOk: true },
          });
          return;
        }

        if (event.type === "error") {
          hookStore.setStreamError("Hook SSE 事件流失败");
          recordHookStreamEvent({
            level: "warn",
            summary: "Hook SSE stream reported an error",
            privacy: "safe",
            attributes: { redactionOk: true },
          });
          return;
        }

        if (event.type === "aborted") {
          hookStore.stopStream();
        }
      },
      () => {
        useHookStore.getState().setStreamError("Hook SSE 连接失败");
      },
      abortController.signal,
      hookDiagnostics("hook_stream"),
    );
  }, []);

  const stopStream = useCallback(() => {
    streamAbortRef.current?.abort();
    streamAbortRef.current = null;
    useHookStore.getState().stopStream();
  }, []);

  const confirmClearEvents = useCallback(async () => {
    const state = useHookStore.getState();
    if (!state.clearConfirmationPending) {
      state.requestClearConfirmation();
      return;
    }

    state.setClearLoading();
    try {
      const result = await clearHookEvents(hookDiagnostics("hook_events_clear", "POST"));
      useHookStore.getState().setClearResult(result);
      await refreshHookStatus();
    } catch {
      useHookStore.getState().setClearError("清空 Hook 事件失败");
    }
  }, [refreshHookStatus]);

  return {
    ...store,
    hookView,
    privacyOn,
    setActiveSubtab: (tab: HookSubtab) => useHookStore.getState().setActiveSubtab(tab),
    loadHook,
    refreshHookConfig,
    refreshHookStatus,
    refreshHookEvents,
    refreshHermesBridges,
    saveConfig,
    saveHermesWeixin,
    saveHermesQQ,
    startStream,
    stopStream,
    confirmClearEvents,
    requestClearConfirmation: () => useHookStore.getState().requestClearConfirmation(),
    cancelClearConfirmation: () => useHookStore.getState().cancelClearConfirmation(),
  };
}
