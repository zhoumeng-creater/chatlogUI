import { useState } from "react";
import { Download } from "lucide-react";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";
import { maskDiagnosticText } from "@/utils/maskSecrets";
import { DiagnosticCopyButton } from "./DiagnosticCopyButton";

interface DiagnosticsPanelProps {
  report: DiagnosticsReport;
  copyText: string;
  onExport: () => Promise<string>;
}

function formatDiagnosticsExportError(error: unknown): string {
  const safeMessage = maskDiagnosticText(
    error instanceof Error ? error.message : String(error),
    { privacyMode: true },
  );

  if (/敏感信息|阻止导出|redaction|sensitive/i.test(safeMessage)) {
    return `诊断导出被隐私保护阻止：${safeMessage}`;
  }

  if (/write|file|filesystem|permission|denied|保存|写入|文件|目录|磁盘/i.test(safeMessage)) {
    return `诊断导出写入失败：${safeMessage}`;
  }

  if (/sidecar|service|health|5030|服务/i.test(safeMessage)) {
    return `诊断导出受服务状态影响：${safeMessage}`;
  }

  return `诊断导出失败：${safeMessage}`;
}

export function DiagnosticsPanel({ report, copyText, onExport }: DiagnosticsPanelProps) {
  const [exportState, setExportState] = useState<"idle" | "exporting" | "exported" | "error">("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleExport() {
    if (!report.redactionOk) {
      setExportState("error");
      setMessage(report.blockedReason ?? "诊断报告仍包含敏感信息，已阻止导出。");
      return;
    }

    setExportState("exporting");
    setMessage(null);
    try {
      const path = await onExport();
      setExportState("exported");
      setMessage(`已导出到 ${path}`);
    } catch (error) {
      setExportState("error");
      setMessage(formatDiagnosticsExportError(error));
    }
  }

  return (
    <Surface variant="base" className="diagnostics-panel">
      <div className="diagnostics-panel__header">
        <div>
          <Typography variant="label" weight={700}>
            诊断摘要
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            仅包含用户触发的脱敏状态摘要，不导出聊天正文或原始凭据。
          </Typography>
        </div>
        <StatusIndicator
          label={report.redactionOk ? "已脱敏" : "已阻止导出"}
          tone={report.redactionOk ? "success" : "danger"}
        />
      </div>

      <dl className="diagnostics-grid">
        {report.lines.map((line, index) => (
          <div key={`${line.label}-${index}`} className="diagnostics-line">
            <dt>{line.label}</dt>
            <dd>{line.value}</dd>
          </div>
        ))}
      </dl>

      <div className="diagnostics-actions">
        <DiagnosticCopyButton text={copyText} disabled={!report.redactionOk} />
        <Button variant="secondary" size="sm" loading={exportState === "exporting"} onClick={handleExport}>
          <Download size={14} />
          导出诊断
        </Button>
      </div>

      {message && (
        <Typography
          variant="caption"
          color={exportState === "error" ? "var(--danger)" : "var(--text-secondary)"}
        >
          {message}
        </Typography>
      )}
    </Surface>
  );
}
