import { X } from "lucide-react";
import { useEffect, useRef, type KeyboardEvent } from "react";
import {
  IconButton,
  Typography,
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  type FocusTarget,
} from "@l4/ui";
import type { SafeRawFieldRow } from "@l2/commander/messageActionModel";

interface MessageRawFieldInspectorProps {
  rows: SafeRawFieldRow[];
  onClose: () => void;
}

export function MessageRawFieldInspector({ rows, onClose }: MessageRawFieldInspectorProps) {
  const titleId = "message-raw-field-inspector-title";
  const inspectorRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);

  useEffect(() => {
    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    const frame = window.requestAnimationFrame(() => {
      focusInitialOverlayTarget(inspectorRef.current);
    });

    return () => {
      window.cancelAnimationFrame(frame);
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(inspectorRef.current, document.activeElement, event)) return;
    if (!shouldCloseOverlayOnKey(event.key, { dismissible: true })) return;

    event.preventDefault();
    event.stopPropagation();
    onClose();
  };

  return (
    <div
      ref={inspectorRef}
      className="message-raw-field-inspector"
      {...getOverlayDialogProps({ titleId })}
      onKeyDown={handleKeyDown}
    >
      <div className="message-raw-field-inspector__header">
        <div>
          <Typography id={titleId} variant="label" weight={700}>
            安全原始字段
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            仅显示结构字段，不显示正文、路径、账号或资源密钥。
          </Typography>
        </div>
        <IconButton
          icon={<X size={16} />}
          label="关闭安全原始字段"
          tooltip="关闭"
          size="md"
          onClick={onClose}
        />
      </div>
      <dl className="message-raw-field-inspector__rows">
        {rows.map((row) => (
          <div key={row.label} className="message-raw-field-inspector__row">
            <dt>{row.label}</dt>
            <dd>{row.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
