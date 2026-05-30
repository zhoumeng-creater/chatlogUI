import { useCallback } from "react";
import { useAppStore } from "@/l2-coordinator/data-clerk/stores/useAppStore";
import { useSetupStore } from "@/l2-coordinator/data-clerk/stores/useSetupStore";
import { openDirectoryPicker } from "@l4/system";
import { useSetupCommander } from "./useSetupCommander";

export function useAppCommander() {
  const { appPhase, errorMessage } = useAppStore();
  const setup = useSetupCommander();

  const boot = useCallback(async () => {
    await setup.loadExistingProfile();
    await setup.checkReadiness();
  }, [setup]);

  const chooseWxDataPath = useCallback(async () => {
    const selected = await openDirectoryPicker();
    if (!selected) return;
    await setup.importDataDirectory(selected);
  }, [setup]);

  const retry = useCallback(() => {
    useSetupStore.getState().setError(null);
    void setup.checkReadiness();
  }, [setup]);

  const shutdown = useCallback(async () => {
    await setup.stopManagedService();
  }, [setup]);

  return {
    status: appPhase,
    error: errorMessage,
    boot,
    retry,
    chooseWxDataPath,
    shutdown,
  };
}
