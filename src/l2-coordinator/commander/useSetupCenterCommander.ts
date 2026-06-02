import { useEffect, useMemo } from "react";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSetupCommander } from "./useSetupCommander";
import { deriveSetupCenterView } from "./setupCenterViewModel";

export function useSetupCenterCommander() {
  const { loadExistingProfile, openWorkbench } = useSetupCommander();
  const currentStep = useSetupStore((state) => state.currentStep);
  const dbReady = useSetupStore((state) => state.dbReady);

  useEffect(() => {
    void loadExistingProfile();
  }, [loadExistingProfile]);

  const view = useMemo(
    () => deriveSetupCenterView({ currentStep, dbReady }),
    [currentStep, dbReady],
  );

  return {
    currentStep,
    view,
    openWorkbench,
  };
}
