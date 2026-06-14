import { useEffect, useId, useRef, useState, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { SlidersHorizontal, X } from "lucide-react";
import type {
  WorkspaceScopeClearAction,
  WorkspaceScopeKind,
  WorkspaceScopeModel,
} from "@l2/commander/workspaceScopeModel";
import type { SearchFilterType } from "@/l2-coordinator/api-docs/search";
import { Button, DisabledReason, IconButton, Typography } from "@l4/ui";
import {
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
} from "@/l4-atom/ui/overlayFocus";
import { StatusAnnouncer } from "../common/StatusAnnouncer";

interface WorkspaceScopeControllerProps {
  model: WorkspaceScopeModel;
  onSelectScope?: (kind: WorkspaceScopeKind) => void;
  onSelectMessageType?: (type: SearchFilterType) => void;
  onClearChip?: (action: WorkspaceScopeClearAction) => void;
  onReset?: () => void;
}

export function WorkspaceScopeController({
  model,
  onSelectScope,
  onSelectMessageType,
  onClearChip,
  onReset,
}: WorkspaceScopeControllerProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<HTMLElement | null>(null);
  const generatedId = useId().replace(/:/g, "");
  const menuId = `workspace-scope-menu-${generatedId}`;
  const triggerId = `workspace-scope-trigger-${generatedId}`;

  useEffect(() => {
    if (!menuOpen) return undefined;

    const focusFrame = window.requestAnimationFrame(() => {
      focusInitialOverlayTarget(menuRef.current);
    });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;
      setMenuOpen(false);
      restoreFocusTarget(restoreTargetRef.current ?? document.getElementById(triggerId));
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [menuOpen, triggerId]);

  const controls = (
    <ScopeControls
      model={model}
      onSelectScope={onSelectScope}
      onSelectMessageType={onSelectMessageType}
    />
  );

  const handleMenuKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(menuRef.current, document.activeElement, event)) return;
    if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;

    event.preventDefault();
    setMenuOpen(false);
    restoreFocusTarget(restoreTargetRef.current ?? document.getElementById(triggerId));
  };

  return (
    <section
      className="workspace-scope-controller"
      aria-label={model.title}
      data-module={model.moduleId}
    >
      <div className="workspace-scope-controller__summary">
        <div className="workspace-scope-controller__copy">
          <Typography variant="label" weight={700}>
            {model.title}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {model.summaryDescription}
          </Typography>
        </div>
        <div className="workspace-scope-controller__actions">
          <ResetButton
            model={model}
            onReset={onReset}
          />
          <IconButton
            id={triggerId}
            icon={<SlidersHorizontal size={17} />}
            label="打开范围设置"
            tooltip="打开范围设置"
            aria-haspopup="dialog"
            aria-expanded={menuOpen}
            aria-controls={menuId}
            onClick={(event) => {
              restoreTargetRef.current = event.currentTarget;
              setMenuOpen((open) => !open);
            }}
          />
        </div>
      </div>

      <div className="workspace-scope-controller__chips" aria-label="已生效范围">
        {model.activeChips.map((chip) => (
          <span
            key={chip.id}
            className="workspace-scope-controller__chip"
            data-scope-field={chip.field}
          >
            <span>{chip.label}：{chip.value}</span>
            {chip.clearable && chip.clearAction && (
              <IconButton
                icon={<X size={14} />}
                label={`清除${chip.label}`}
                tooltip={`清除${chip.label}`}
                size="sm"
                onClick={() => onClearChip?.(chip.clearAction as WorkspaceScopeClearAction)}
              />
            )}
          </span>
        ))}
      </div>

      <div className="workspace-scope-controller__inline-controls">
        {controls}
      </div>
      <div
        ref={menuRef}
        id={menuId}
        className="workspace-scope-controller__menu"
        {...getOverlayDialogProps({ label: `${model.title}设置`, modal: false })}
        onKeyDown={handleMenuKeyDown}
        hidden={!menuOpen}
      >
        {controls}
      </div>
      <StatusAnnouncer message={model.announcement} />
    </section>
  );
}

function ScopeControls({
  model,
  onSelectScope,
  onSelectMessageType,
}: {
  model: WorkspaceScopeModel;
  onSelectScope?: (kind: WorkspaceScopeKind) => void;
  onSelectMessageType?: (type: SearchFilterType) => void;
}) {
  return (
    <div className="workspace-scope-controller__controls" aria-label="范围设置">
      <div className="workspace-scope-controller__control-group" role="toolbar" aria-label="会话范围">
        {model.scopeOptions.map((option) => (
          <ReasonedButton
            key={option.kind}
            selected={option.selected}
            disabled={option.disabled}
            disabledReason={option.disabledReason}
            onClick={() => onSelectScope?.(option.kind)}
          >
            {option.label}
          </ReasonedButton>
        ))}
      </div>
      {model.messageTypeOptions.length > 0 && (
        <div className="workspace-scope-controller__control-group" role="toolbar" aria-label="消息类型">
          {model.messageTypeOptions.map((option) => (
            <ReasonedButton
              key={option.value}
              selected={option.selected}
              disabled={option.disabled}
              disabledReason={option.disabledReason}
              onClick={() => onSelectMessageType?.(option.value)}
            >
              {option.label}
            </ReasonedButton>
          ))}
        </div>
      )}
    </div>
  );
}

function ReasonedButton({
  selected,
  disabled,
  disabledReason,
  onClick,
  children,
}: {
  selected: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onClick: () => void;
  children: string;
}) {
  const button = (
    <Button
      variant={selected ? "secondary" : "ghost"}
      size="md"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );

  if (!disabled || !disabledReason) return button;

  return (
    <DisabledReason reason={disabledReason} variant="compact">
      {button}
    </DisabledReason>
  );
}

function ResetButton({
  model,
  onReset,
}: {
  model: WorkspaceScopeModel;
  onReset?: () => void;
}) {
  const resetButton = (
    <Button
      variant="ghost"
      size="md"
      disabled={!model.canReset || model.pending}
      onClick={() => onReset?.()}
    >
      重置范围
    </Button>
  );

  if (model.canReset && !model.pending) return resetButton;

  return (
    <DisabledReason
      reason={model.pending ? "范围正在更新，请稍候。" : model.resetDisabledReason}
      variant="compact"
    >
      {resetButton}
    </DisabledReason>
  );
}
