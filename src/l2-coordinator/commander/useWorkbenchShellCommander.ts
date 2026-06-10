import { useEffect, useMemo } from "react";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useSetupCommander } from "./useSetupCommander";
import { isWorkbenchReadySmokeSearch } from "./workbenchInformationArchitecture";
import { deriveWorkbenchShellView } from "./workbenchViewModel";

export function useWorkbenchShellCommander() {
  const { loadExistingProfile, checkReadiness } = useSetupCommander();
  const dbReady = useSetupStore((state) => state.dbReady);
  const httpReady = useSetupStore((state) => state.httpReady);
  const profile = useSetupStore((state) => state.profile);
  const sidecarStatus = useAppStore((state) => state.sidecarStatus);
  const devSmokeReady = readDevWorkbenchSmokeOverride();

  useEffect(() => {
    void loadExistingProfile().then(() => checkReadiness());
  }, [loadExistingProfile, checkReadiness]);

  const view = useMemo(
    () => deriveWorkbenchShellView({ profile, httpReady, dbReady, devSmokeReady }),
    [profile, httpReady, dbReady, devSmokeReady],
  );

  return {
    view,
    sidecarStatus,
  };
}

function readDevWorkbenchSmokeOverride(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  return isWorkbenchReadySmokeSearch(window.location.search);
}
