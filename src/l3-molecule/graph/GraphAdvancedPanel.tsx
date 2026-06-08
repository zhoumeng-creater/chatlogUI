import { Database, Pause, Play, RefreshCw, RotateCcw, Save, X } from "lucide-react";
import { Button, DisabledReason, Input, Typography } from "@l4/ui";
import type {
  GraphBusinessDraft,
  GraphConfigDraft,
  GraphEventDraft,
  GraphQADraft,
  GraphResidualView,
} from "@l2/commander/graphResidualViewModel";

interface GraphAdvancedPanelProps {
  view: GraphResidualView;
  configDraft: GraphConfigDraft;
  businessDraft: GraphBusinessDraft;
  eventDraft: GraphEventDraft;
  qaDraft: GraphQADraft;
  privacyOn: boolean;
  graphPaused: boolean;
  onLoadConfig: () => void;
  onSaveConfig: () => void;
  onRebuild: () => void;
  onResetRebuild: () => void;
  onPause: () => void;
  onResume: () => void;
  onConfigDraftChange: (draft: Partial<GraphConfigDraft>) => void;
  onBusinessDraftChange: (draft: Partial<GraphBusinessDraft>) => void;
  onEventDraftChange: (draft: Partial<GraphEventDraft>) => void;
  onQADraftChange: (draft: Partial<GraphQADraft>) => void;
  onBusinessIngest: () => void;
  onEventIngest: () => void;
  onGraphQA: () => void;
  onCancelConfirmation: () => void;
}

