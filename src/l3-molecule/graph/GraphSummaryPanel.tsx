import { Pause, Play, RefreshCw, RotateCcw } from "lucide-react";
import { Button, StatusIndicator, Typography } from "@l4/ui";
import type {
  GraphActionResultView,
  GraphLoadStatusView,
  GraphStatusSummaryView,
  GraphVisualizeViewState,
} from "./graphTypes";

interface GraphSummaryPanelProps {
  statusSummary: GraphStatusSummaryView | null;
  visualize: GraphVisualizeViewState | null;
  loadStatus: GraphLoadStatusView;
  loading: boolean;
  actionStatus: GraphActionResultView | null;
  onRefresh: () => void;
  onRebuild: () => void;
  onPause: () => void;
  onResume: () => void;
  onCancel: () => void;
}

export function GraphSummaryPanel({
  statusSummary,
  visualize,
  loadStatus,
  loading,
  actionStatus,
  onRefresh,
  onRebuild,
  onPause,
  onResume,
  onCancel,
}: GraphSummaryPanelProps) {
  const status = statusSummary?.state ?? loadStatus;
  const counts = statusSummary?.counts;
  const summary = visualize?.summary;

  return (
    <div className="graph-summary-panel" aria-label="图谱状态">
      <div className="graph-summary-panel__status">
        <StatusIndicator
          label={statusLabel(status)}
          tone={statusTone(status)}
          busy={loading || status === "running" || status === "loading"}
        />
        {actionStatus && (
          <Typography variant="caption" color="var(--text-secondary)">
            {actionStatus.accepted ? "任务已提交" : actionStatus.status || "操作完成"}
          </Typography>
        )}
      </div>

      <div className="graph-summary-panel__metrics">
        <Metric label="实体" value={counts?.entities ?? summary?.nodeCount ?? 0} />
        <Metric label="关系" value={counts?.relations ?? summary?.edgeCount ?? 0} />
        <Metric label="事件" value={counts?.events ?? summary?.timelineCount ?? 0} />
        <Metric label="待处理" value={statusSummary?.pending ?? 0} />
      </div>

      {statusSummary && statusSummary.progressPct > 0 && statusSummary.progressPct < 100 && (
        <div className="graph-summary-panel__progress" aria-label={`图谱处理进度 ${statusSummary.progressPct}%`}>
          <span style={{ width: `${statusSummary.progressPct}%` }} />
        </div>
      )}

      <div className="graph-summary-panel__actions">
        <Button variant="secondary" size="sm" onClick={onRefresh} loading={loading}>
          <RefreshCw size={14} />
          刷新
        </Button>
        <Button variant="ghost" size="sm" onClick={onRebuild}>
          <RotateCcw size={14} />
          重建
        </Button>
        {statusSummary?.paused ? (
          <Button variant="ghost" size="sm" onClick={onResume}>
            <Play size={14} />
            继续
          </Button>
        ) : (
          <Button variant="ghost" size="sm" onClick={onPause}>
            <Pause size={14} />
            暂停
          </Button>
        )}
        {loading && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            停止
          </Button>
        )}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="graph-summary-panel__metric">
      <Typography variant="caption" color="var(--text-secondary)">
        {label}
      </Typography>
      <Typography variant="body" weight={700}>
        {value.toLocaleString("zh-CN")}
      </Typography>
    </div>
  );
}

function statusLabel(status: GraphLoadStatusView | GraphStatusSummaryView["state"]): string {
  const labels: Record<string, string> = {
    idle: "待加载",
    loading: "加载中",
    loaded: "已加载",
    ready: "就绪",
    running: "处理中",
    paused: "已暂停",
    empty: "无数据",
    malformed: "数据异常",
    oversized: "数据过大",
    unavailable: "不可用",
    error: "错误",
    failed: "错误",
    cancelled: "已停止",
  };
  return labels[status] ?? "未知";
}

function statusTone(status: GraphLoadStatusView | GraphStatusSummaryView["state"]) {
  if (status === "ready" || status === "loaded") return "success";
  if (status === "running" || status === "loading") return "info";
  if (status === "paused" || status === "empty" || status === "oversized") return "warning";
  if (status === "error" || status === "malformed") return "danger";
  return "neutral";
}
