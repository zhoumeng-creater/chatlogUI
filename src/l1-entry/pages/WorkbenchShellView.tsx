import { ReadyWorkspaceShellView } from "./ReadyWorkspaceShellView";
import { WorkbenchView } from "./WorkbenchView";

export function WorkbenchShellView() {
  return (
    <ReadyWorkspaceShellView activeWorkspace="workbench" workspaceTitle="工作台">
      <WorkbenchView />
    </ReadyWorkspaceShellView>
  );
}
