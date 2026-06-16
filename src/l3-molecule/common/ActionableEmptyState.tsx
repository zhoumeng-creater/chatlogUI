import { AlertCircle, ArrowRight, RefreshCw, Settings, SlidersHorizontal, Wrench } from "lucide-react";
import type {
  ActionableEmptyStateAction,
  ActionableEmptyStateView,
  EmptyStateActionId,
} from "@l2/commander/actionableEmptyStateModel";
import { Button, DisabledReason, Typography } from "@l4/ui";
import { classNames } from "@/utils/classNames";

interface ActionableEmptyStateProps {
  model: ActionableEmptyStateView;
  onAction?: (actionId: EmptyStateActionId) => void;
  className?: string;
}

export function ActionableEmptyState({
  model,
  onAction,
  className = "",
}: ActionableEmptyStateProps) {
  return (
    <section
      className={classNames("actionable-empty-state", className)}
      data-empty-state={model.id}
      aria-label={model.title}
    >
      <div className="actionable-empty-state__icon" aria-hidden="true">
        <AlertCircle size={18} />
      </div>
      <div className="actionable-empty-state__copy">
        <Typography variant="label" weight={700}>
          {model.title}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {model.reason}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {model.description}
        </Typography>
        {model.statusCopy && (
          <Typography variant="caption" color="var(--text-muted)">
            {model.statusCopy}
          </Typography>
        )}
      </div>
      <div className="actionable-empty-state__actions">
        {model.actions.map((actionItem) => (
          <ActionButton
            key={actionItem.id}
            action={actionItem}
            onAction={onAction}
          />
        ))}
      </div>
    </section>
  );
}

function ActionButton({
  action,
  onAction,
}: {
  action: ActionableEmptyStateAction;
  onAction?: (actionId: EmptyStateActionId) => void;
}) {
  const disabledReason = action.disabledReason
    ?? (!onAction ? "当前区域没有接入这个操作。" : null);
  const disabled = action.disabled || !onAction;
  const button = (
    <Button
      variant={action.variant}
      size="md"
      disabled={disabled}
      onClick={() => onAction?.(action.id)}
    >
      {actionIcon(action.id)}
      {action.label}
    </Button>
  );

  if (!disabled || !disabledReason) return button;

  return (
    <DisabledReason reason={disabledReason} variant="compact">
      {button}
    </DisabledReason>
  );
}

function actionIcon(id: EmptyStateActionId) {
  if (id === "refresh" || id === "retry" || id === "check-service") return <RefreshCw size={14} />;
  if (id === "configure-service" || id === "open-settings" || id === "build-index") return <Settings size={14} />;
  if (id === "clear-filters" || id === "clear-search") return <SlidersHorizontal size={14} />;
  if (id === "open-diagnostics") return <Wrench size={14} />;
  return <ArrowRight size={14} />;
}
