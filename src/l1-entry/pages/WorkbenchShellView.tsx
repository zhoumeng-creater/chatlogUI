import { Link } from "react-router-dom";
import { useAppShellCommander, useWorkbenchShellCommander } from "@l2/commander";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { StatusIndicator, Surface, Typography } from "@l4/ui";
import { WorkbenchView } from "./WorkbenchView";

export function WorkbenchShellView() {
  const shell = useWorkbenchShellCommander();
  const appShell = useAppShellCommander("工作台");

  if (shell.view.renderWorkbench) {
    return <WorkbenchView />;
  }

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
