import type { ReactNode } from "react";
import { AppTitleBar } from "./AppTitleBar";
import { AppStatusCluster } from "./AppStatusCluster";
import { GlobalCommandCluster } from "./GlobalCommandCluster";
import { WindowControlCluster } from "./WindowControlCluster";
import { CoachMark } from "./CoachMark";
import { ShortcutHelpOverlay } from "./ShortcutHelpOverlay";
import type { CoachMarkView } from "@l2/commander/coachMarkModel";
import type { ShortcutHelpCatalog } from "@l2/commander/shortcutCatalog";

interface AppShellView {
  productName: string;
  title: string;
  privacyOn: boolean;
  exportCleanupNotice?: string | null;
  shortcutHelpAction?: {
    label: string;
    tooltip: string;
  };
  shortcutHelp?: {
    open: boolean;
    catalog: ShortcutHelpCatalog;
  };
  coachMark?: {
    mark: CoachMarkView | null;
  };
  developerConsoleAction: {
    label: string;
    tooltip: string;
  } | null;
  windowControls: {
    minimizeLabel: string;
    toggleMaximizeLabel: string;
    closeLabel: string;
    isMaximized: boolean;
  };
}

interface AppShellActions {
  togglePrivacy: () => void;
  openShortcutHelp?: () => void;
  closeShortcutHelp?: () => void;
  dismissCoachMark?: (id: CoachMarkView["id"]) => void;
  skipCoachMarksForNow?: () => void;
  toggleConsole?: () => void;
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
      <a className="skip-link" href="#app-main">
        跳到主内容
      </a>
      <AppTitleBar
        productName={shell.productName}
        title={shell.title}
        status={<AppStatusCluster privacyOn={shell.privacyOn} />}
        actions={(
          <GlobalCommandCluster
            privacyOn={shell.privacyOn}
            onTogglePrivacy={actions.togglePrivacy}
            shortcutHelpAction={
              shell.shortcutHelpAction && actions.openShortcutHelp
                ? {
                    ...shell.shortcutHelpAction,
                    onClick: actions.openShortcutHelp,
                  }
                : undefined
            }
            developerConsoleAction={
              shell.developerConsoleAction && actions.toggleConsole
                ? {
                    ...shell.developerConsoleAction,
                    onClick: actions.toggleConsole,
                  }
                : undefined
            }
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

      {shell.exportCleanupNotice && (
        <div className="app-export-cleanup-notice" role="alert" aria-live="assertive">
          {shell.exportCleanupNotice}
        </div>
      )}

      <main id="app-main" className="app-main" tabIndex={-1}>{children}</main>
      {shell.shortcutHelp && actions.closeShortcutHelp && (
        <ShortcutHelpOverlay
          catalog={shell.shortcutHelp.catalog}
          open={shell.shortcutHelp.open}
          onClose={actions.closeShortcutHelp}
        />
      )}
      {shell.coachMark && actions.dismissCoachMark && (
        <CoachMark
          mark={shell.coachMark.mark}
          onDismiss={actions.dismissCoachMark}
          onSkipAll={actions.skipCoachMarksForNow}
        />
      )}
    </div>
  );
}
