import { RefreshCw } from "lucide-react";
import { Button, Select, Typography } from "@l4/ui";
import type { SemanticPreviewKind } from "@l4/network";
import type { SemanticPreviewView } from "@l2/commander/semanticPreviewViewModel";
import { formatSemanticPreviewContent, formatSemanticPreviewIdentity } from "./semanticPreviewDisplay";

interface SemanticIndexPreviewProps {
  view: SemanticPreviewView;
  kind: SemanticPreviewKind;
  limit: number;
  privacyOn: boolean;
  onKindChange: (kind: SemanticPreviewKind) => void;
  onLimitChange: (limit: number) => void;
  onRefresh: () => void;
  onPreviousPage: () => void;
  onNextPage: () => void;
}

const KIND_OPTIONS: Array<{ value: SemanticPreviewKind; label: string }> = [
  { value: "all", label: "全部" },
  { value: "message", label: "消息" },
  { value: "entity", label: "实体" },
  { value: "chunk", label: "片段" },
];

export function SemanticIndexPreview({
  view,
  kind,
  limit,
  privacyOn,
  onKindChange,
  onLimitChange,
  onRefresh,
  onPreviousPage,
  onNextPage,
}: SemanticIndexPreviewProps) {
  return (
    <section className="semantic-preview" aria-label="语义索引预览">
      <div className="semantic-preview__header">
        <div>
          <Typography variant="label" weight={700}>
            语义索引预览
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.summary}
          </Typography>
        </div>
        <Button variant="ghost" size="sm" loading={view.status === "loading"} onClick={onRefresh}>
          <RefreshCw size={14} />
          刷新
        </Button>
      </div>
      <div className="semantic-preview__controls">
        <label className="developer-field">
          <span>类型</span>
          <Select controlSize="sm" value={kind} onChange={(event) => onKindChange(event.currentTarget.value)}>
            {KIND_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </label>
        <label className="developer-field">
          <span>数量</span>
          <Select controlSize="sm" value={String(limit)} onChange={(event) => onLimitChange(Number(event.currentTarget.value))}>
            {[10, 20, 50, 100].map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </Select>
        </label>
        <Typography variant="caption" color="var(--text-muted)">
          {view.modelSummary}
        </Typography>
      </div>
      {view.errorCopy && (
        <Typography variant="caption" color="var(--danger)">
          {view.errorCopy}
        </Typography>
      )}
      <div className="semantic-preview__groups">
        {view.groups.map((group) => (
          <span key={group.name} className="semantic-chip">
            {group.name}: {group.count}
          </span>
        ))}
      </div>
      <div className="semantic-preview__table">
        <div className="semantic-preview__row semantic-preview__row--head">
          <span>对象</span>
          <span>内容</span>
          <span>坐标</span>
          <span>离群</span>
        </div>
        {view.rows.length === 0 ? (
          <div className="semantic-preview__empty">
            <Typography variant="caption" color="var(--text-muted)">
              暂无语义向量。
            </Typography>
          </div>
        ) : (
          view.rows.map((row) => (
            <div key={row.id} className="semantic-preview__row">
              <span>{formatSemanticPreviewIdentity(row, privacyOn)}</span>
              <span>{formatSemanticPreviewContent(row, privacyOn)}</span>
              <span>{row.coordinateLabel}</span>
              <span>{row.outlierLabel}</span>
            </div>
          ))
        )}
      </div>
      <div className="semantic-preview__pager">
        <Button variant="ghost" size="sm" onClick={onPreviousPage} disabled={!view.canPagePrevious}>
          上一页
        </Button>
        <Button variant="ghost" size="sm" onClick={onNextPage} disabled={!view.canPageNext}>
          下一页
        </Button>
      </div>
    </section>
  );
}
