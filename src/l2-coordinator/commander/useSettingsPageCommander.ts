import { useCallback, useState } from "react";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useAiCommander } from "./useAiCommander";
import { useSetupCommander } from "./useSetupCommander";
import { useSettingsCommander } from "./useSettingsCommander";
import { useUpdateCommander } from "./useUpdateCommander";

export function useSettingsPageCommander() {
  const settings = useSettingsCommander();
  const setup = useSetupCommander();
  const update = useUpdateCommander();
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const { indexStatus } = useAiCommander();
  const [updateStatusText, setUpdateStatusText] = useState("");

  const chooseDataDirectory = useCallback(async () => {
    const dir = await setup.chooseAndImportDataDirectory();
    if (dir) {
      settings.updateAndSave({ wxDataPath: dir });
    }
  }, [settings, setup]);

  const checkForUpdates = useCallback(async () => {
    setUpdateStatusText("正在检查更新...");
    const hasUpdate = await update.checkUpdate();
    if (!hasUpdate) {
      setUpdateStatusText("已是最新版本");
      window.setTimeout(() => setUpdateStatusText(""), 3000);
    }
  }, [update]);

  return {
    ...settings,
    sidecarStatus,
    indexStatus,
    chooseDataDirectory,
    checkForUpdates,
    updateStatusText,
  };
}
