import { Play } from "lucide-react";
import { Button, DisabledReason, Input, Typography } from "@l4/ui";
import type { GraphQADraft } from "@l4/network";
import type { GraphResidualView } from "@l2/commander/graphResidualViewModel";

interface GraphQAPanelProps {
  view: GraphResidualView;
  draft: GraphQADraft;
  privacyOn: boolean;
  onDraftChange: (draft: Partial<GraphQADraft>) => void;
  onAsk: () => void;
}

export function GraphQAPanel({
  view,
  draft,
  privacyOn,
  onDraftChange,
  onAsk,
}: GraphQAPanelProps) {
  const privacyDisabledReasonId = privacyOn ? "graph-qa-privacy-disabled-reason" : undefined;
  const qaLoadingReason = !privacyOn && view.qaStatus === "loading"
    ? "正在执行图谱问答。完成后可再次提问。"
    : undefined;
  const qaLoadingReasonId = qaLoadingReason ? "graph-qa-loading-disabled-reason" : undefined;
  const askDisabledReasonId = privacyDisabledReasonId ?? qaLoadingReasonId;
  const askButton = (
    <Button
      variant={view.qaCopy.startsWith("确认") ? "danger" : "primary"}
      size="sm"
      disabled={privacyOn}
      aria-describedby={askDisabledReasonId}
      loading={view.qaStatus === "loading"}
      onClick={onAsk}
    >
      <Play size={14} />
      {view.qaCopy}
    </Button>
  );

  return (
    <section className="graph-qa-panel" role="region" aria-label="图谱问答面板">
      <div className="graph-qa-panel__header">
        <Typography variant="label" weight={700}>
          图谱问答
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {view.qaSummary}
        </Typography>
      </div>
      {privacyOn && (
        <DisabledReason
          id={privacyDisabledReasonId}
          reason="隐私模式下不可提问图谱。关闭隐私模式后可继续图谱问答。"
          variant="inline"
        />
      )}
      <div className="graph-qa-panel__filters">
        <Input
          controlSize="sm"
          value={privacyOn ? "" : draft.window ?? ""}
          disabled={privacyOn}
          aria-describedby={privacyDisabledReasonId}
          onChange={(event) => onDraftChange({ window: event.currentTarget.value })}
          placeholder={privacyOn ? "隐私模式已隐藏窗口" : "window，例如 7d"}
          aria-label="图谱问答时间窗口"
        />
        <Input
          controlSize="sm"
          type="date"
          value={privacyOn ? "" : draft.start ?? ""}
          disabled={privacyOn}
          aria-describedby={privacyDisabledReasonId}
          onChange={(event) => onDraftChange({ start: event.currentTarget.value })}
          aria-label="图谱问答开始日期"
        />
        <Input
          controlSize="sm"
          type="date"
          value={privacyOn ? "" : draft.end ?? ""}
          disabled={privacyOn}
          aria-describedby={privacyDisabledReasonId}
          onChange={(event) => onDraftChange({ end: event.currentTarget.value })}
          aria-label="图谱问答结束日期"
        />
      </div>
      <textarea
        className="graph-qa-panel__textarea"
        value={privacyOn ? "" : draft.query}
        disabled={privacyOn}
        aria-describedby={privacyDisabledReasonId}
        onChange={(event) => onDraftChange({ query: event.currentTarget.value })}
        placeholder={privacyOn ? "隐私模式已隐藏问题草稿" : "询问图谱关系、事件或事实"}
        aria-label="图谱问题"
      />
      <div className="graph-qa-panel__footer">
        <Typography variant="caption" color="var(--text-secondary)">
          证据默认只显示数量与摘要，不展示原始证据文本。
        </Typography>
        {qaLoadingReason ? (
          <DisabledReason id={qaLoadingReasonId} reason={qaLoadingReason} variant="compact">
            {askButton}
          </DisabledReason>
        ) : askButton}
      </div>
    </section>
  );
}
