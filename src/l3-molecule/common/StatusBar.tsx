import type { SidecarStatus, DbStatus } from "@l2/data-clerk/types/app";
import type { IndexStatusResponse } from "@/l2-coordinator/api-docs/semantic";
import { Typography, Spinner } from "@l4/ui";
import { SIDECAR_PORT } from "@/utils/constants";

interface StatusBarProps {
  status: SidecarStatus;
  error?: string;
  dbStatus?: DbStatus;
  indexStatus?: IndexStatusResponse | null;
}

const STATUS_LABELS: Record<SidecarStatus, string> = {
  stopped: "引擎已停止",
  starting: "引擎启动中",
  running: "引擎运行中",
  error: "引擎异常",
};

const STATUS_COLORS: Record<SidecarStatus, string> = {
  stopped: "#8E8E93",
  starting: "#FF9500",
  running: "#34C759",
  error: "#FF3B30",
};

const DB_STATUS_LABELS: Record<DbStatus, string> = {
  disconnected: "DB未连接",
  connecting: "DB连接中",
  decrypting: "DB解密中",
  ready: "DB就绪",
  error: "DB异常",
};

const DB_STATUS_COLORS: Record<DbStatus, string> = {
  disconnected: "#8E8E93",
  connecting: "#FF9500",
  decrypting: "#FF9500",
  ready: "#34C759",
  error: "#FF3B30",
};

export function StatusBar({ status, error, dbStatus, indexStatus }: StatusBarProps) {
  const isStarting = status === "starting";
  const isDbBusy = dbStatus === "connecting" || dbStatus === "decrypting";
  const isIndexBuilding = indexStatus?.status === "building";
  const indexProgress = indexStatus && indexStatus.total > 0
    ? Math.round((indexStatus.completed / indexStatus.total) * 100)
    : 0;

  return (
    <footer className="flex items-center justify-between h-8 px-4 shrink-0 border-t border-black/5">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full"
            style={{ backgroundColor: STATUS_COLORS[status] }}
          />
          <Typography variant="caption" color="#8E8E93">
            {STATUS_LABELS[status]}
          </Typography>
          {isStarting && <Spinner size={12} color={STATUS_COLORS[status]} />}
        </div>
        {dbStatus && (
          <div className="flex items-center gap-2">
            <span className="w-[1px] h-3 bg-black/10" />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: DB_STATUS_COLORS[dbStatus] }}
            />
            <Typography variant="caption" color="#8E8E93">
              {DB_STATUS_LABELS[dbStatus]}
            </Typography>
            {isDbBusy && <Spinner size={12} color={DB_STATUS_COLORS[dbStatus]} />}
          </div>
        )}
        {indexStatus && (indexStatus.status === "ready" || indexStatus.status === "building") && (
          <div className="flex items-center gap-2">
            <span className="w-[1px] h-3 bg-black/10" />
            <span
              className="w-2 h-2 rounded-full"
              style={{ backgroundColor: indexStatus.status === "ready" ? "#34C759" : "#FF9500" }}
            />
            <Typography variant="caption" color="#8E8E93">
              {indexStatus.status === "ready"
                ? "AI 就绪"
                : `索引构建中 ${indexProgress}%`}
            </Typography>
            {isIndexBuilding && <Spinner size={12} color="#FF9500" />}
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        {error && (
          <Typography variant="caption" color="#FF3B30">
            {error}
          </Typography>
        )}
        <Typography variant="caption" color="#C7C7CC">
          :{SIDECAR_PORT}
        </Typography>
      </div>
    </footer>
  );
}
