import { useEffect, useMemo, useState } from "react";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useWorkspacePreferenceStore } from "@l2/data-clerk/stores/useWorkspacePreferenceStore";
import { useSetupCommander } from "./useSetupCommander";
import { getActiveChatlogServiceSummary } from "./chatlogRequestContext";
import { getEffectiveRailMode } from "./workspacePreferenceModel";
import { deriveWorkbenchShellView } from "./workbenchViewModel";

export function useWorkbenchShellCommander() {
  const { loadExistingProfile, checkReadiness } = useSetupCommander();
  const dbReady = useSetupStore((state) => state.dbReady);
  const httpReady = useSetupStore((state) => state.httpReady);
  const profile = useSetupStore((state) => state.profile);
  const sidecarStatus = useAppStore((state) => state.sidecarStatus);
  const viewportWidth = useViewportWidth();
  const preferencesLoaded = useWorkspacePreferenceStore((state) => state.loaded);
  const loadWorkspacePreferences = useWorkspacePreferenceStore((state) => state.loadFromStorage);
  const railMode = useWorkspacePreferenceStore((state) => state.preferences.railMode);
  const toggleRailMode = useWorkspacePreferenceStore((state) => state.toggleRailMode);
  const setLastPrimaryRoute = useWorkspacePreferenceStore((state) => state.setLastPrimaryRoute);
  const devSmokeReady = readDevWorkbenchSmokeOverride();
  const effectiveRailMode = getEffectiveRailMode(railMode, viewportWidth);

  useEffect(() => {
    void loadExistingProfile().then(() => checkReadiness());
  }, [loadExistingProfile, checkReadiness]);

  useEffect(() => {
    if (!preferencesLoaded) loadWorkspacePreferences();
  }, [loadWorkspacePreferences, preferencesLoaded]);

  const view = useMemo(
    () => deriveWorkbenchShellView({ profile, httpReady, dbReady, devSmokeReady }),
    [profile, httpReady, dbReady, devSmokeReady],
  );
  const activeService = useMemo(
    () => getActiveChatlogServiceSummary(profile),
    [profile],
  );
  const workspaceRail = useMemo(
    () => ({
      mode: effectiveRailMode,
      showLabels: effectiveRailMode === "expanded",
      canToggleLabels: viewportWidth >= 1280,
      toggleLabels: toggleRailMode,
      setLastPrimaryRoute,
    }),
    [effectiveRailMode, setLastPrimaryRoute, toggleRailMode, viewportWidth],
  );

  return {
    view,
    sidecarStatus,
    serviceLabel: activeService.serviceLabel,
    workspaceRail,
  };
}

function useViewportWidth(): number {
  const [width, setWidth] = useState(() =>
    typeof window === "undefined" ? 1366 : window.innerWidth,
  );

  useEffect(() => {
    const handleResize = () => setWidth(window.innerWidth);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return width;
}

function readDevWorkbenchSmokeOverride(): boolean {
  if (!import.meta.env.DEV || typeof window === "undefined") return false;
  const params = new URLSearchParams(window.location.search);
  return params.get("codex-smoke") === "workbench-ready";
}
