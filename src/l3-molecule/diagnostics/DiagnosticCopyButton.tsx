import { useState } from "react";
import { Copy } from "lucide-react";
import { Button } from "@l4/ui";

interface DiagnosticCopyButtonProps {
  text: string;
  disabled?: boolean;
}

export function DiagnosticCopyButton({ text, disabled = false }: DiagnosticCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1600);
  }

  return (
    <Button variant="secondary" size="sm" onClick={handleCopy} disabled={disabled}>
      <Copy size={14} />
      {copied ? "已复制" : "复制诊断"}
    </Button>
  );
}
