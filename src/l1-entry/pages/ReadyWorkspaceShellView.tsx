import { useEffect, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { useAppShellCommander, useUpdateNotificationCommander } from "@l2/commander";
import type { EmptyStateActionId } from "@l2/commander/actionableEmptyStateModel";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
import { useWorkbenchShellCommander } from "@l2/commander/useWorkbenchShellCommander";
import { buildPrimaryWorkspaceRailItems, type PrimaryWorkspaceId } from "@l2/commander/primaryWorkspaceNavigation";
import { settingsMessagesZhCN } from "@l2/commander/messages.zh-CN";
import { ActionableEmptyState } from "@l3/common/ActionableEmptyState";
import { AppLayout } from "@l3/common/AppLayout";
import { DevConsole } from "@l3/common/DevConsole";
import { PrimaryWorkspaceRail } from "@l3/workspace/PrimaryWorkspaceRail";
import { StatusBar } from "@l3/common/StatusBar";
import { UpdateNotificationView } from "@l3/common/UpdateNotificationView";

interface ReadyWorkspaceShellViewProps {
  activeWorkspace: PrimaryWorkspaceId;
  workspaceTitle: string;
  children: ReactNode;
}

export function ReadyWorkspaceShellView({
  activeWorkspace,
  workspaceTitle,
  children,
}: ReadyWorkspaceShellViewProps) {
  const navigate = useNavigate();
  const shell = useWorkbenchShellCommander(activeWorkspace);
  const appShell = useAppShellCommander(workspaceTitle);
  const devConsole = useDevConsoleCommander();
  const updateNotification = useUpdateNotificationCommander();
  const workspaceRail = shell.workspaceRail;
  const setLastPrimaryRoute = workspaceRail.setLastPrimaryRoute;
  const railItems = buildPrimaryWorkspaceRailItems(activeWorkspace);
  const handleReadinessAction = (actionId: EmptyStateActionId) => {
    if (
      actionId === "configure-service" ||
      actionId === "check-service" ||
      actionId === "open-diagnostics" ||
      actionId === "open-settings"
    ) {
      navigate("/");
    }
  };

  useEffect(() => {
    setLastPrimaryRoute(activeWorkspace);
  }, [activeWorkspace, setLastPrimaryRoute]);

  if (!shell.view.renderWorkspaceContent) {
    return (
      <AppLayout shell={appShell.view} actions={appShell.actions}>
        <div className="page-column">
          <div className="centered-state">
            <ActionableEmptyState
              className="centered-state__surface"
              model={shell.view.readinessEmptyState}
              onAction={handleReadinessAction}
            />
          </div>
          <StatusBar
            copy={settingsMessagesZhCN.status}
            status={shell.sidecarStatus}
            httpReady={shell.view.effectiveHttpReady}
            dbReady={shell.view.effectiveDbReady}
            serviceLabel={shell.serviceLabel}
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout shell={appShell.view} actions={appShell.actions}>
      <div className="page-column">
        <div
          className="ready-workspace-shell page-fill"
          data-rail-mode={workspaceRail.mode}
        >
          <aside className="ready-workspace-shell__rail" aria-label="一级工作区导航">
            <PrimaryWorkspaceRail
              railMode={workspaceRail.mode}
              showLabels={workspaceRail.showLabels}
              canToggleLabels={workspaceRail.canToggleLabels}
              items={railItems}
              onToggleLabels={workspaceRail.toggleLabels}
              onNavigate={(route, id) => {
                setLastPrimaryRoute(id);
                navigate(withSmokeQuery(route));
              }}
            />
          </aside>
          <section className="ready-workspace-shell__content" aria-label={workspaceTitle}>
            {children}
          </section>
        </div>
        <UpdateNotificationView
          view={updateNotification.view}
          status={updateNotification.status}
          notes={updateNotification.notes}
          actions={updateNotification.actions}
        />
        <DevConsole view={devConsole.view} actions={devConsole.actions} />
        <StatusBar
          copy={settingsMessagesZhCN.status}
          status={shell.sidecarStatus}
          httpReady={shell.view.effectiveHttpReady}
          dbReady={shell.view.effectiveDbReady}
          serviceLabel={shell.serviceLabel}
        />
      </div>
    </AppLayout>
  );
}

function withSmokeQuery(route: string): string {
  if (typeof window === "undefined") return route;
  const params = new URLSearchParams(window.location.search);
  return params.get("codex-smoke") === "workbench-ready"
    ? `${route}${route.includes("?") ? "&" : "?"}codex-smoke=workbench-ready`
    : route;
}
