import { useEffect } from "react";
import { X } from "lucide-react";
import type { CoachMarkView } from "@l2/commander/coachMarkModel";
import { Button, IconButton, Typography } from "@l4/ui";

interface CoachMarkProps {
  mark: CoachMarkView | null;
  onDismiss: (id: CoachMarkView["id"]) => void;
  onSkipAll?: () => void;
}

export function CoachMark({ mark, onDismiss, onSkipAll }: CoachMarkProps) {
  useEffect(() => {
    if (!mark) return undefined;
    const handleKeydown = (event: KeyboardEvent) => {
      if (event.key !== "Escape") return;
      event.preventDefault();
      onDismiss(mark.id);
    };
    document.addEventListener("keydown", handleKeydown);
    return () => document.removeEventListener("keydown", handleKeydown);
  }, [mark, onDismiss]);

  if (!mark) return null;
  const positionStyle = mark.position
    ? { right: "auto", bottom: "auto", ...mark.position }
    : undefined;

  return (
    <aside
      className="coach-mark"
      data-coach-mark={mark.id}
      data-placement={mark.placement}
      role="note"
      aria-label={mark.title}
      style={positionStyle}
    >
      <div className="coach-mark__copy">
        <Typography variant="label" weight={700}>
          {mark.title}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {mark.body}
        </Typography>
      </div>
      <div className="coach-mark__actions">
        <Button variant="secondary" size="sm" onClick={() => onDismiss(mark.id)}>
          知道了
        </Button>
        {onSkipAll && (
          <Button variant="ghost" size="sm" onClick={onSkipAll}>
            暂时不提示
          </Button>
        )}
        <IconButton
          icon={<X size={14} />}
          label="关闭提示"
          tooltip="关闭提示"
          size="sm"
          onClick={() => onDismiss(mark.id)}
        />
      </div>
    </aside>
  );
}
