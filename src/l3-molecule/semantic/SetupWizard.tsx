import type {
  SemanticSetupDraft,
  SemanticSetupView,
} from "@l2/commander/semanticSetupViewModel";
import type { ConnectionTestResult } from "@/l2-coordinator/api-docs/semantic";
import { SpringModal } from "@l4/ui/SpringModal";
import { SemanticSetupCenter } from "./SemanticSetupCenter";

interface SetupWizardProps {
  onClose: () => void;
  initialDraft: SemanticSetupDraft;
  getSetupView: (draft: SemanticSetupDraft) => SemanticSetupView;
  testConnection: (draft: SemanticSetupDraft) => Promise<ConnectionTestResult>;
  saveConfig: (draft: SemanticSetupDraft) => Promise<void>;
  privacyOn?: boolean;
}

export function SetupWizard({
  onClose,
  initialDraft,
  getSetupView,
  testConnection,
  saveConfig,
  privacyOn = false,
}: SetupWizardProps) {
  return (
    <SpringModal onClose={onClose}>
      <SemanticSetupCenter
        initialDraft={initialDraft}
        getSetupView={getSetupView}
        onTestConnection={testConnection}
        onSave={saveConfig}
        onClose={onClose}
        privacyOn={privacyOn}
      />
    </SpringModal>
  );
}
