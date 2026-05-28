import { useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { listenSidecarLogs } from "@l4/system/listenSidecarLogs";
import { useDevConsoleStore } from "@/l2-coordinator/data-clerk/stores/useDevConsoleStore";

export function useDevConsoleCommander() {
  const store = useDevConsoleStore();

  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listenSidecarLogs((payload) => {
      useDevConsoleStore.getState().addLog(payload.level, payload.message);
    }).then((fn) => {
      unlisten = fn;
    });

    return () => {
      unlisten?.();
    };
  }, []);

  const exportLogs = useCallback(async (): Promise<string | null> => {
    try {
      const { logs } = useDevConsoleStore.getState();
      const payload = logs.map((l) => ({ level: l.level, message: l.message }));
      const path = await invoke<string>("export_logs", { logs: payload });
      return path;
    } catch (error) {
      console.error("导出日志失败:", error);
      return null;
    }
  }, []);

  return {
    logs: store.logs,
    visible: store.visible,
    autoScroll: store.autoScroll,
    toggle: store.toggle,
    clear: store.clear,
    exportLogs,
  };
}
