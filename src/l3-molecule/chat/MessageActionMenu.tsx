import {
  CheckSquare,
  Clock,
  Copy,
  FileText,
  ListFilter,
  MoreHorizontal,
  Search,
  UserRound,
} from "lucide-react";
import { useCallback, useEffect, useId, useRef, type KeyboardEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  DisabledReason,
  IconButton,
  focusInitialOverlayTarget,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "@l4/ui";
import {
  resolveFloatingMenuPosition,
  type FloatingMenuPlacement,
} from "@l4/ui/floatingPlacement";
import type { MessageActionId, MessageActionItem, MessageActionModel } from "@l2/commander/messageActionModel";

interface MessageActionMenuProps {
  model: MessageActionModel;
  open: boolean;
  onToggleOpen: () => void;
  onAction: (id: MessageActionId) => void;
}

const ACTION_ICONS: Record<MessageActionId, ReactNode> = {
  "select-message": <CheckSquare size={15} />,
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
  const containerRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);
  const placementRef = useRef<FloatingMenuPlacement>("top-end");
  const generatedId = useId().replace(/:/g, "");
  const menuId = `message-action-menu-${generatedId}`;

  const closeMenu = useCallback(() => {
    if (!open) return;
    onToggleOpen();
  }, [onToggleOpen, open]);

  useEffect(() => {
    if (!open) return undefined;
    if (!restoreTargetRef.current && typeof document !== "undefined") {
      restoreTargetRef.current = document.activeElement as FocusTarget | null;
    }
    const frame = window.requestAnimationFrame(() => {
      const container = containerRef.current;
      const menu = menuRef.current;
      if (container && menu) {
        const position = resolveFloatingMenuPosition({
          preferred: "top-end",
          triggerRect: container.getBoundingClientRect(),
          overlaySize: {
            width: menu.offsetWidth || 190,
            height: menu.offsetHeight || 260,
          },
          viewportWidth: window.innerWidth,
          viewportHeight: window.innerHeight,
        });
        placementRef.current = position.placement;
        menu.dataset.placement = placementRef.current;
        menu.style.setProperty("--floating-menu-left", `${Math.round(position.left)}px`);
        menu.style.setProperty("--floating-menu-top", `${Math.round(position.top)}px`);
      }
      focusInitialOverlayTarget(menuRef.current);
    });

    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target instanceof Node ? event.target : null;
      if (!target || containerRef.current?.contains(target) || menuRef.current?.contains(target)) return;
      closeMenu();
    };

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("pointerdown", handlePointerDown);
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, [closeMenu, open]);

  const handleMenuKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(menuRef.current, document.activeElement, event)) return;
    if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;

    event.preventDefault();
    event.stopPropagation();
    closeMenu();
  };

  const menu = (
    <div
      id={menuId}
      ref={menuRef}
      className="message-action-menu__items"
      data-placement={placementRef.current}
      role="menu"
      aria-label="消息操作菜单"
      hidden={!open}
      onKeyDown={handleMenuKeyDown}
    >
      {model.actions.map((action) => renderAction(action, (actionId) => {
        closeMenu();
        onAction(actionId);
        restoreFocusTarget(restoreTargetRef.current);
      }))}
    </div>
  );

  return (
    <div ref={containerRef} className="message-action-menu" aria-label="消息操作">
      <IconButton
        icon={<MoreHorizontal size={16} />}
        label={open ? "关闭消息操作" : "打开消息操作"}
        size="md"
        active={open}
        tooltip={false}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-controls={menuId}
        onClick={(event) => {
          restoreTargetRef.current = event.currentTarget;
          onToggleOpen();
        }}
      />
      {typeof document === "undefined" ? menu : createPortal(menu, document.body)}
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
