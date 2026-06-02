import type { ReadinessState } from "@l2/data-clerk/types/readiness";
import { getReadinessTone } from "@l2/data-clerk/types/readiness";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

interface ReadinessStatePanelProps {
  state: ReadinessState;
  onAction?: () => void;
}

export function ReadinessStatePanel({ state, onAction }: ReadinessStatePanelProps) {
  return (
    <Surface variant="subtle" className="readiness-state-panel">
      <div className="readiness-state-panel__header">
        <StatusIndicator
          label={state.title}
          tone={getReadinessTone(state.status)}
          busy={state.status === "loading"}
        />
      </div>
      <Typography variant="body" color="var(--text-secondary)">
        {state.message}
      </Typography>
      {state.recoveryAction && state.recoveryAction.kind !== "none" && (
        <Button variant="secondary" size="sm" onClick={onAction}>
          {state.recoveryAction.label}
        </Button>
      )}
    </Surface>
  );
}
