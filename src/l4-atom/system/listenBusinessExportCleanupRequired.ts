import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { canListenToTauriEvents } from "./tauriRuntime";

export const BUSINESS_EXPORT_CLEANUP_NOTICE =
  "导出文件仍在安全清理中。请关闭占用文件后再次关闭应用。";

interface BusinessExportCleanupRequiredPayload {
  code?: string;
}

export function listenBusinessExportCleanupRequired(
  callback: (notice: string) => void,
): Promise<UnlistenFn> {
  if (!canListenToTauriEvents()) {
    return Promise.resolve(() => undefined);
  }

  return listen<BusinessExportCleanupRequiredPayload>(
    "business-export-cleanup-required",
    (event) => {
      if (event.payload?.code === "cleanup_incomplete") {
        callback(BUSINESS_EXPORT_CLEANUP_NOTICE);
      }
    },
  );
}
