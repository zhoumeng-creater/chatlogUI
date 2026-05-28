import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface SidecarLogPayload {
  level: "stdout" | "stderr";
  message: string;
}

export function listenSidecarLogs(
  callback: (payload: SidecarLogPayload) => void
): Promise<UnlistenFn> {
  return listen<SidecarLogPayload>("sidecar-log", (event) => {
    callback(event.payload);
  });
}
