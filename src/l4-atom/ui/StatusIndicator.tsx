import { Spinner } from "./Spinner";

export type StatusTone = "neutral" | "success" | "warning" | "danger" | "accent";

interface StatusIndicatorProps {
  label: string;
  tone?: StatusTone;
  busy?: boolean;
  title?: string;
}

export function StatusIndicator({
  label,
  tone = "neutral",
  busy = false,
  title,
}: StatusIndicatorProps) {
  return (
    <span className={`ui-status-indicator ui-status-indicator--${tone}`} title={title ?? label}>
      <span className="ui-status-indicator__dot" aria-hidden="true" />
      <span>{label}</span>
      {busy && <Spinner size={12} color="currentColor" />}
    </span>
  );
}
