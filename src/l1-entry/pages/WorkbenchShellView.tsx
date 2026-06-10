import { ReadyWorkspaceShellView } from "./ReadyWorkspaceShellView";
import { WorkbenchView } from "./WorkbenchView";

export function WorkbenchShellView() {
  return (
    <ReadyWorkspaceShellView pageTitle="工作台" activeDestination="workbench">
      <WorkbenchView />
    </ReadyWorkspaceShellView>
  );
}
