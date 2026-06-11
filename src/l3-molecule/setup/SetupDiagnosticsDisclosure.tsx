import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { Button, Typography } from "@l4/ui";
import { DiagnosticPanel } from "./DiagnosticPanel";

interface SetupDiagnosticsDisclosureProps {
  report: DiagnosticsReport;
  copyText: string;
  onExport: () => Promise<string>;
}

export function SetupDiagnosticsDisclosure({
  report,
  copyText,
  onExport,
}: SetupDiagnosticsDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="setup-diagnostics-disclosure">
      <Typography variant="caption" color="var(--text-secondary)">
        默认只显示状态摘要；需要排查时再展开脱敏诊断。
      </Typography>
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="setup-diagnostics-disclosure__button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown
          size={14}
          className={open ? "setup-diagnostics-disclosure__chevron--open" : undefined}
          aria-hidden="true"
        />
        {open ? "收起脱敏诊断" : "查看脱敏诊断"}
      </Button>
      {open && (
        <div className="setup-diagnostics-body">
          <DiagnosticPanel report={report} copyText={copyText} onExport={onExport} />
        </div>
      )}
    </div>
  );
}
