import { CalendarDays } from "lucide-react";
import { Button, DateInput, SpringModal, Typography } from "@l4/ui";

interface ConversationDateJumpDialogProps {
  open: boolean;
  value: string;
  error: string | null;
  onValueChange: (value: string) => void;
  onConfirm: () => void;
  onClose: () => void;
}

export function ConversationDateJumpDialog({
  open,
  value,
  error,
  onValueChange,
  onConfirm,
  onClose,
}: ConversationDateJumpDialogProps) {
  if (!open) return null;
  const titleId = "conversation-date-jump-title";

  return (
    <SpringModal titleId={titleId} ariaLabel="跳转到日期" onClose={onClose}>
      <section className="conversation-date-jump-dialog" aria-labelledby={titleId}>
        <header className="conversation-date-jump-dialog__header">
          <CalendarDays size={18} aria-hidden="true" />
          <div>
            <h2 id={titleId}>跳转到日期</h2>
            <Typography variant="caption" color="var(--text-secondary)">
              按所选日期加载该会话当天附近的聊天记录。
            </Typography>
          </div>
        </header>

        <label className="conversation-date-jump-dialog__field">
          <span>日期</span>
          <DateInput
            value={value}
            aria-invalid={Boolean(error)}
            onChange={(event) => onValueChange(event.currentTarget.value)}
          />
        </label>

        {error && (
          <Typography variant="caption" color="var(--danger)" role="alert">
            {error}
          </Typography>
        )}

        <footer className="conversation-date-jump-dialog__actions">
          <Button variant="ghost" onClick={onClose}>
            取消
          </Button>
          <Button onClick={onConfirm}>
            跳转
          </Button>
        </footer>
      </section>
    </SpringModal>
  );
}
