import { useState } from "react";
import type { BusinessExportFormat } from "@l2/commander/businessExportModel";
import type { SearchExportCommanderView } from "@l2/commander/useSearchExportCommander";
import { Button, DisabledReason, SpringModal } from "@l4/ui";

interface SearchExportDialogProps {
  view: SearchExportCommanderView;
}

const FORMAT_LABELS: Record<BusinessExportFormat, string> = {
  markdown: "Markdown",
  csv: "CSV",
  json: "JSON",
};

export function SearchExportDialog({ view }: SearchExportDialogProps) {
  const [thresholdConfirmed, setThresholdConfirmed] = useState(false);
  const { dialog, selection, task } = view;
  if (!view.isOpen || !dialog || !selection) return null;

  const running = task?.status === "running";
  const finalizing = task?.status === "finalizing";
  const commitPending = task?.status === "commit_pending";
  const commitInFlight = view.commitInFlight;
  const locked = running || finalizing || commitPending || commitInFlight;
  const selectionLocked = Boolean(task && task.status !== "idle" && task.status !== "cancelled");
  const irreversible = Boolean(task && (commitInFlight || commitPending));
  const frozenPrivacySelection = task?.selection ?? selection;
  const outputIsUnredacted =
    frozenPrivacySelection.unredactedConfirmed && (!dialog.privacyOn || irreversible);
  const privacyLatchedAfterUnredactedWrite =
    irreversible && dialog.privacyOn && frozenPrivacySelection.unredactedConfirmed;
  const selectedCount = selection.scope === "all" ? dialog.all.count : dialog.partial.count;
  const thresholdRequired = selectedCount > view.confirmThreshold;
  const confirmDisabled =
    locked ||
    (selection.scope === "all" && !dialog.all.allowed) ||
    (thresholdRequired && !thresholdConfirmed);
  const titleId = "search-export-dialog-title";

  return (
    <SpringModal
      titleId={titleId}
      ariaLabel="导出搜索结果"
      onClose={() => void (locked ? view.cancel() : view.close())}
      closeOnBackdrop={!locked}
      closeOnEscape={!locked}
    >
      <section className="search-export-dialog" aria-labelledby={titleId}>
        <header className="search-export-dialog__header">
          <div>
            <p className="search-export-dialog__eyebrow">冻结搜索快照</p>
            <h2 id={titleId}>导出搜索结果</h2>
          </div>
          <span role="status" aria-live="polite">
            {exportStatusLabel(task?.status ?? "idle")}
          </span>
        </header>

        <p className="search-export-dialog__summary">{dialog.publicSummary.totalLabel}</p>
        <p className="search-export-dialog__coverage">{dialog.publicSummary.coverageLabel}</p>

        <fieldset disabled={selectionLocked} className="search-export-dialog__formats">
          <legend>文件格式</legend>
          <div className="search-export-dialog__option-row">
            {Object.entries(FORMAT_LABELS).map(([format, label]) => (
              <label key={format}>
                <input
                  type="radio"
                  name="search-export-format"
                  checked={dialog.format === format}
                  onChange={() => view.setFormat(format as BusinessExportFormat)}
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
        </fieldset>

        <fieldset disabled={selectionLocked} className="search-export-dialog__scope">
          <legend>导出范围</legend>
          <label className="search-export-dialog__scope-option">
            <input
              type="radio"
              name="search-export-scope"
              checked={selection.scope === "all"}
              disabled={!dialog.all.allowed}
              onChange={() => view.selectScope("all")}
            />
            <span>
              <strong>全部命中</strong>
              <small>{dialog.all.count.toLocaleString()} 条 · 后端基线顺序</small>
            </span>
          </label>
          {!dialog.all.allowed && dialog.all.unavailableReason && (
            <p className="search-export-dialog__scope-reason">{dialog.all.unavailableReason}</p>
          )}
          <label className="search-export-dialog__scope-option">
            <input
              type="radio"
              name="search-export-scope"
              checked={selection.scope === "partial"}
              onChange={() => view.selectScope("partial")}
            />
            <span>
              <strong>{dialog.partial.label}</strong>
              <small>
                {dialog.partial.kind === "current_page"
                  ? "仅导出冻结时的当前页"
                  : `覆盖 ${dialog.partial.rangeCount.toLocaleString()} 个已加载区间`}
              </small>
            </span>
          </label>
        </fieldset>

        <div className="search-export-dialog__privacy">
          <div>
            <strong>{outputIsUnredacted ? "未脱敏导出" : "脱敏导出"}</strong>
            <p>
              {privacyLatchedAfterUnredactedWrite
                ? "隐私模式已开启，但隐私模式不会追溯修改当前已写入文件；本次文件仍包含未脱敏内容。"
                : dialog.privacyOn
                ? "隐私模式已开启，导出内容将保持脱敏。"
                : "默认脱敏；只有明确确认后才写入未脱敏内容。"}
            </p>
          </div>
          <DisabledReason
            reason={
              privacyLatchedAfterUnredactedWrite
                ? "当前文件已按冻结选择写入；隐私模式仅约束后续操作。"
                : dialog.privacyOn
                  ? "隐私模式开启时不能导出未脱敏内容。"
                  : "确认后将写入当前搜索内容。"
            }
            variant="compact"
          >
            <label>
              <input
                type="checkbox"
                checked={outputIsUnredacted}
                disabled={dialog.privacyOn || selectionLocked}
                onChange={(event) => view.setUnredactedConfirmed(event.currentTarget.checked)}
              />
              <span>允许未脱敏内容</span>
            </label>
          </DisabledReason>
        </div>

        {thresholdRequired && !selectionLocked && (
          <label className="search-export-dialog__threshold">
            <input
              type="checkbox"
              checked={thresholdConfirmed}
              onChange={(event) => setThresholdConfirmed(event.currentTarget.checked)}
            />
            <span>
              我确认导出 {selectedCount.toLocaleString()} 条记录，任务可能需要较长时间
            </span>
          </label>
        )}

        {task && (running || finalizing || commitInFlight) && (
          <div className="search-export-dialog__progress" role="status">
            <progress value={task.processedCount} max={Math.max(1, task.totalCount)} />
            <span>
              {commitInFlight
                ? "正在提交文件…"
                : finalizing
                ? "正在完成文件写入…"
                : `已处理 ${task.processedCount.toLocaleString()} / ${task.totalCount.toLocaleString()} 条`}
            </span>
          </div>
        )}

        {(task?.status === "error" || commitPending) && task.error && (
          <div className="search-export-dialog__error" role="alert">
            <strong>{commitPending ? "提交确认中断" : "导出未完成"}</strong>
            <span>{task.error.message}</span>
          </div>
        )}
        {view.confirmationRequired && (
          <p className="search-export-dialog__error" role="alert">
            请先确认大批量导出。
          </p>
        )}

        <div className="search-export-dialog__actions">
          {(task?.status === "error" || commitPending) && task.error?.retryable && (
            <Button
              variant="secondary"
              disabled={commitInFlight}
              onClick={() => void view.retry()}
            >
              {commitPending ? "重试确认" : "重试"}
            </Button>
          )}
          {!commitPending && (
            <Button
              variant="ghost"
              disabled={commitInFlight}
              onClick={() => void (locked ? view.cancel() : view.close())}
            >
              {commitInFlight ? "正在提交" : locked ? "取消导出" : "关闭"}
            </Button>
          )}
          {!task || task.status === "idle" || task.status === "cancelled" ? (
            <Button
              disabled={confirmDisabled}
              onClick={() => void view.confirm({ thresholdConfirmed })}
            >
              开始导出
            </Button>
          ) : null}
        </div>
      </section>
    </SpringModal>
  );
}

function exportStatusLabel(status: string): string {
  if (status === "running") return "导出中";
  if (status === "finalizing") return "正在完成";
  if (status === "commit_pending") return "等待提交确认";
  if (status === "error") return "需要处理";
  return "待确认";
}
