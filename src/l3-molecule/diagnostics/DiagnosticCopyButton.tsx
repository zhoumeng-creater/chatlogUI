import { useState } from "react";
import { Copy } from "lucide-react";
import { Button, DisabledReason } from "@l4/ui";

interface DiagnosticCopyButtonProps {
  text: string;
  disabled?: boolean;
  disabledReason?: string;
}

export function DiagnosticCopyButton({
  text,
  disabled = false,
  disabledReason,
}: DiagnosticCopyButtonProps) {
  const [copied, setCopied] = useState(false);
  const disabledReasonId = disabled && disabledReason ? "diagnostic-copy-disabled-reason" : undefined;

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  const button = (
    <Button
      variant="secondary"
      size="sm"
      onClick={handleCopy}
      disabled={disabled}
      aria-describedby={disabledReasonId}
    >
      <Copy size={14} />
      {copied ? "已复制" : "复制诊断"}
    </Button>
  );

  return disabledReasonId ? (
    <DisabledReason id={disabledReasonId} reason={disabledReason} variant="compact">
      {button}
    </DisabledReason>
  ) : button;
}
