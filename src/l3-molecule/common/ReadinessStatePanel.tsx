import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

export type ReadinessStatus =
  | "idle"
  | "loading"
  | "empty"
  | "success"
  | "error"
  | "conflict"
  | "cancelled";

export interface ReadinessStateView {
  status: ReadinessStatus;
  title: string;
  message: string;
  recoveryAction?: {
    label: string;
    kind: "retry" | "choose-directory" | "open-settings" | "copy-diagnostics" | "stop-stream" | "none";
  };
}

interface ReadinessStatePanelProps {
  state: ReadinessStateView;
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

function getReadinessTone(status: ReadinessStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (status) {
    case "loading":
      return "info";
    case "success":
      return "success";
    case "error":
      return "danger";
    case "conflict":
      return "warning";
    case "idle":
    case "empty":
    case "cancelled":
      return "neutral";
  }
}
