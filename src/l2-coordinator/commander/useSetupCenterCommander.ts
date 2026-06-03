import { useEffect, useMemo } from "react";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSetupCommander } from "./useSetupCommander";
import { useDiagnosticsCommander } from "./useDiagnosticsCommander";
import { deriveSetupCenterView } from "./setupCenterViewModel";

export function useSetupCenterCommander() {
  const {
    loadExistingProfile,
    chooseMode,
    chooseAndImportDataDirectory,
    saveManualConfig,
    inspectServicePort,
    startManagedService,
    connectExternalService,
    stopManagedService,
    checkReadiness,
    openWorkbench,
  } = useSetupCommander();
  const diagnostics = useDiagnosticsCommander();
  const mode = useSetupStore((state) => state.mode);
  const currentStep = useSetupStore((state) => state.currentStep);
  const profile = useSetupStore((state) => state.profile);
  const portState = useSetupStore((state) => state.portState);
  const httpReady = useSetupStore((state) => state.httpReady);
  const dbReady = useSetupStore((state) => state.dbReady);
  const loading = useSetupStore((state) => state.loading);
  const error = useSetupStore((state) => state.error);

  useEffect(() => {
    void loadExistingProfile();
  }, [loadExistingProfile]);

  const view = useMemo(
    () => deriveSetupCenterView({ currentStep, dbReady }),
    [currentStep, dbReady],
  );

  return {
    mode,
    currentStep,
    profile,
    portState,
    httpReady,
    dbReady,
    loading,
    error,
    view,
    diagnostics,
    actions: {
      chooseMode,
      chooseAndImportDataDirectory,
      saveManualConfig,
      inspectServicePort,
      startManagedService,
      connectExternalService,
      stopManagedService,
      checkReadiness,
      openWorkbench,
    },
    openWorkbench,
  };
}
