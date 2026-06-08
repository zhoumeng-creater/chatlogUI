import { RefreshCw } from "lucide-react";
import { Button, DisabledReason, Select, Typography } from "@l4/ui";
import type { SemanticPreviewKind, SemanticPreviewView } from "@l2/commander/semanticPreviewViewModel";
import { formatSemanticPreviewContent, formatSemanticPreviewIdentity } from "./semanticPreviewDisplay";

interface SemanticIndexPreviewProps {
  view: SemanticPreviewView;
  kind: SemanticPreviewKind;
  limit: number;
  talker: string;
  talkerOptions: Array<{ chat: string; label: string }>;
  privacyOn: boolean;
  onKindChange: (kind: SemanticPreviewKind) => void;
  onLimitChange: (limit: number) => void;
  onTalkerChange: (talker: string) => void;
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
  talker,
  talkerOptions,
  privacyOn,
  onKindChange,
  onLimitChange,
  onTalkerChange,
  onRefresh,
  onPreviousPage,
  onNextPage,
}: SemanticIndexPreviewProps) {
  const refreshReason = view.status === "loading" ? "正在加载预览。加载完成后可刷新。" : undefined;
  const refreshReasonId = refreshReason ? "semantic-preview-refresh-disabled-reason" : undefined;
  const previousPageReason = getPreviewPagerReason("previous", view.status, view.canPagePrevious);
  const nextPageReason = getPreviewPagerReason("next", view.status, view.canPageNext);
  const previousPageReasonId = previousPageReason ? "semantic-preview-previous-disabled-reason" : undefined;
  const nextPageReasonId = nextPageReason ? "semantic-preview-next-disabled-reason" : undefined;
  const previousDisabled = view.status === "loading" || !view.canPagePrevious;
  const nextDisabled = view.status === "loading" || !view.canPageNext;

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
        {refreshReason ? (
          <DisabledReason id={refreshReasonId} reason={refreshReason} variant="compact">
            <Button
              variant="ghost"
              size="sm"
              loading={view.status === "loading"}
              aria-describedby={refreshReasonId}
              onClick={onRefresh}
            >
              <RefreshCw size={14} />
              刷新
            </Button>
          </DisabledReason>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            loading={view.status === "loading"}
            aria-describedby={refreshReasonId}
            onClick={onRefresh}
          >
            <RefreshCw size={14} />
            刷新
          </Button>
        )}
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
          <span>会话</span>
          <Select controlSize="sm" value={talker} onChange={(event) => onTalkerChange(event.currentTarget.value)}>
            <option value="">全部</option>
            {talkerOptions.map((option) => (
              <option key={option.chat} value={option.chat}>
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
        {previousPageReason ? (
          <DisabledReason id={previousPageReasonId} reason={previousPageReason} variant="compact">
            <Button
              variant="ghost"
              size="sm"
              onClick={onPreviousPage}
              disabled={previousDisabled}
              aria-describedby={previousPageReasonId}
            >
              上一页
            </Button>
          </DisabledReason>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onPreviousPage}
            disabled={previousDisabled}
            aria-describedby={previousPageReasonId}
          >
            上一页
          </Button>
        )}
        {nextPageReason ? (
          <DisabledReason id={nextPageReasonId} reason={nextPageReason} variant="compact">
            <Button
              variant="ghost"
              size="sm"
              onClick={onNextPage}
              disabled={nextDisabled}
              aria-describedby={nextPageReasonId}
            >
              下一页
            </Button>
          </DisabledReason>
        ) : (
          <Button
            variant="ghost"
            size="sm"
            onClick={onNextPage}
            disabled={nextDisabled}
            aria-describedby={nextPageReasonId}
          >
            下一页
          </Button>
        )}
      </div>
    </section>
  );
}

function getPreviewPagerReason(
  direction: "previous" | "next",
  status: SemanticPreviewView["status"],
  canPage: boolean,
): string | undefined {
  if (status === "loading") return "正在加载预览。加载完成后可翻页。";
  if (canPage) return undefined;
  return direction === "previous" ? "当前已经是第一页。" : "当前没有下一页。";
}
