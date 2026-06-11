import { useEffect, useRef, type KeyboardEvent, type MouseEvent } from "react";
import {
  Button,
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  Typography,
  type ButtonVariant,
  type FocusTarget,
} from "@l4/ui";

interface SemanticConfirmDialogProps {
  heading: string;
  body: string;
  cancelLabel: string;
  confirmLabel: string;
  confirmVariant: ButtonVariant;
  confirming: boolean;
  onCancel: () => void;
  onConfirm: () => void;
  titleId?: string;
}

export function SemanticConfirmDialog({
  heading,
  body,
  cancelLabel,
  confirmLabel,
  confirmVariant,
  confirming,
  onCancel,
  onConfirm,
  titleId = "semantic-confirm-title",
}: SemanticConfirmDialogProps) {
  const panelRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);
  const dismissible = !confirming;

  useEffect(() => {
    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    focusInitialOverlayTarget(panelRef.current);

    return () => {
      restoreFocusTarget(restoreTargetRef.current);
    };
  }, []);

  const handleBackdropClick = (event: MouseEvent<HTMLDivElement>) => {
    if (event.target === event.currentTarget && dismissible) {
      onCancel();
    }
  };

  const handlePanelKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(panelRef.current, document.activeElement, event)) return;
    if (shouldCloseOverlayOnKey(event.key, { dismissible })) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div className="semantic-confirm" onClick={handleBackdropClick}>
      <div
        {...getOverlayDialogProps({ titleId })}
        ref={panelRef}
        className="semantic-confirm__panel"
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
      >
        <Typography id={titleId} variant="body" weight={600}>
          {heading}
        </Typography>
        <Typography variant="caption" color="var(--color-text-secondary)">
          {body}
        </Typography>
        <div className="semantic-confirm__actions">
          <Button variant="ghost" size="md" disabled={confirming} onClick={onCancel}>
            {cancelLabel}
          </Button>
          <Button variant={confirmVariant} size="md" loading={confirming} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
