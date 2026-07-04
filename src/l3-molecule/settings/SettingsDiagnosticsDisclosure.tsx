import { useState } from "react";
import { ChevronDown } from "lucide-react";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import type { ExportDiagnosticsResult } from "@l4/system";
import type { SettingsMessages } from "@/l2-coordinator/commander/messages.zh-CN";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";
import { DiagnosticsPanel } from "@l3/diagnostics/DiagnosticsPanel";

interface SettingsDiagnosticsDisclosureProps {
  copy: SettingsMessages["settings"]["diagnostics"];
  report: DiagnosticsReport;
  copyText: string;
  onExport: () => Promise<ExportDiagnosticsResult>;
}

export function SettingsDiagnosticsDisclosure({
  copy,
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
            {copy.title}
          </Typography>
          <Typography variant="body" color="var(--text-secondary)">
            {copy.description}
          </Typography>
        </div>
        <StatusIndicator
          label={report.redactionOk ? copy.exportReady : copy.exportBlocked}
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
        {open
          ? copy.collapse
          : copy.expand}
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
