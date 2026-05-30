import type { SidecarStatus, DbStatus } from "@l2/data-clerk/types/app";
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import { StatusIndicator, Typography, type StatusTone } from "@l4/ui";
import { SIDECAR_PORT } from "@/utils/constants";

interface StatusBarProps {
  status: SidecarStatus;
  error?: string;
  dbStatus?: DbStatus;
  indexStatus?: IndexStatusResponse | null;
  httpReady?: boolean;
  dbReady?: boolean;
  portStatus?: string;
}

const STATUS_LABELS: Record<SidecarStatus, string> = {
  stopped: "引擎已停止",
  starting: "引擎启动中",
  running: "引擎运行中",
  error: "引擎异常",
};

const STATUS_TONES: Record<SidecarStatus, StatusTone> = {
  stopped: "neutral",
  starting: "warning",
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
  connecting: "warning",
  decrypting: "warning",
  ready: "success",
  error: "danger",
};

export function StatusBar({ status, error, dbStatus, indexStatus, httpReady, dbReady, portStatus }: StatusBarProps) {
  const isStarting = status === "starting";
  const isDbBusy = dbStatus === "connecting" || dbStatus === "decrypting";
  const isIndexBuilding = indexStatus?.status === "building";
  const indexProgress = indexStatus && indexStatus.total > 0
    ? Math.round((indexStatus.completed / indexStatus.total) * 100)
    : 0;

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
        {indexStatus && (indexStatus.status === "ready" || indexStatus.status === "building") && (
          <StatusIndicator
            label={indexStatus.status === "ready"
              ? "AI 就绪"
              : `索引构建中 ${indexProgress}%`}
            tone={indexStatus.status === "ready" ? "success" : "warning"}
            busy={isIndexBuilding}
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
          :{SIDECAR_PORT}
        </Typography>
      </div>
    </footer>
  );
}
