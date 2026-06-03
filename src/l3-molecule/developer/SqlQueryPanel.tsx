import { Play, ShieldAlert } from "lucide-react";
import { Button, Spinner, Typography } from "@l4/ui";
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
      />
      <div className="developer-guard" data-allowed={guard.allowed}>
        <ShieldAlert size={14} />
        <span>{formatSqlGuardCopy(guard)}</span>
      </div>
      {error && (
        <Typography variant="caption" color="var(--danger)">
          {error}
        </Typography>
      )}
      <Button
        variant="secondary"
        size="sm"
        onClick={onRun}
        disabled={!canRun || status === "loading" || privacyOn}
      >
        <Play size={14} />
        执行只读查询
      </Button>
      <ResultTable table={result} emptyCopy="执行只读查询后显示结果。" />
    </section>
  );
}
