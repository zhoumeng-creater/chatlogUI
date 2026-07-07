import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type ReactNode } from "react";
import { createPortal } from "react-dom";
import {
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "./overlayFocus";

interface SpringModalProps {
  children: ReactNode;
  onClose: () => void;
  ariaLabel?: string;
  titleId?: string;
  closeOnBackdrop?: boolean;
  closeOnEscape?: boolean;
}

export function SpringModal({
  children,
  onClose,
  ariaLabel = "对话框",
  titleId,
  closeOnBackdrop = true,
  closeOnEscape = true,
}: SpringModalProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);

  useEffect(() => {
    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    focusInitialOverlayTarget(panelRef.current);

    return () => {
      restoreFocusTarget(restoreTargetRef.current);
    };
  }, []);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && closeOnBackdrop) {
      onClose();
    }
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(panelRef.current, document.activeElement, event)) return;
    if (shouldCloseOverlayOnKey(event.key, { dismissible: closeOnEscape })) {
      event.preventDefault();
      onClose();
    }
  };

  const modal = (
    <div
      className="spring-modal__backdrop"
      data-close-on-backdrop={String(closeOnBackdrop)}
      onClick={handleBackdropClick}
    >
      <div
        {...getOverlayDialogProps({ titleId, label: ariaLabel })}
        ref={panelRef}
        className="spring-modal__panel"
        data-close-on-escape={String(closeOnEscape)}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        {children}
      </div>
    </div>
  );

  if (typeof document === "undefined") return modal;
  return createPortal(modal, document.body);
}
