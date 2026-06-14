import type {
  BusinessExportArtifact,
  BusinessExportFormat,
  BusinessExportJob,
  BusinessExportStatus,
} from "@/l2-coordinator/commander/businessExportModel";
import type { BusinessExportResultSummary } from "@/l2-coordinator/data-clerk/stores";
import { Button, DisabledReason, SpringModal, StatusIndicator } from "@/l4-atom/ui";

interface BusinessExportDialogProps {
  artifact: BusinessExportArtifact | null;
  job: BusinessExportJob | null;
  formats: BusinessExportFormat[];
  selectedFormat: BusinessExportFormat;
  privacyOn: boolean;
  unredactedConfirmed: boolean;
  resultSummary?: BusinessExportResultSummary | null;
  stopWaitingMessage?: string | null;
  onFormatChange: (format: BusinessExportFormat) => void;
  onToggleUnredacted: (confirmed: boolean) => void;
  onConfirm: () => void;
  onCancel: () => void;
  onClose: () => void;
  onRetry: () => void;
}

const FORMAT_LABELS: Record<BusinessExportFormat, string> = {
  markdown: "Markdown",
  csv: "CSV",
  json: "JSON",
};

export function BusinessExportDialog({
  artifact,
  job,
  formats,
  selectedFormat,
  privacyOn,
  unredactedConfirmed,
  resultSummary = null,
  stopWaitingMessage = null,
  onFormatChange,
  onToggleUnredacted,
  onConfirm,
  onCancel,
  onClose,
  onRetry,
}: BusinessExportDialogProps) {
  if (!artifact || !job) return null;

  const titleId = "business-export-dialog-title";
  const status = job.status;
  const isWriting = status === "writing";
  const isStopping = status === "cancelling";
  const isTerminal = status === "completed" || status === "failed" || status === "cancelled" || isStopping;
  const confirmDisabled = isWriting || status === "completed" || isStopping;
  const canRetry = status === "failed" && job.error?.retryable;

  return (
    <SpringModal
      titleId={titleId}
      ariaLabel={`导出${job.sourceLabel}`}
      onClose={isWriting ? onCancel : onClose}
      closeOnBackdrop={!isWriting}
      closeOnEscape={!isWriting}
    >
      <section className="business-export-dialog" aria-labelledby={titleId}>
        <header className="business-export-dialog__header">
          <div>
            <p className="business-export-dialog__eyebrow">业务导出</p>
            <h2 id={titleId}>导出{job.sourceLabel}</h2>
          </div>
          <StatusIndicator
            label={getStatusLabel(status)}
            tone={getStatusTone(status)}
            busy={isWriting || status === "preparing"}
          />
        </header>

        <dl className="business-export-dialog__meta">
          <div>
            <dt>范围</dt>
            <dd>{job.scopeSummary}</dd>
          </div>
          <div>
            <dt>记录</dt>
            <dd>{job.rowCount} 条</dd>
          </div>
          <div>
            <dt>文件名</dt>
            <dd>{artifact.fileName}</dd>
          </div>
        </dl>

        {status === "completed" && resultSummary ? (
          <div className="business-export-dialog__state business-export-dialog__state--success" role="status">
            <strong>导出完成</strong>
            <span>{resultSummary.locationSummary}</span>
          </div>
        ) : null}

        {job.error ? (
          <div className="business-export-dialog__state business-export-dialog__state--danger" role="alert">
            <strong>导出失败</strong>
            <span>{job.error.message}</span>
          </div>
        ) : null}

        {isStopping ? (
          <div className="business-export-dialog__state business-export-dialog__state--warning" role="status">
            <strong>已停止等待</strong>
            <span>{stopWaitingMessage ?? "导出可能仍在后台完成，稍后可检查所选保存位置。"}</span>
          </div>
        ) : null}

        {artifact.warnings.length > 0 ? (
          <div className="business-export-dialog__warnings" role="note">
            {artifact.warnings.map((warning) => (
              <p key={warning}>{warning}</p>
            ))}
          </div>
        ) : null}

        <fieldset className="business-export-dialog__formats" disabled={isWriting || isTerminal}>
          <legend>格式</legend>
          <div className="business-export-dialog__format-grid">
            {formats.map((format) => (
              <label key={format} className="business-export-dialog__format-option">
                <input
                  type="radio"
                  name="business-export-format"
                  value={format}
                  checked={selectedFormat === format}
                  onChange={() => onFormatChange(format)}
                />
                <span>{FORMAT_LABELS[format]}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <div className="business-export-dialog__privacy">
          <div>
            <strong>{privacyOn || !unredactedConfirmed ? "脱敏导出" : "未脱敏导出"}</strong>
            <p>
              {privacyOn
                ? "隐私模式已开启，导出会隐藏查询、联系人、正文、本机路径和密钥。"
                : "默认仍使用脱敏导出；如需未脱敏内容，需要明确确认。"}
            </p>
          </div>
          <DisabledReason
            reason={privacyOn ? "隐私模式开启时不能导出未脱敏内容。" : "确认后将写入当前业务内容。"}
            variant="compact"
          >
            <label className="business-export-dialog__toggle">
              <input
                type="checkbox"
                checked={unredactedConfirmed && !privacyOn}
                disabled={privacyOn || isWriting || isTerminal}
                onChange={(event) => onToggleUnredacted(event.currentTarget.checked)}
              />
              <span>允许未脱敏</span>
            </label>
          </DisabledReason>
        </div>

        <footer className="business-export-dialog__actions">
          {canRetry ? (
            <Button variant="secondary" onClick={onRetry}>
              重试
            </Button>
          ) : null}
          <Button variant="ghost" onClick={isWriting ? onCancel : onClose}>
            {isWriting ? "停止等待" : "关闭"}
          </Button>
          {!isTerminal ? (
            <Button loading={isWriting} disabled={confirmDisabled} onClick={onConfirm}>
              {isWriting ? "正在保存" : "保存"}
            </Button>
          ) : null}
        </footer>
      </section>
    </SpringModal>
  );
}

function getStatusLabel(status: BusinessExportStatus): string {
  switch (status) {
    case "preparing":
      return "准备中";
    case "confirming":
    case "partial":
      return "待确认";
    case "writing":
      return "保存中";
    case "completed":
      return "已完成";
    case "failed":
      return "失败";
    case "cancelling":
      return "停止等待";
    case "cancelled":
      return "已取消";
    default:
      return "未开始";
  }
}

function getStatusTone(status: BusinessExportStatus): "neutral" | "info" | "success" | "warning" | "danger" {
  switch (status) {
    case "completed":
      return "success";
    case "failed":
      return "danger";
    case "partial":
    case "cancelling":
    case "cancelled":
      return "warning";
    case "writing":
    case "preparing":
    case "confirming":
      return "info";
    default:
      return "neutral";
  }
}
