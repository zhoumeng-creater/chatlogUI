import type { SidecarStatus, DbStatus } from "@l2/data-clerk/types/app";
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import type { CompactSemanticStatus } from "@/l2-coordinator/commander/semanticViewModel";
import { StatusIndicator, Typography, type StatusTone } from "@l4/ui";

export interface StatusBarCopy {
  service: Record<SidecarStatus | "ready" | "notReady" | "connected" | "unconfigured", string>;
  database: Record<DbStatus | "initializing", string>;
}

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
  copy?: StatusBarCopy;
}

const DEFAULT_STATUS_COPY: StatusBarCopy = {
  service: {
    stopped: "本机服务已停止",
    starting: "本机服务启动中",
    running: "本机服务运行中",
    error: "本机服务异常",
    ready: "本机服务就绪",
    notReady: "本机服务未就绪",
    connected: "本机服务已连接",
    unconfigured: "本机服务未配置",
  },
  database: {
    disconnected: "数据库未连接",
    connecting: "数据库连接中",
    decrypting: "数据库解密中",
    ready: "数据库就绪",
    error: "数据库异常",
    initializing: "数据库初始化中",
  },
};

const STATUS_TONES: Record<SidecarStatus, StatusTone> = {
  stopped: "neutral",
  starting: "info",
  running: "success",
  error: "danger",
};

const DB_STATUS_TONES: Record<DbStatus, StatusTone> = {
  disconnected: "neutral",
  connecting: "info",
  decrypting: "info",
  ready: "success",
  error: "danger",
};

export function StatusBar({ status, error, dbStatus, indexStatus, httpReady, dbReady, portStatus, serviceLabel, semanticStatus, copy = DEFAULT_STATUS_COPY }: StatusBarProps) {
  const isDbBusy = dbStatus === "connecting" || dbStatus === "decrypting";
  const indexIndicator = semanticStatus ?? getIndexIndicator(indexStatus);
  const visibleServiceLabel = formatVisibleServiceLabel(serviceLabel, copy);
  const serviceIndicator = getServiceIndicator(status, httpReady, copy);

  return (
    <footer className="app-statusbar">
      <div className="app-statusbar__cluster">
        <StatusIndicator
          label={serviceIndicator.label}
          tone={serviceIndicator.tone}
          busy={serviceIndicator.busy}
        />
        {dbStatus && (
          <StatusIndicator
            label={copy.database[dbStatus]}
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
        {dbReady !== undefined && (
          <StatusIndicator
            label={dbReady ? copy.database.ready : copy.database.initializing}
            tone={dbReady ? "success" : "warning"}
          />
        )}
        {error && (
          <Typography variant="caption" color="var(--danger)">
            {error}
          </Typography>
        )}
        <Typography variant="caption" color="var(--text-muted)">
          {visibleServiceLabel}
        </Typography>
      </div>
    </footer>
  );
}

function getServiceIndicator(
  status: SidecarStatus,
  httpReady: boolean | undefined,
  copy: StatusBarCopy,
): { label: string; tone: StatusTone; busy?: boolean } {
  if (httpReady === true) {
    return { label: copy.service.ready, tone: "success" };
  }

  if (status === "starting") {
    return { label: copy.service.starting, tone: STATUS_TONES.starting, busy: true };
  }

  if (status === "error") {
    return { label: copy.service.error, tone: STATUS_TONES.error };
  }

  if (httpReady === false) {
    return { label: copy.service.notReady, tone: "neutral" };
  }

  return { label: copy.service[status], tone: STATUS_TONES[status] };
}

function formatVisibleServiceLabel(label: string | undefined, copy: StatusBarCopy): string {
  if (!label) return copy.service.unconfigured;
  if (/(?:https?:\/\/)?(?:127\.0\.0\.1|localhost|\[?::1\]?):\d{1,5}/i.test(label)) {
    return copy.service.connected;
  }
  return label;
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
