import {
  Clock,
  Copy,
  FileText,
  ListFilter,
  MoreHorizontal,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import {
  DisabledReason,
  IconButton,
  focusInitialOverlayTarget,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "@l4/ui";
import type { MessageActionId, MessageActionItem, MessageActionModel } from "@l2/commander/messageActionModel";

interface MessageActionMenuProps {
  model: MessageActionModel;
  open: boolean;
  onToggleOpen: () => void;
  onAction: (id: MessageActionId) => void;
}

const ACTION_ICONS: Record<MessageActionId, ReactNode> = {
  "copy-message": <Copy size={15} />,
  "copy-time": <Clock size={15} />,
  "copy-sender": <UserRound size={15} />,
  "copy-markdown-quote": <FileText size={15} />,
  "jump-to-time": <Clock size={15} />,
  "find-similar": <Search size={15} />,
  "view-safe-raw-fields": <ListFilter size={15} />,
  "copy-unmasked-message": <Copy size={15} />,
};

export function MessageActionMenu({
  model,
  open,
  onToggleOpen,
  onAction,
}: MessageActionMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);
  const generatedId = useId().replace(/:/g, "");
  const menuId = `message-action-menu-${generatedId}`;

  useEffect(() => {
    if (!open) return undefined;
    if (!restoreTargetRef.current && typeof document !== "undefined") {
      restoreTargetRef.current = document.activeElement as FocusTarget | null;
    }
    const frame = window.requestAnimationFrame(() => {
      focusInitialOverlayTarget(menuRef.current);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, [open]);

  const closeMenu = () => {
    if (!open) return;
    onToggleOpen();
  };

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(menuRef.current, document.activeElement, event)) return;
    if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;

    event.preventDefault();
    event.stopPropagation();
    closeMenu();
  };

  return (
    <div className="message-action-menu" aria-label="消息操作">
      <IconButton
        icon={<MoreHorizontal size={16} />}
        label={open ? "关闭消息操作" : "打开消息操作"}
        tooltip={open ? "关闭消息操作" : "消息操作"}
        size="md"
        active={open}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={(event) => {
          restoreTargetRef.current = event.currentTarget;
          onToggleOpen();
        }}
      />
      <div
        id={menuId}
        ref={menuRef}
        className="message-action-menu__items"
        role="menu"
        aria-label="消息操作菜单"
        hidden={!open}
        onKeyDown={handleMenuKeyDown}
      >
        {model.actions.map((action) => renderAction(action, (actionId) => {
          onAction(actionId);
          restoreFocusTarget(restoreTargetRef.current);
        }))}
      </div>
    </div>
  );
}

function renderAction(action: MessageActionItem, onAction: (id: MessageActionId) => void) {
  const button = (
    <button
      key={action.id}
      type="button"
      role="menuitem"
      className="message-action-menu__item"
      disabled={!action.enabled}
      onClick={() => onAction(action.id)}
    >
      <span aria-hidden="true">{ACTION_ICONS[action.id]}</span>
      <span>{action.label}</span>
    </button>
  );

  if (!action.disabledReason || action.enabled) return button;

  return (
    <DisabledReason
      key={action.id}
      reason={action.disabledReason}
      variant="compact"
      className="message-action-menu__disabled-reason"
    >
      {button}
    </DisabledReason>
  );
}