export function GraphAdvancedPanel({
  view,
  configDraft,
  businessDraft,
  eventDraft,
  qaDraft,
  privacyOn,
  graphPaused,
  onLoadConfig,
  onSaveConfig,
  onRebuild,
  onResetRebuild,
  onPause,
  onResume,
  onConfigDraftChange,
  onBusinessDraftChange,
  onEventDraftChange,
  onQADraftChange,
  onBusinessIngest,
  onEventIngest,
  onGraphQA,
  onCancelConfirmation,
}: GraphAdvancedPanelProps) {
  const privacyDisabledReasonId = privacyOn ? "graph-advanced-privacy-disabled-reason" : undefined;
  const configLoadReason = view.configStatus === "loading"
    ? "正在读取图谱配置。读取完成后可再次刷新。"
    : undefined;
  const configLoadReasonId = configLoadReason ? "graph-advanced-config-load-disabled-reason" : undefined;
  const configSaveReason = view.configStatus === "loading"
    ? "正在保存图谱配置。保存完成后可再次提交。"
    : undefined;
  const configSaveReasonId = configSaveReason ? "graph-advanced-config-save-disabled-reason" : undefined;
  const ingestLoadingReason = !privacyOn && view.ingestStatus === "loading"
    ? "正在写入图谱。写入完成后可再次提交。"
    : undefined;
  const businessIngestLoadingReasonId = ingestLoadingReason ? "graph-advanced-business-ingest-disabled-reason" : undefined;
  const eventIngestLoadingReasonId = ingestLoadingReason ? "graph-advanced-event-ingest-disabled-reason" : undefined;
  const businessIngestDisabledReasonId = privacyDisabledReasonId ?? businessIngestLoadingReasonId;
  const eventIngestDisabledReasonId = privacyDisabledReasonId ?? eventIngestLoadingReasonId;
  const qaLoadingReason = !privacyOn && view.qaStatus === "loading"
    ? "正在执行图谱问答。完成后可再次提问。"
    : undefined;
  const qaLoadingReasonId = qaLoadingReason ? "graph-advanced-qa-disabled-reason" : undefined;
  const qaDisabledReasonId = privacyDisabledReasonId ?? qaLoadingReasonId;
  const loadConfigButton = (
    <Button
      variant="ghost"
      size="sm"
      loading={view.configStatus === "loading"}
      aria-describedby={configLoadReasonId}
      onClick={onLoadConfig}
    >
      <Database size={14} />
      读取配置
    </Button>
  );
  const saveConfigButton = (
    <Button
      variant="secondary"
      size="sm"
      loading={view.configStatus === "loading"}
      aria-describedby={configSaveReasonId}
      onClick={onSaveConfig}
    >
      <Save size={14} />
      保存配置
    </Button>
  );
  const businessIngestButton = (
    <Button
      variant={view.businessIngestCopy.startsWith("确认") ? "danger" : "secondary"}
      size="sm"
      disabled={privacyOn}
      aria-describedby={businessIngestDisabledReasonId}
      loading={view.ingestStatus === "loading"}
      onClick={onBusinessIngest}
    >
      <Play size={14} />
      {view.businessIngestCopy}
    </Button>
  );
  const eventIngestButton = (
    <Button
      variant={view.eventIngestCopy.startsWith("确认") ? "danger" : "secondary"}
      size="sm"
      disabled={privacyOn}
      aria-describedby={eventIngestDisabledReasonId}
      loading={view.ingestStatus === "loading"}
      onClick={onEventIngest}
    >
      <Play size={14} />
      {view.eventIngestCopy}
    </Button>
  );
  const graphQAButton = (
    <Button
      variant={view.qaCopy.startsWith("确认") ? "danger" : "secondary"}
      size="sm"
      disabled={privacyOn}
      aria-describedby={qaDisabledReasonId}
      loading={view.qaStatus === "loading"}
      onClick={onGraphQA}
    >
      <Play size={14} />
      {view.qaCopy}
    </Button>
  );

  return (
    <section className="graph-advanced-panel" aria-label="图谱高级能力">
      <div className="graph-advanced-panel__header">
        <div>
          <Typography variant="label" weight={700}>
            高级图谱能力
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.configSummary}
          </Typography>
        </div>
        {configLoadReason ? (
          <DisabledReason id={configLoadReasonId} reason={configLoadReason} variant="compact">
            {loadConfigButton}
          </DisabledReason>
        ) : loadConfigButton}
      </div>
      {view.errorCopy && (
        <Typography variant="caption" color="var(--danger)">
          {view.errorCopy}
        </Typography>
      )}
      {privacyOn && (
        <DisabledReason
          id={privacyDisabledReasonId}
          reason="隐私模式下不可写入图谱。关闭隐私模式后可继续图谱高级操作。"
          variant="inline"
        />
      )}
      {view.confirmationCopy && (
        <div className="graph-advanced-confirmation">
          <Typography variant="caption" color="var(--danger)">
            {view.confirmationCopy}
          </Typography>
          <Button variant="ghost" size="sm" onClick={onCancelConfirmation}>
            <X size={14} />
            取消
          </Button>
        </div>
      )}
      <div className="graph-advanced-grid">
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            抽取配置
          </Typography>
          <div className="graph-advanced-row">
            <label className="developer-field">
              <span>图谱线程</span>
              <Input
                controlSize="sm"
                type="number"
                min={1}
                value={configDraft.workers}
                onChange={(event) => onConfigDraftChange({ workers: Number(event.currentTarget.value) })}
              />
            </label>
            <label className="developer-field">
              <span>入队线程</span>
              <Input
                controlSize="sm"
                type="number"
                min={1}
                value={configDraft.enqueueWorkers}
                onChange={(event) => onConfigDraftChange({ enqueueWorkers: Number(event.currentTarget.value) })}
              />
            </label>
          </div>
          {configSaveReason ? (
            <DisabledReason id={configSaveReasonId} reason={configSaveReason} variant="compact">
              {saveConfigButton}
            </DisabledReason>
          ) : saveConfigButton}
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            管理操作
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            暂停、重建和重置重建会调用本地图谱管理接口。
          </Typography>
          <div className="graph-advanced-actions">
            <Button
              variant="secondary"
              size="sm"
              onClick={graphPaused ? onResume : onPause}
            >
              {graphPaused ? <Play size={14} /> : <Pause size={14} />}
              {graphPaused ? "继续抽取" : "暂停抽取"}
            </Button>
            <Button variant="secondary" size="sm" onClick={onRebuild}>
              <RefreshCw size={14} />
              重建
            </Button>
            <Button
              variant={view.resetRebuildCopy.startsWith("确认") ? "danger" : "secondary"}
              size="sm"
              onClick={onResetRebuild}
            >
              <RotateCcw size={14} />
              {view.resetRebuildCopy}
            </Button>
          </div>
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            业务记录写入
          </Typography>
          <Input
            controlSize="sm"
            value={privacyOn ? "" : businessDraft.title ?? ""}
            disabled={privacyOn}
            aria-describedby={privacyDisabledReasonId}
            onChange={(event) => onBusinessDraftChange({ title: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏标题草稿" : "标题"}
          />
          <textarea
            className="graph-advanced-textarea"
            value={privacyOn ? "" : businessDraft.content ?? ""}
            disabled={privacyOn}
            aria-describedby={privacyDisabledReasonId}
            onChange={(event) => onBusinessDraftChange({ content: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏内容草稿" : "业务内容"}
          />
          {ingestLoadingReason ? (
            <DisabledReason id={businessIngestLoadingReasonId} reason={ingestLoadingReason} variant="compact">
              {businessIngestButton}
            </DisabledReason>
          ) : businessIngestButton}
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            事件写入
          </Typography>
          <Input
            controlSize="sm"
            value={privacyOn ? "" : eventDraft.eventType ?? ""}
            disabled={privacyOn}
            aria-describedby={privacyDisabledReasonId}
            onChange={(event) => onEventDraftChange({ eventType: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏事件类型" : "事件类型"}
          />
          <textarea
            className="graph-advanced-textarea"
            value={privacyOn ? "" : eventDraft.content ?? ""}
            disabled={privacyOn}
            aria-describedby={privacyDisabledReasonId}
            onChange={(event) => onEventDraftChange({ content: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏事件内容" : "事件内容"}
          />
          {ingestLoadingReason ? (
            <DisabledReason id={eventIngestLoadingReasonId} reason={ingestLoadingReason} variant="compact">
              {eventIngestButton}
            </DisabledReason>
          ) : eventIngestButton}
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            图谱问答
          </Typography>
          <textarea
            className="graph-advanced-textarea"
            value={privacyOn ? "" : qaDraft.query}
            disabled={privacyOn}
            aria-describedby={privacyDisabledReasonId}
            onChange={(event) => onQADraftChange({ query: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏问题草稿" : "询问图谱关系、事件或事实"}
          />
          <Typography variant="caption" color="var(--text-secondary)">
            {view.qaSummary}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.ingestSummary}
          </Typography>
          {qaLoadingReason ? (
            <DisabledReason id={qaLoadingReasonId} reason={qaLoadingReason} variant="compact">
              {graphQAButton}
            </DisabledReason>
          ) : graphQAButton}
        </section>
      </div>
    </section>
  );
}
