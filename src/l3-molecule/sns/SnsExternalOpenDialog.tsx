import { ExternalLink } from "lucide-react";
import { Button, Typography } from "@l4/ui";

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

export function SnsExternalOpenDialog({
  prompt,
  error,
  onConfirm,
  onCancel,
}: SnsExternalOpenDialogProps) {
  return (
    <div className="sns-external-open" role="dialog" aria-modal="false" aria-label="打开外部文章确认">
      <div className="sns-external-open__copy">
        <Typography variant="label" weight={700}>
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
