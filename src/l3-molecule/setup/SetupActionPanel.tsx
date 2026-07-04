import { ArrowRight, RotateCw } from "lucide-react";
import type { SetupActionId, SetupCenterActionView } from "@l2/commander/setupCenterViewModel";
import { Button, Surface, Typography } from "@l4/ui";

interface SetupActionPanelProps {
  headingId?: string;
  heading: string;
  description: string;
  primaryAction: SetupCenterActionView;
  secondaryActions: SetupCenterActionView[];
  onAction: (actionId: SetupActionId) => void;
}

export function SetupActionPanel({
  headingId,
  heading,
  description,
  primaryAction,
  secondaryActions,
  onAction,
}: SetupActionPanelProps) {
  return (
    <Surface variant="raised" className="setup-action-panel" aria-label="开始设置">
      <div className="setup-action-panel__copy">
        <Typography id={headingId} variant="h2">{heading}</Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {description}
        </Typography>
      </div>

      <div className="setup-action-panel__primary">
        {primaryAction.helperText && (
          <Typography variant="caption" color="var(--text-secondary)">
            {primaryAction.helperText}
          </Typography>
        )}
        <Button
          type="button"
          variant={primaryAction.variant}
          size="lg"
          loading={Boolean(primaryAction.busy)}
          disabled={primaryAction.disabled}
          onClick={() => onAction(primaryAction.id)}
        >
          {primaryAction.busy ? <RotateCw size={16} aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}
          {primaryAction.label}
        </Button>
      </div>

      {secondaryActions.length > 0 && (
        <div className="setup-action-panel__secondary" aria-label="其他设置操作">
          {secondaryActions.map((action) => (
            <Button
              key={action.id}
              type="button"
              variant={action.variant}
              disabled={action.disabled}
              onClick={() => onAction(action.id)}
            >
              {action.label}
            </Button>
          ))}
        </div>
      )}
    </Surface>
  );
}
