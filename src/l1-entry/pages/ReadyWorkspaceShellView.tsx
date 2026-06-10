import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAppShellCommander, useWorkbenchShellCommander } from "@l2/commander";
import {
  buildPrimaryWorkspaceNavItems,
  type PrimaryWorkspaceDestination,
} from "@l2/commander/primaryWorkspaceNavigation";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { PrimaryWorkspaceRail } from "@l3/workspace/PrimaryWorkspaceRail";
import { StatusIndicator, Surface, Typography } from "@l4/ui";

interface ReadyWorkspaceShellViewProps {
  pageTitle: string;
  activeDestination: PrimaryWorkspaceDestination;
  children: ReactNode;
}

export function ReadyWorkspaceShellView({
  pageTitle,
  activeDestination,
  children,
}: ReadyWorkspaceShellViewProps) {
  const navigate = useNavigate();
  const shell = useWorkbenchShellCommander();
  const appShell = useAppShellCommander(pageTitle);
  const showRailLabels = useShowRailLabels();

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
          />
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout shell={appShell.view} actions={appShell.actions}>
      <div className="page-column">
        <div className="ready-workspace-shell page-fill">
          <PrimaryWorkspaceRail
            showLabels={showRailLabels}
            items={buildPrimaryWorkspaceNavItems(activeDestination)}
            onNavigate={(href) => navigate(href)}
          />
          <section className="ready-workspace-shell__content" aria-label={pageTitle}>
            {children}
          </section>
        </div>
        <StatusBar
          status={shell.sidecarStatus}
          httpReady={shell.view.effectiveHttpReady}
          dbReady={shell.view.effectiveDbReady}
        />
      </div>
    </AppLayout>
  );
}

function useShowRailLabels(): boolean {
  const [showLabels, setShowLabels] = useState(() =>
    typeof window === "undefined" ? true : window.innerWidth >= 1280,
  );

  useEffect(() => {
    const handleResize = () => setShowLabels(window.innerWidth >= 1280);
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return showLabels;
}
