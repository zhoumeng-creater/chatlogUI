import type { ServerConfigDraft } from "@l4/system";
import type { SetupActionId } from "./setupCenterViewModel";

interface SetupActionReadiness {
  httpReady: boolean;
  dbReady: boolean;
}

export interface SetupActionDispatcherDeps {
  manualDraft: ServerConfigDraft;
  externalBaseUrlDraft: string;
  chooseAndImportDataDirectory: () => Promise<string | null>;
  saveManualConfig: (draft: ServerConfigDraft) => Promise<void>;
  startManagedService: () => Promise<void>;
  connectExternalService: (baseUrl: string) => Promise<void>;
  checkReadiness: () => Promise<void>;
  inspectServicePort: () => Promise<void>;
  stopManagedService: () => Promise<void>;
  openWorkbench: () => void;
  getReadiness: () => SetupActionReadiness;
}

export async function runSetupAction(
  actionId: SetupActionId,
  deps: SetupActionDispatcherDeps,
): Promise<void> {
  switch (actionId) {
    case "choose-data-directory":
      await deps.chooseAndImportDataDirectory();
      break;
    case "save-manual-config":
      await deps.saveManualConfig(deps.manualDraft);
      break;
    case "start-managed-service":
      await deps.startManagedService();
      break;
    case "connect-external-service":
      await deps.connectExternalService(deps.externalBaseUrlDraft);
      break;
    case "refresh-database":
      await deps.checkReadiness();
      break;
    case "inspect-service-port":
      await deps.inspectServicePort();
      break;
    case "stop-managed-service":
      await deps.stopManagedService();
      break;
    case "open-workbench":
      deps.openWorkbench();
      break;
  }

  if (shouldAutoOpenWorkbench(actionId, deps.getReadiness())) {
    deps.openWorkbench();
  }
}

export function shouldAutoOpenWorkbench(
  actionId: SetupActionId,
  readiness: SetupActionReadiness,
): boolean {
  return actionId === "start-managed-service" && readiness.httpReady && readiness.dbReady;
}
