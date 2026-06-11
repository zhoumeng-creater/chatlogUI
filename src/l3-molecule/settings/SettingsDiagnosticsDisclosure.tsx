import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";
import { DiagnosticsPanel } from "@l3/diagnostics/DiagnosticsPanel";

interface SettingsDiagnosticsDisclosureProps {
  report: DiagnosticsReport;
  copyText: string;
  onExport: () => Promise<string>;
}

export function SettingsDiagnosticsDisclosure({
  report,
  copyText,
  onExport,
}: SettingsDiagnosticsDisclosureProps) {
  const [open, setOpen] = useState(false);

  return (
    <Surface variant="subtle" className="settings-section">
      <div className="settings-disclosure-header">
        <div>
          <Typography variant="label" weight={700}>
            脱敏诊断
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            默认只显示安全摘要；需要排查问题时再展开复制或导出脱敏诊断。
          </Typography>
        </div>
        <StatusIndicator
          label={report.redactionOk ? "可导出" : "已阻止导出"}
          tone={report.redactionOk ? "success" : "danger"}
        />
      </div>
      {!report.redactionOk && report.blockedReason && (
        <Typography variant="caption" color="var(--danger)">
          {report.blockedReason}
        </Typography>
      )}
      <Button
        type="button"
        variant="secondary"
        size="sm"
        className="settings-disclosure-button"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
      >
        <ChevronDown
          size={14}
          aria-hidden="true"
          className={open ? "settings-disclosure-button__chevron--open" : undefined}
        />
        {open ? "收起脱敏诊断" : "查看脱敏诊断"}
      </Button>
      {open && (
        <DiagnosticsPanel
          report={report}
          copyText={copyText}
          onExport={onExport}
        />
      )}
    </Surface>
  );
}
