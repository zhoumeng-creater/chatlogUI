import { useEffect, useRef, type KeyboardEvent } from "react";
import { ExternalLink } from "lucide-react";
import {
  Button,
  focusInitialOverlayTarget,
  getOverlayDialogProps,
  restoreFocusTarget,
  shouldCloseOverlayOnKey,
  trapOverlayFocus,
  Typography,
  type FocusTarget,
} from "@l4/ui";

export interface SnsExternalOpenPrompt {
  postId: string;
  title: string;
  domain: string;
  scheme: "http" | "https";
}

interface SnsExternalOpenDialogProps {
  prompt: SnsExternalOpenPrompt;
  error: string | null;
  onConfirm: () => void;
  onCancel: () => void;
}

const SNS_EXTERNAL_OPEN_TITLE_ID = "sns-external-open-title";

export function SnsExternalOpenDialog({
  prompt,
  error,
  onConfirm,
  onCancel,
}: SnsExternalOpenDialogProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const restoreTargetRef = useRef<FocusTarget | null>(null);

  useEffect(() => {
    restoreTargetRef.current = document.activeElement as FocusTarget | null;
    focusInitialOverlayTarget(dialogRef.current);

    return () => {
      restoreFocusTarget(restoreTargetRef.current);
      restoreTargetRef.current = null;
    };
  }, []);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (trapOverlayFocus(dialogRef.current, document.activeElement, event)) return;
    if (shouldCloseOverlayOnKey(event.key, { dismissible: true })) {
      event.preventDefault();
      onCancel();
    }
  };

  return (
    <div
      {...getOverlayDialogProps({ titleId: SNS_EXTERNAL_OPEN_TITLE_ID })}
      ref={dialogRef}
      className="sns-external-open"
      onKeyDown={handleKeyDown}
    >
      <div className="sns-external-open__copy">
        <Typography id={SNS_EXTERNAL_OPEN_TITLE_ID} variant="label" weight={700}>
          打开外部文章
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {prompt.title || "朋友圈文章"} 将用系统浏览器打开。不会显示完整 URL、参数或密钥。
        </Typography>
        <span className="sns-external-open__domain">
          {prompt.scheme.toUpperCase()} · {prompt.domain}
        </span>
        {error && (
          <Typography variant="caption" color="var(--danger)" role="alert">
            {error}
          </Typography>
        )}
      </div>
      <div className="sns-external-open__actions">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          取消
        </Button>
        <Button variant="primary" size="sm" onClick={onConfirm}>
          <ExternalLink size={14} />
          打开外部文章
        </Button>
      </div>
    </div>
  );
}
