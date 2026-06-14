import { useEffect, useId, useState, type ReactNode } from "react";
import {
  CalendarDays,
  Download,
  Info,
  MoreHorizontal,
  Search,
} from "lucide-react";
import type {
  WorkspaceCommandAction,
  WorkspaceCommandBarModel,
  WorkspaceCommandId,
} from "@l2/commander/workspaceCommandBarModel";
import { Button, DisabledReason, IconButton, Tooltip } from "@l4/ui";

interface WorkspaceCommandBarProps {
  model: WorkspaceCommandBarModel;
  onAction: (id: WorkspaceCommandId) => void;
}

export function WorkspaceCommandBar({ model, onAction }: WorkspaceCommandBarProps) {
  const [overflowOpen, setOverflowOpen] = useState(false);
  const menuId = useId().replace(/:/g, "");
  const overflowButtonId = `${menuId}-trigger`;
  const overflowCount = model.overflow.length;

  useEffect(() => {
    if (!overflowOpen) return undefined;

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      setOverflowOpen(false);
      document.getElementById(overflowButtonId)?.focus();
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [overflowButtonId, overflowOpen]);

  return (
    <div className="workspace-command-bar" aria-label="当前会话工具栏">
      <div className="workspace-command-bar__main">
        {model.primary.map((action) => (
          <CommandButton
            key={action.id}
            action={action}
            variant="secondary"
            onAction={onAction}
          />
        ))}
        {model.secondary.map((action) => (
          <CommandButton
            key={action.id}
            action={action}
            variant="ghost"
            onAction={onAction}
          />
        ))}
      </div>

      {overflowCount > 0 && (
        <div className="workspace-command-bar__overflow">
          <IconButton
            id={overflowButtonId}
            icon={<MoreHorizontal size={17} />}
            label="更多当前会话操作"
            tooltip="更多当前会话操作"
            aria-haspopup="menu"
            aria-expanded={overflowOpen}
            aria-controls={menuId}
            onClick={() => setOverflowOpen((open) => !open)}
          />
          <div
            id={menuId}
            className="workspace-command-bar__menu"
            role="menu"
            hidden={!overflowOpen}
          >
            {model.overflow.map((action) => (
              <CommandMenuItem
                key={action.id}
                action={action}
                onAction={(id) => {
                  onAction(id);
                  setOverflowOpen(false);
                }}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function CommandButton({
  action,
  variant,
  onAction,
}: {
  action: WorkspaceCommandAction;
  variant: "secondary" | "ghost";
  onAction: (id: WorkspaceCommandId) => void;
}) {
  const button = (
    <Button
      variant={variant}
      size={action.minTargetPx >= 40 ? "md" : "sm"}
      disabled={action.disabled}
      onClick={() => onAction(action.id)}
    >
      {getCommandIcon(action.id)}
      {action.label}
    </Button>
  );

  if (!action.disabled || !action.disabledReason) return button;

  return (
    <DisabledReason reason={action.disabledReason}>
      {button}
    </DisabledReason>
  );
}

function CommandMenuItem({
  action,
  onAction,
}: {
  action: WorkspaceCommandAction;
  onAction: (id: WorkspaceCommandId) => void;
}) {
  const item = (
    <button
      type="button"
      role="menuitem"
      className="workspace-command-bar__menu-item"
      disabled={action.disabled}
      onClick={() => onAction(action.id)}
    >
      {getCommandIcon(action.id)}
      <span>{action.label}</span>
    </button>
  );

  if (!action.disabled || !action.disabledReason) {
    return (
      <Tooltip label={action.label} placement="left">
        {item}
      </Tooltip>
    );
  }

  return (
    <DisabledReason reason={action.disabledReason}>
      <Tooltip label={action.disabledReason} placement="left">
        {item}
      </Tooltip>
    </DisabledReason>
  );
}

function getCommandIcon(id: WorkspaceCommandId): ReactNode {
  switch (id) {
    case "search-current":
      return <Search size={15} />;
    case "details":
      return <Info size={15} />;
    case "export-current":
      return <Download size={15} />;
    case "jump-date":
      return <CalendarDays size={15} />;
  }
}
