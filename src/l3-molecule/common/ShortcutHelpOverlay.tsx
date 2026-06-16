import { useEffect, useId, useRef, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { Keyboard, X } from "lucide-react";
import type { ShortcutHelpCatalog } from "@l2/commander/shortcutCatalog";
import { Button, IconButton, Typography } from "@l4/ui";
import {
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "@/l4-atom/ui/overlayFocus";

interface ShortcutHelpOverlayProps {
  catalog: ShortcutHelpCatalog;
  open: boolean;
  onClose: () => void;
}

export function ShortcutHelpOverlay({ catalog, open, onClose }: ShortcutHelpOverlayProps) {
  const titleId = `shortcut-help-title-${useId().replace(/:/g, "")}`;
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);

  useEffect(() => {
    if (!open) return undefined;
    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    const focusFrame = window.requestAnimationFrame(() => {
      focusInitialOverlayTarget(dialogRef.current);
    });

    return () => {
      window.cancelAnimationFrame(focusFrame);
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return undefined;
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;
      event.preventDefault();
      onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, open]);

  if (!open) return null;

  const handleDialogKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(dialogRef.current, document.activeElement, event)) return;
    if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;
    event.preventDefault();
    onClose();
  };

  return (
    <div className="shortcut-help-backdrop">
      <div
        ref={dialogRef}
        className="shortcut-help-overlay"
        {...getOverlayDialogProps({ titleId })}
        onKeyDown={handleDialogKeyDown}
      >
        <div className="shortcut-help-overlay__header">
          <div className="shortcut-help-overlay__title">
            <Keyboard size={18} aria-hidden="true" />
            <div>
              <Typography id={titleId} variant="h3">
                {catalog.title}
              </Typography>
              <Typography variant="caption" color="var(--text-secondary)">
                {catalog.description}
              </Typography>
            </div>
          </div>
          <IconButton
            icon={<X size={16} />}
            label="关闭快捷键帮助"
            tooltip="关闭快捷键帮助"
            onClick={onClose}
          />
        </div>
        <div className="shortcut-help-overlay__groups">
          {catalog.groups.map((group) => (
            <section key={group.id} className="shortcut-help-group" aria-label={group.label}>
              <Typography variant="label" weight={700}>
                {group.label}
              </Typography>
              <div className="shortcut-help-group__list">
                {group.shortcuts.map((shortcut) => (
                  <div
                    key={shortcut.id}
                    className="shortcut-help-row"
                    aria-disabled={!shortcut.enabled}
                  >
                    <span className="shortcut-help-row__keys">
                      <kbd>{shortcut.keyLabel}</kbd>
                      {shortcut.alternativeKeyLabel && <kbd>{shortcut.alternativeKeyLabel}</kbd>}
                    </span>
                    <span className="shortcut-help-row__copy">
                      <strong>{shortcut.actionLabel}</strong>
                      <span>{shortcut.enabled ? shortcut.description : shortcut.disabledReason}</span>
                    </span>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <div className="shortcut-help-overlay__footer">
          <Button variant="secondary" size="md" onClick={onClose}>
            关闭
          </Button>
        </div>
      </div>
    </div>
  );
}
