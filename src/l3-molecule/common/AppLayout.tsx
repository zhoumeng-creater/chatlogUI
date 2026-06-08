import type { ReactNode } from "react";
import { AppTitleBar } from "./AppTitleBar";
import { AppStatusCluster } from "./AppStatusCluster";
import { GlobalCommandCluster } from "./GlobalCommandCluster";
import { WindowControlCluster } from "./WindowControlCluster";

interface AppShellView {
  title: string;
  privacyOn: boolean;
  windowControls: {
    minimizeLabel: string;
    toggleMaximizeLabel: string;
    closeLabel: string;
    isMaximized: boolean;
  };
}

interface AppShellActions {
  togglePrivacy: () => void;
  toggleConsole: () => void;
  openSettings: () => void;
  minimizeWindow: () => void;
  toggleMaximizeWindow: () => void;
  closeWindow: () => void;
}

interface AppLayoutProps {
  children: ReactNode;
  shell: AppShellView;
  actions: AppShellActions;
}

export function AppLayout({ children, shell, actions }: AppLayoutProps) {
  return (
    <div className="app-shell">
      <AppTitleBar
        title={shell.title}
        status={<AppStatusCluster privacyOn={shell.privacyOn} />}
        actions={(
          <GlobalCommandCluster
            privacyOn={shell.privacyOn}
            onTogglePrivacy={actions.togglePrivacy}
            onToggleConsole={actions.toggleConsole}
            onOpenSettings={actions.openSettings}
          />
        )}
        windowControls={(
          <WindowControlCluster
            controls={shell.windowControls}
            onMinimize={actions.minimizeWindow}
            onToggleMaximize={actions.toggleMaximizeWindow}
            onClose={actions.closeWindow}
          />
        )}
      />

      <main className="app-main">{children}</main>
    </div>
  );
}
