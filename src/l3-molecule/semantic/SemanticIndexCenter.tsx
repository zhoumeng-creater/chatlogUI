import { useState } from "react";
import type {
  SemanticIndexActionIntent,
  SemanticIndexCenterView,
} from "@l2/commander/semanticSetupViewModel";
import { Button } from "@l4/ui/Button";
import { ProgressBar } from "@l4/ui/ProgressBar";
import { Typography } from "@l4/ui/Typography";
import { SemanticIndexActionBar } from "./SemanticIndexActionBar";
import { SemanticIndexStatusPanel } from "./SemanticIndexStatusPanel";
import { getSafeSemanticDiagnosticText } from "./semanticSetupDisplay";

interface SemanticIndexCenterProps {
  view: SemanticIndexCenterView;
  onAction: (command: SemanticIndexActionIntent["command"]) => Promise<void>;
}

export function SemanticIndexCenter({ view, onAction }: SemanticIndexCenterProps) {
  const [confirming, setConfirming] = useState<SemanticIndexActionIntent | null>(null);
  const [busyCommand, setBusyCommand] = useState<string | null>(null);
  const [error, setError] = useState("");

  const runAction = async (intent: SemanticIndexActionIntent) => {
    if (intent.requiresConfirmation) {
      setConfirming(intent);
      return;
    }
    await performAction(intent);
  };

  const performAction = async (intent: SemanticIndexActionIntent) => {
    setBusyCommand(intent.command);
    setError("");
    try {
      await onAction(intent.command);
      setConfirming(null);
    } catch (actionError) {
      setError(getSafeSemanticDiagnosticText(actionError instanceof Error ? actionError.message : "索引操作失败"));
    } finally {
      setBusyCommand(null);
    }
  };

  return (
    <section className="semantic-index-center" aria-label="语义索引中心">
      <div className="semantic-index-center__header">
        <div>
          <Typography variant="body" weight={600}>
            {view.title}
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            {view.message}
          </Typography>
        </div>
      </div>

      {view.kind === "running" && (
        <ProgressBar
          progress={view.progressPct}
          label="正在构建语义索引"
          variant={view.progressPct === 0 ? "indeterminate" : "default"}
        />
      )}

      <SemanticIndexStatusPanel metrics={view.metrics} />
      <SemanticIndexActionBar
        primaryAction={view.primaryAction}
        secondaryActions={view.secondaryActions}
        destructiveActions={view.destructiveActions}
        busyCommand={busyCommand}
        onAction={runAction}
      />

      {error && (
        <p className="semantic-index-center__error" role="alert">
          {error}
        </p>
      )}

      {confirming && (
        <div className="semantic-confirm" role="dialog" aria-modal="true" aria-label={confirming.confirmationTitle}>
          <div className="semantic-confirm__panel">
            <Typography variant="body" weight={600}>
              {confirming.confirmationTitle}
            </Typography>
            <Typography variant="caption" color="var(--color-text-secondary)">
              {confirming.confirmationBody}
            </Typography>
            <div className="semantic-confirm__actions">
              <Button variant="ghost" size="sm" onClick={() => setConfirming(null)}>
                取消
              </Button>
              <Button
                variant="danger"
                size="sm"
                loading={busyCommand === confirming.command}
                onClick={() => performAction(confirming)}
              >
                确认
              </Button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
