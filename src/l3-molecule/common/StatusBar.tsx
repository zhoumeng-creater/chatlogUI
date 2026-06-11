import type { SidecarStatus, DbStatus } from "@l2/data-clerk/types/app";
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import type { CompactSemanticStatus } from "@/l2-coordinator/commander/semanticViewModel";
import { StatusIndicator, Typography, type StatusTone } from "@l4/ui";

interface StatusBarProps {
  status: SidecarStatus;
  error?: string;
  dbStatus?: DbStatus;
  indexStatus?: IndexStatusResponse | null;
  httpReady?: boolean;
  dbReady?: boolean;
  portStatus?: string;
  serviceLabel?: string;
  semanticStatus?: CompactSemanticStatus | null;
}

const STATUS_LABELS: Record<SidecarStatus, string> = {
  stopped: "引擎已停止",
  starting: "引擎启动中",
  running: "引擎运行中",
  error: "引擎异常",
};

const STATUS_TONES: Record<SidecarStatus, StatusTone> = {
  stopped: "neutral",
  starting: "info",
  running: "success",
  error: "danger",
};

const DB_STATUS_LABELS: Record<DbStatus, string> = {
  disconnected: "DB未连接",
  connecting: "DB连接中",
  decrypting: "DB解密中",
  ready: "DB就绪",
  error: "DB异常",
};

const DB_STATUS_TONES: Record<DbStatus, StatusTone> = {
  disconnected: "neutral",
  connecting: "info",
  decrypting: "info",
  ready: "success",
  error: "danger",
};

export function StatusBar({ status, error, dbStatus, indexStatus, httpReady, dbReady, portStatus, serviceLabel, semanticStatus }: StatusBarProps) {
  const isStarting = status === "starting";
  const isDbBusy = dbStatus === "connecting" || dbStatus === "decrypting";
  const indexIndicator = semanticStatus ?? getIndexIndicator(indexStatus);

  return (
    <footer className="app-statusbar">
      <div className="app-statusbar__cluster">
        <StatusIndicator
          label={STATUS_LABELS[status]}
          tone={STATUS_TONES[status]}
          busy={isStarting}
        />
        {dbStatus && (
          <StatusIndicator
            label={DB_STATUS_LABELS[dbStatus]}
            tone={DB_STATUS_TONES[dbStatus]}
            busy={isDbBusy}
          />
        )}
        {indexIndicator && (
          <StatusIndicator
            label={indexIndicator.label}
            tone={indexIndicator.tone}
            busy={indexIndicator.busy}
          />
        )}
      </div>
      <div className="app-statusbar__cluster">
        {portStatus && (
          <Typography variant="caption" color="var(--text-secondary)">
            {portStatus}
          </Typography>
        )}
        {httpReady !== undefined && (
          <StatusIndicator
            label={httpReady ? "HTTP 就绪" : "HTTP 未就绪"}
            tone={httpReady ? "success" : "neutral"}
          />
        )}
        {dbReady !== undefined && (
          <StatusIndicator
            label={dbReady ? "DB 就绪" : "DB 初始化中"}
            tone={dbReady ? "success" : "warning"}
          />
        )}
        {error && (
          <Typography variant="caption" color="var(--danger)">
            {error}
          </Typography>
        )}
        <Typography variant="caption" color="var(--text-muted)">
          {serviceLabel ?? "本机服务未配置"}
        </Typography>
      </div>
    </footer>
  );
}

function getIndexIndicator(indexStatus?: IndexStatusResponse | null): { label: string; tone: StatusTone; busy?: boolean } | null {
  if (!indexStatus) return null;

  const status = String(indexStatus.status);
  if (status === "ready") {
    return { label: "AI 就绪", tone: "ai" };
  }

  if (status === "building" || status === "running") {
    const progress = getIndexProgress(indexStatus);
    return {
      label: progress !== null ? `索引处理中 ${progress}%` : "索引处理中",
      tone: "info",
      busy: true,
    };
  }

  if (status === "paused") {
    return { label: "索引已暂停", tone: "warning" };
  }

  if (status === "error") {
    return { label: "索引异常", tone: "danger" };
  }

  return null;
}

function getIndexProgress(indexStatus: IndexStatusResponse): number | null {
  const raw = indexStatus as IndexStatusResponse & {
    progress_pct?: number;
    progressPct?: number;
    processed?: number;
    pending?: number;
  };

  if (typeof raw.progress_pct === "number") return Math.round(raw.progress_pct);
  if (typeof raw.progressPct === "number") return Math.round(raw.progressPct);
  if (indexStatus.total > 0) return Math.round((indexStatus.completed / indexStatus.total) * 100);
  if (typeof raw.processed === "number" && typeof raw.pending === "number") {
    const total = raw.processed + raw.pending;
    return total > 0 ? Math.round((raw.processed / total) * 100) : null;
  }

  return null;
}
