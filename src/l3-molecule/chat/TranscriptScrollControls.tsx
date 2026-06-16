import { ArrowDown, ArrowUp, Crosshair, SkipBack, SkipForward } from "lucide-react";
import { DisabledReason, IconButton, Typography } from "@l4/ui";
import type { TranscriptControlId, TranscriptControlView } from "@l2/commander/transcriptPositionModel";

interface TranscriptScrollControlsProps {
  positionText: string | null;
  stickyDateLabel: string | null;
  topTerminalText: string | null;
  bottomTerminalText: string | null;
  controls: TranscriptControlView[];
  onAction: (id: TranscriptControlId) => void;
}

const CONTROL_ICONS: Record<TranscriptControlId, JSX.Element> = {
  latest: <ArrowDown size={16} />,
  bottom: <ArrowDown size={16} />,
  "return-anchor": <Crosshair size={16} />,
  "previous-hit": <SkipBack size={16} />,
  "next-hit": <SkipForward size={16} />,
};

export function TranscriptScrollControls({
  positionText,
  stickyDateLabel,
  topTerminalText,
  bottomTerminalText,
  controls,
  onAction,
}: TranscriptScrollControlsProps) {
  const terminalText = topTerminalText ?? bottomTerminalText;

  return (
    <div className="transcript-scroll-controls" aria-label="聊天滚动控制">
      <div className="transcript-scroll-controls__status">
        {stickyDateLabel && (
          <span className="transcript-scroll-controls__date">{stickyDateLabel}</span>
        )}
        {positionText && (
          <Typography variant="caption" color="var(--text-secondary)">
            {positionText}
          </Typography>
        )}
        {terminalText && (
          <Typography variant="caption" color="var(--text-muted)">
            {terminalText}
          </Typography>
        )}
      </div>
      <div className="transcript-scroll-controls__actions" role="toolbar" aria-label="聊天定位">
        {controls.map((control) => (
          <TranscriptControlButton
            key={control.id}
            control={control}
            onAction={onAction}
          />
        ))}
      </div>
    </div>
  );
}

function TranscriptControlButton({
  control,
  onAction,
}: {
  control: TranscriptControlView;
  onAction: (id: TranscriptControlId) => void;
}) {
  const button = (
    <IconButton
      icon={CONTROL_ICONS[control.id] ?? <ArrowUp size={16} />}
      label={control.label}
      tooltip={control.disabled ? control.disabledReason ?? control.label : control.label}
      size="md"
      disabled={control.disabled}
      onClick={() => onAction(control.id)}
    />
  );

  if (!control.disabled || !control.disabledReason) return button;

  return (
    <DisabledReason reason={control.disabledReason} variant="sr-only">
      {button}
    </DisabledReason>
  );
}
