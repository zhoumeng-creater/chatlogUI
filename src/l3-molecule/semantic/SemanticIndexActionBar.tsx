import type { SemanticIndexActionIntent } from "@l2/commander/semanticSetupViewModel";
import { Button } from "@l4/ui/Button";

interface SemanticIndexActionBarProps {
  primaryAction: SemanticIndexActionIntent | null;
  secondaryActions: SemanticIndexActionIntent[];
  destructiveActions: SemanticIndexActionIntent[];
  busyCommand: string | null;
  onAction: (intent: SemanticIndexActionIntent) => void;
}

export function SemanticIndexActionBar({
  primaryAction,
  secondaryActions,
  destructiveActions,
  busyCommand,
  onAction,
}: SemanticIndexActionBarProps) {
  const allSecondary = [...secondaryActions, ...destructiveActions];
  return (
    <div className="semantic-index-actions">
      {primaryAction && (
        <Button
          variant={primaryAction.requiresConfirmation ? "secondary" : "primary"}
          size="sm"
          loading={busyCommand === primaryAction.command}
          onClick={() => onAction(primaryAction)}
        >
          {primaryAction.label}
        </Button>
      )}
      {allSecondary.map((action) => (
        <Button
          key={action.command}
          variant={action.requiresConfirmation ? "danger" : "secondary"}
          size="sm"
          loading={busyCommand === action.command}
          onClick={() => onAction(action)}
        >
          {action.label}
        </Button>
      ))}
    </div>
  );
}
