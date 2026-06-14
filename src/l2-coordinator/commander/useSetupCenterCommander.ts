import { useEffect, useMemo } from "react";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useDiagnosticEventStore } from "@l2/data-clerk/stores/useDiagnosticEventStore";
import type { DiagnosticEvent } from "@l4/network/diagnosticEvents";
import { useSetupCommander } from "./useSetupCommander";
import { useDiagnosticsCommander } from "./useDiagnosticsCommander";
import { deriveSetupCenterView, type SetupActionId } from "./setupCenterViewModel";

export function useSetupCenterCommander() {
  const {
    loadExistingProfile,
    chooseMode,
    chooseSetupPath,
    chooseAndImportDataDirectory,
    detectDataDirectories,
    importDetectedDataDirectory,
    chooseManualDataDirectory,
    chooseManualWorkDirectory,
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
  const activePath = useSetupStore((state) => state.activePath);
  const currentStep = useSetupStore((state) => state.currentStep);
  const profile = useSetupStore((state) => state.profile);
  const portState = useSetupStore((state) => state.portState);
  const httpReady = useSetupStore((state) => state.httpReady);
  const dbReady = useSetupStore((state) => state.dbReady);
  const externalBaseUrlDraft = useSetupStore((state) => state.externalBaseUrlDraft);
  const externalBaseUrlError = useSetupStore((state) => state.externalBaseUrlError);
  const manualDraft = useSetupStore((state) => state.manualDraft);
  const manualFieldErrors = useSetupStore((state) => state.manualFieldErrors);
  const detectedPathCandidates = useSetupStore((state) => state.detectedPathCandidates);
  const detectedPathStatus = useSetupStore((state) => state.detectedPathStatus);
  const detectedPathError = useSetupStore((state) => state.detectedPathError);
  const loading = useSetupStore((state) => state.loading);
  const error = useSetupStore((state) => state.error);
  const latestDiagnosticFamily = useDiagnosticEventStore((state) =>
    deriveLatestDiagnosticFamily(state.items),
  );
  const setExternalBaseUrlDraft = useSetupStore((state) => state.setExternalBaseUrlDraft);
  const setManualDraft = useSetupStore((state) => state.setManualDraft);

  useEffect(() => {
    void loadExistingProfile();
  }, [loadExistingProfile]);

  useEffect(() => {
    if (activePath === "recommended-import" && !profile && detectedPathStatus === "idle") {
      void detectDataDirectories();
    }
  }, [activePath, detectDataDirectories, detectedPathStatus, profile]);

  const view = useMemo(
    () => deriveSetupCenterView({
      currentStep,
      mode,
      activePath,
      profile,
      portState,
      httpReady,
      dbReady,
      loading,
      error,
      externalBaseUrlDraft,
      externalBaseUrlError,
      detectedPathCandidates,
      detectedPathStatus,
      detectedPathError,
    }),
    [
      activePath,
      currentStep,
      dbReady,
      error,
      externalBaseUrlDraft,
      externalBaseUrlError,
      detectedPathCandidates,
      detectedPathError,
      detectedPathStatus,
      httpReady,
      loading,
      mode,
      portState,
      profile,
    ],
  );

  const performAction = async (actionId: SetupActionId) => {
    switch (actionId) {
      case "choose-data-directory":
        await chooseAndImportDataDirectory();
        return;
      case "save-manual-config":
        await saveManualConfig(manualDraft);
        return;
      case "start-managed-service":
        await startManagedService();
        return;
      case "connect-external-service":
        await connectExternalService(externalBaseUrlDraft);
        return;
      case "refresh-database":
        await checkReadiness();
        return;
      case "inspect-service-port":
        await inspectServicePort();
        return;
      case "stop-managed-service":
        await stopManagedService();
        return;
      case "open-workbench":
        openWorkbench();
        return;
    }
  };

  return {
    mode,
    activePath,
    currentStep,
    profile,
    portState,
    httpReady,
    dbReady,
    externalBaseUrlDraft,
    externalBaseUrlError,
    manualDraft,
    manualFieldErrors,
    detectedPathCandidates,
    detectedPathStatus,
    detectedPathError,
    loading,
    error,
    view,
    diagnostics,
    latestDiagnosticFamily,
    actions: {
      chooseMode,
      chooseSetupPath,
      chooseAndImportDataDirectory,
      detectDataDirectories,
      importDetectedDataDirectory,
      chooseManualDataDirectory,
      chooseManualWorkDirectory,
      saveManualConfig,
      inspectServicePort,
      startManagedService,
      connectExternalService,
      setExternalBaseUrlDraft,
      setManualDraft,
      stopManagedService,
      checkReadiness,
      openWorkbench,
      performAction,
    },
    openWorkbench,
  };
}

function deriveLatestDiagnosticFamily(events: DiagnosticEvent[]): string {
  const latest = events[events.length - 1];
  const endpointFamily = latest?.attributes?.endpointFamily;
  if (typeof endpointFamily === "string" && endpointFamily.trim()) {
    return endpointFamily;
  }
  return latest?.source ?? "none";
}
