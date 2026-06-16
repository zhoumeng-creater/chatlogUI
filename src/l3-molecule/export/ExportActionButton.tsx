import { Download } from "lucide-react";
import { Button, DisabledReason } from "@/l4-atom/ui";

interface ExportActionButtonProps {
  label: string;
  disabled?: boolean;
  disabledReason?: string | null;
  onClick: () => void;
}

export function ExportActionButton({
  label,
  disabled = false,
  disabledReason = null,
  onClick,
}: ExportActionButtonProps) {
  const button = (
    <Button
      className="business-export-action"
      variant="secondary"
      size="md"
      disabled={disabled}
      onClick={onClick}
      data-coach-anchor="export-redaction"
    >
      <Download size={16} aria-hidden="true" />
      <span>{label}</span>
    </Button>
  );

  if (!disabled || !disabledReason) return button;

  return (
    <DisabledReason
      id="business-export-action-disabled-reason"
      reason={disabledReason}
      variant="compact"
    >
      {button}
    </DisabledReason>
  );
}
