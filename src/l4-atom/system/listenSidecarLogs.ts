import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { canListenToTauriEvents } from "./tauriRuntime";

export interface SidecarLogPayload {
  level: "stdout" | "stderr" | "error" | "system";
  message: string;
}

export function listenSidecarLogs(
  callback: (payload: SidecarLogPayload) => void
): Promise<UnlistenFn> {
  if (!canListenToTauriEvents()) {
    return Promise.resolve(() => undefined);
  }

  return listen<SidecarLogPayload>("sidecar-log", (event) => {
    callback(event.payload);
  });
}
