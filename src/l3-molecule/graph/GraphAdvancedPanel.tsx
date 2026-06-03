import { Database, Play, Save, X } from "lucide-react";
import { Button, Input, Typography } from "@l4/ui";
import type {
  GraphBusinessDraft,
  GraphConfigDraft,
  GraphEventDraft,
  GraphQADraft,
} from "@l4/network";
import type { GraphResidualView } from "@l2/commander/graphResidualViewModel";

interface GraphAdvancedPanelProps {
  view: GraphResidualView;
  configDraft: GraphConfigDraft;
  businessDraft: GraphBusinessDraft;
  eventDraft: GraphEventDraft;
  qaDraft: GraphQADraft;
  privacyOn: boolean;
  onLoadConfig: () => void;
  onSaveConfig: () => void;
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
  onLoadConfig,
  onSaveConfig,
  onConfigDraftChange,
  onBusinessDraftChange,
  onEventDraftChange,
  onQADraftChange,
  onBusinessIngest,
  onEventIngest,
  onGraphQA,
  onCancelConfirmation,
}: GraphAdvancedPanelProps) {
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
        <Button variant="ghost" size="sm" loading={view.configStatus === "loading"} onClick={onLoadConfig}>
          <Database size={14} />
          读取配置
        </Button>
      </div>
      {view.errorCopy && (
        <Typography variant="caption" color="var(--danger)">
          {view.errorCopy}
        </Typography>
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
            Config
          </Typography>
          <div className="graph-advanced-row">
            <label className="developer-field">
              <span>Workers</span>
              <Input
                controlSize="sm"
                type="number"
                min={1}
                value={configDraft.workers}
                onChange={(event) => onConfigDraftChange({ workers: Number(event.currentTarget.value) })}
              />
            </label>
            <label className="developer-field">
              <span>Enqueue</span>
              <Input
                controlSize="sm"
                type="number"
                min={1}
                value={configDraft.enqueueWorkers}
                onChange={(event) => onConfigDraftChange({ enqueueWorkers: Number(event.currentTarget.value) })}
              />
            </label>
          </div>
          <Button variant="secondary" size="sm" loading={view.configStatus === "loading"} onClick={onSaveConfig}>
            <Save size={14} />
            保存配置
          </Button>
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            Business Ingest
          </Typography>
          <Input
            controlSize="sm"
            value={privacyOn ? "" : businessDraft.title ?? ""}
            disabled={privacyOn}
            onChange={(event) => onBusinessDraftChange({ title: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏标题草稿" : "标题"}
          />
          <textarea
            className="graph-advanced-textarea"
            value={privacyOn ? "" : businessDraft.content ?? ""}
            disabled={privacyOn}
            onChange={(event) => onBusinessDraftChange({ content: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏内容草稿" : "业务内容"}
          />
          <Button
            variant={view.businessIngestCopy.startsWith("确认") ? "danger" : "secondary"}
            size="sm"
            disabled={privacyOn}
            loading={view.ingestStatus === "loading"}
            onClick={onBusinessIngest}
          >
            <Play size={14} />
            {view.businessIngestCopy}
          </Button>
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            Event Ingest
          </Typography>
          <Input
            controlSize="sm"
            value={privacyOn ? "" : eventDraft.eventType ?? ""}
            disabled={privacyOn}
            onChange={(event) => onEventDraftChange({ eventType: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏事件类型" : "event_type"}
          />
          <textarea
            className="graph-advanced-textarea"
            value={privacyOn ? "" : eventDraft.content ?? ""}
            disabled={privacyOn}
            onChange={(event) => onEventDraftChange({ content: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏事件内容" : "事件内容"}
          />
          <Button
            variant={view.eventIngestCopy.startsWith("确认") ? "danger" : "secondary"}
            size="sm"
            disabled={privacyOn}
            loading={view.ingestStatus === "loading"}
            onClick={onEventIngest}
          >
            <Play size={14} />
            {view.eventIngestCopy}
          </Button>
        </section>
        <section className="graph-advanced-card">
          <Typography variant="label" weight={700}>
            Graph QA
          </Typography>
          <textarea
            className="graph-advanced-textarea"
            value={privacyOn ? "" : qaDraft.query}
            disabled={privacyOn}
            onChange={(event) => onQADraftChange({ query: event.currentTarget.value })}
            placeholder={privacyOn ? "隐私模式已隐藏问题草稿" : "询问图谱关系、事件或事实"}
          />
          <Typography variant="caption" color="var(--text-secondary)">
            {view.qaSummary}
          </Typography>
          <Typography variant="caption" color="var(--text-secondary)">
            {view.ingestSummary}
          </Typography>
          <Button
            variant={view.qaCopy.startsWith("确认") ? "danger" : "secondary"}
            size="sm"
            disabled={privacyOn}
            loading={view.qaStatus === "loading"}
            onClick={onGraphQA}
          >
            <Play size={14} />
            {view.qaCopy}
          </Button>
        </section>
      </div>
    </section>
  );
}
