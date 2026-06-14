import { useEffect, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppShellCommander, useUpdateNotificationCommander } from "@l2/commander";
import { useDevConsoleCommander } from "@l2/commander/useDevConsoleCommander";
import { useWorkbenchShellCommander } from "@l2/commander/useWorkbenchShellCommander";
import { buildPrimaryWorkspaceRailItems, type PrimaryWorkspaceId } from "@l2/commander/primaryWorkspaceNavigation";
import { AppLayout } from "@l3/common/AppLayout";
import { DevConsole } from "@l3/common/DevConsole";
import { PrimaryWorkspaceRail } from "@l3/workspace/PrimaryWorkspaceRail";
import { StatusBar } from "@l3/common/StatusBar";
import { UpdateNotificationView } from "@l3/common/UpdateNotificationView";
import { StatusIndicator, Surface, Typography } from "@l4/ui";

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
  const shell = useWorkbenchShellCommander();
  const appShell = useAppShellCommander(workspaceTitle);
  const devConsole = useDevConsoleCommander();
  const updateNotification = useUpdateNotificationCommander();
  const workspaceRail = shell.workspaceRail;
  const setLastPrimaryRoute = workspaceRail.setLastPrimaryRoute;
  const railItems = buildPrimaryWorkspaceRailItems(activeWorkspace);

  useEffect(() => {
    setLastPrimaryRoute(activeWorkspace);
  }, [activeWorkspace, setLastPrimaryRoute]);

  if (!shell.view.renderWorkbench) {
    return (
      <AppLayout shell={appShell.view} actions={appShell.actions}>
        <div className="page-column">
          <div className="centered-state">
            <Surface variant="raised" className="centered-state__surface">
              <div className="centered-state__content">
                <StatusIndicator
                  label={shell.view.statusText}
                  tone={shell.view.statusTone}
                />
                <Typography variant="h3">{shell.view.title}</Typography>
                <Typography variant="body" color="var(--text-secondary)">
                  {shell.view.message}
                </Typography>
                <Link to="/" className="ui-button ui-button--primary ui-button--md">
                  {shell.view.setupLinkLabel}
                </Link>
              </div>
            </Surface>
          </div>
          <StatusBar
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
