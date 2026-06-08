import { Play, ShieldAlert } from "lucide-react";
import { Button, DisabledReason, Spinner, Typography } from "@l4/ui";
import type { AdaptedDbRowsTable, ReadOnlySqlClassification } from "@l4/network";
import type { DeveloperToolsLoadStatus } from "@l2/data-clerk/stores/useDeveloperToolsStore";
import { formatSqlGuardCopy } from "./developerDisplay";
import { ResultTable } from "./ResultTable";

interface SqlQueryPanelProps {
  status: DeveloperToolsLoadStatus;
  sqlDraft: string;
  privacyOn: boolean;
  result: AdaptedDbRowsTable;
  error: string | null;
  guard: ReadOnlySqlClassification;
  canRun: boolean;
  onSqlDraftChange: (sql: string) => void;
  onRun: () => void;
}

export function SqlQueryPanel({
  status,
  sqlDraft,
  privacyOn,
  result,
  error,
  guard,
  canRun,
  onSqlDraftChange,
  onRun,
}: SqlQueryPanelProps) {
  const editorReason = privacyOn
    ? "隐私模式下不可编辑或执行 SQL。关闭隐私模式后可继续编辑。"
    : undefined;
  const editorReasonId = editorReason ? "developer-sql-editor-disabled-reason" : undefined;
  const runReason = getSqlRunDisabledReason({ privacyOn, status, canRun, guard });
  const runReasonId = runReason ? "developer-sql-run-disabled-reason" : undefined;

  return (
    <section className="developer-section" aria-label="只读 SQL 查询">
      <div className="developer-section__header">
        <Typography variant="label" weight={700}>
          Read-only SQL
        </Typography>
        {status === "loading" && <Spinner size={15} label="执行 SQL..." color="var(--text-muted)" />}
      </div>
      <textarea
        className="developer-sql-editor"
        value={privacyOn ? "" : sqlDraft}
        disabled={privacyOn}
        onChange={(event) => onSqlDraftChange(event.currentTarget.value)}
        placeholder={privacyOn ? "隐私模式已隐藏 SQL 草稿" : "select columns from table limit 50"}
        aria-label="只读 SQL 编辑器"
        aria-describedby={editorReasonId}
      />
      {editorReason && (
        <DisabledReason id={editorReasonId} reason={editorReason} variant="compact" />
      )}
      <div className="developer-guard" data-allowed={guard.allowed}>
        <ShieldAlert size={14} />
        <span>{formatSqlGuardCopy(guard)}</span>
      </div>
      {error && (
        <Typography variant="caption" color="var(--danger)">
          {error}
        </Typography>
      )}
      {runReason ? (
        <DisabledReason id={runReasonId} reason={runReason} variant="compact">
          <Button
            variant="secondary"
            size="sm"
            onClick={onRun}
            disabled={!canRun || status === "loading" || privacyOn}
            aria-describedby={runReasonId}
          >
            <Play size={14} />
            执行只读查询
          </Button>
        </DisabledReason>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          onClick={onRun}
          disabled={!canRun || status === "loading" || privacyOn}
          aria-describedby={runReasonId}
        >
          <Play size={14} />
          执行只读查询
        </Button>
      )}
      <ResultTable table={result} emptyCopy="执行只读查询后显示结果。" />
    </section>
  );
}

function getSqlRunDisabledReason({
  privacyOn,
  status,
  canRun,
  guard,
}: {
  privacyOn: boolean;
  status: DeveloperToolsLoadStatus;
  canRun: boolean;
  guard: ReadOnlySqlClassification;
}): string | undefined {
  if (privacyOn) return "隐私模式下不可编辑或执行 SQL。关闭隐私模式后可继续编辑。";
  if (status === "loading") return "正在执行 SQL。完成后可再次执行。";
  if (!canRun && guard.reason === "empty") return "请输入只读 SQL 后再执行。";
  if (!canRun) return "只允许执行只读 SQL。修正后可再次执行。";
  return undefined;
}
