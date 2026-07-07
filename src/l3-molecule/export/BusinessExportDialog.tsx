import type {
  BusinessExportArtifact,
  BusinessExportFormat,
  BusinessExportJob,
  BusinessExportStatus,
} from "@/l2-coordinator/commander/businessExportModel";
import type { BusinessExportResultSummary } from "@/l2-coordinator/data-clerk/stores";
import {
  Button,
  DateInput,
  DisabledReason,
  Select,
  SpringModal,
  StatusIndicator,
  Typography,
} from "@/l4-atom/ui";
import { StatusAnnouncer } from "@/l3-molecule/common/StatusAnnouncer";
import { MessageOptionSelect } from "@/l3-molecule/common/MessageOptionSelect";

interface BusinessExportRangeControls {
  summary: string;
  error: string | null;
  disabled: boolean;
  filters: {
    sender: string;
    messageType: string;
    startDate: string;
    endDate: string;
  };
  senderOptions: Array<{ value: string; label: string; count: number }>;
  typeOptions: Array<{ value: string; label: string; count: number }>;
  onChange: (filters: Partial<BusinessExportRangeControls["filters"]>) => void;
  onReset: () => void;
}

interface BusinessExportDialogProps {
  artifact: BusinessExportArtifact | null;
  job: BusinessExportJob | null;
  formats: BusinessExportFormat[];
  selectedFormat: BusinessExportFormat;
  privacyOn: boolean;
  unredactedConfirmed: boolean;
  resultSummary?: BusinessExportResultSummary | null;
  stopWaitingMessage?: string | null;
  rangeControls?: BusinessExportRangeControls;
  confirmDisabledReason?: string | null;
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
  rangeControls,
  confirmDisabledReason = null,
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
  const confirmDisabled = isWriting || status === "completed" || isStopping || Boolean(confirmDisabledReason);
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
        <StatusAnnouncer
          privacyOn={privacyOn}
          politeness={status === "failed" ? "assertive" : "polite"}
          message={getExportAnnouncement(status, job.rowCount)}
          privacySafeMessage={getExportAnnouncement(status, job.rowCount)}
        />

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

        {rangeControls ? (
          <fieldset
            className="business-export-dialog__range"
            disabled={isWriting || isTerminal || rangeControls.disabled}
          >
            <legend>导出范围</legend>
            <div className="business-export-dialog__range-grid">
              <label>
                <span>对象</span>
                <Select
                  controlSize="sm"
                  value={rangeControls.filters.sender}
                  onChange={(event) => rangeControls.onChange({ sender: event.currentTarget.value })}
                >
                  {rangeControls.senderOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label} · {option.count.toLocaleString()} 条
                    </option>
                  ))}
                </Select>
              </label>
              <label>
                <span>消息类型</span>
                <MessageOptionSelect
                  ariaLabel="选择导出消息类型"
                  value={rangeControls.filters.messageType}
                  options={rangeControls.typeOptions}
                  onChange={(messageType) => rangeControls.onChange({ messageType })}
                />
              </label>
              <label>
                <span>开始日期</span>
                <DateInput
                  controlSize="sm"
                  value={rangeControls.filters.startDate}
                  aria-invalid={Boolean(rangeControls.error)}
                  onChange={(event) => rangeControls.onChange({ startDate: event.currentTarget.value })}
                />
              </label>
              <label>
                <span>结束日期</span>
                <DateInput
                  controlSize="sm"
                  value={rangeControls.filters.endDate}
                  aria-invalid={Boolean(rangeControls.error)}
                  onChange={(event) => rangeControls.onChange({ endDate: event.currentTarget.value })}
                />
              </label>
              <Button variant="ghost" size="sm" onClick={rangeControls.onReset}>
                重置范围
              </Button>
            </div>
            <Typography
              variant="caption"
              color={rangeControls.error ? "var(--danger)" : "var(--text-secondary)"}
              role={rangeControls.error ? "alert" : undefined}
            >
              {rangeControls.error ?? rangeControls.summary}
            </Typography>
          </fieldset>
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
          {!isTerminal ? renderConfirmButton({
            isWriting,
            disabled: confirmDisabled,
            disabledReason: confirmDisabledReason,
            onConfirm,
          }) : null}
        </footer>
      </section>
    </SpringModal>
  );
}

function renderConfirmButton({
  isWriting,
  disabled,
  disabledReason,
  onConfirm,
}: {
  isWriting: boolean;
  disabled: boolean;
  disabledReason: string | null;
  onConfirm: () => void;
}) {
  const button = (
    <Button loading={isWriting} disabled={disabled} onClick={onConfirm}>
      {isWriting ? "正在保存" : "保存"}
    </Button>
  );

  if (!disabledReason) return button;
  return (
    <DisabledReason reason={disabledReason} variant="compact">
      {button}
    </DisabledReason>
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

function getExportAnnouncement(status: BusinessExportStatus, rowCount: number): string {
  switch (status) {
    case "preparing":
      return "正在准备导出";
    case "confirming":
    case "partial":
      return `导出待确认，共 ${rowCount} 条记录`;
    case "writing":
      return "正在保存导出文件";
    case "completed":
      return `导出完成，共 ${rowCount} 条记录`;
    case "failed":
      return "导出失败";
    case "cancelling":
      return "已停止等待导出";
    case "cancelled":
      return "导出已取消";
    default:
      return "导出未开始";
  }
}
