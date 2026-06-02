import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import { useDevConsoleStore } from "@l2/data-clerk/stores/useDevConsoleStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { deriveAppShellView } from "./appShellViewModel";

export function useAppShellCommander(title: string) {
  const navigate = useNavigate();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const windowMaterial = useSettingsStore((state) => state.settings.windowMaterial);
  const togglePrivacy = useSettingsStore((state) => state.togglePrivacy);
  const toggleConsole = useDevConsoleStore((state) => state.toggle);

  useEffect(() => {
    void applyWindowMaterial(windowMaterial);
  }, [windowMaterial]);

  return {
    view: deriveAppShellView({ title, privacyOn, windowMaterial }),
    actions: {
      togglePrivacy,
      toggleConsole,
      openSettings: () => navigate("/settings"),
    },
  };
}
