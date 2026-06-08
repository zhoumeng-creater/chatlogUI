import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import {
  closeCurrentWindow,
  listenCurrentWindowStateChange,
  minimizeCurrentWindow,
  readCurrentWindowMaximized,
  toggleMaximizeCurrentWindow,
} from "@l4/system/windowControls";
import { useDevConsoleStore } from "@l2/data-clerk/stores/useDevConsoleStore";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import { deriveAppShellView } from "./appShellViewModel";
import { recordLocalDiagnosticEvent } from "./diagnosticEventBridge";

export function useAppShellCommander(title: string) {
  const navigate = useNavigate();
  const privacyOn = useSettingsStore((state) => state.settings.privacyOn);
  const windowMaterial = useSettingsStore((state) => state.settings.windowMaterial);
  const togglePrivacy = useSettingsStore((state) => state.togglePrivacy);
  const toggleConsole = useDevConsoleStore((state) => state.toggle);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    void applyWindowMaterial(windowMaterial, {
      onFailure: ({ material, error }) => {
        const safeMessage = maskDiagnosticText(
          error instanceof Error ? error.message : String(error),
          { privacyMode: true },
        );
        recordLocalDiagnosticEvent({
          source: "tauri",
          level: "warn",
          category: "window.material",
          summary: `Window material ${material} failed: ${safeMessage}`,
          recoveryHint: "none",
          attributes: {
            target: material,
          },
        });
      },
    });
  }, [windowMaterial]);

  const refreshMaximizedState = useCallback(async () => {
    const result = await readCurrentWindowMaximized();
    setIsMaximized(result.ok ? result.isMaximized : false);
  }, []);

  useEffect(() => {
    void refreshMaximizedState();
  }, [refreshMaximizedState]);

  useEffect(() => {
    let disposed = false;
    let cleanup: (() => void) | null = null;

    void listenCurrentWindowStateChange(() => {
      if (!disposed) void refreshMaximizedState();
    }).then((unlisten) => {
      if (disposed) {
        unlisten?.();
        return;
      }
      cleanup = unlisten;
    });

    return () => {
      disposed = true;
      cleanup?.();
    };
  }, [refreshMaximizedState]);

  const toggleMaximizeWindow = useCallback(async () => {
    await toggleMaximizeCurrentWindow();
    await refreshMaximizedState();
  }, [refreshMaximizedState]);

  return {
    view: deriveAppShellView({ title, privacyOn, windowMaterial, isMaximized }),
    actions: {
      togglePrivacy,
      toggleConsole,
      openSettings: () => navigate("/settings"),
      minimizeWindow: () => {
        void minimizeCurrentWindow();
      },
      toggleMaximizeWindow: () => {
        void toggleMaximizeWindow();
      },
      closeWindow: () => {
        void closeCurrentWindow();
      },
    },
  };
}
