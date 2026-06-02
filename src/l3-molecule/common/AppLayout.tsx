import type { ReactNode } from "react";
import { AppTitleBar } from "./AppTitleBar";
import { AppStatusCluster } from "./AppStatusCluster";
import { GlobalCommandCluster } from "./GlobalCommandCluster";

interface AppShellView {
  title: string;
  privacyOn: boolean;
}

interface AppShellActions {
  togglePrivacy: () => void;
  toggleConsole: () => void;
  openSettings: () => void;
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
      />

      <main className="app-main">{children}</main>
    </div>
  );
}
