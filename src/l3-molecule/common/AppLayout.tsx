import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useDevConsoleStore } from "@l2/data-clerk/stores/useDevConsoleStore";
import { AppTitleBar } from "./AppTitleBar";
import { AppStatusCluster } from "./AppStatusCluster";
import { GlobalCommandCluster } from "./GlobalCommandCluster";

interface AppLayoutProps {
  children: ReactNode;
  title?: string;
}

export function AppLayout({ children, title = "工作台" }: AppLayoutProps) {
  const navigate = useNavigate();
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const windowMaterial = useSettingsStore((s) => s.settings.windowMaterial);
  const togglePrivacy = useSettingsStore((s) => s.togglePrivacy);
  const toggleConsole = useDevConsoleStore((s) => s.toggle);

  useEffect(() => {
    applyWindowMaterial(windowMaterial);
  }, [windowMaterial]);

  return (
    <div className="app-shell">
      <AppTitleBar
        title={title}
        status={<AppStatusCluster privacyOn={privacyOn} />}
        actions={(
          <GlobalCommandCluster
            privacyOn={privacyOn}
            onTogglePrivacy={togglePrivacy}
            onToggleConsole={toggleConsole}
            onOpenSettings={() => navigate("/settings")}
          />
        )}
      />

      <main className="app-main">{children}</main>
    </div>
  );
}
