import type { PortState, SetupMode } from "@l2/data-clerk/types/setup";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

interface ServiceControlPanelProps {
  mode: SetupMode;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  error: string | null;
  externalBaseUrl: string;
  onInspectServicePort: () => Promise<void>;
  onStartManagedService: () => Promise<void>;
  onConnectExternalService: (baseUrl: string) => Promise<void>;
  onStopManagedService: () => Promise<void>;
  onCheckReadiness: () => Promise<void>;
}

export function ServiceControlPanel({
  mode,
  portState,
  httpReady,
  dbReady,
  loading,
  error,
  externalBaseUrl,
  onInspectServicePort,
  onStartManagedService,
  onConnectExternalService,
  onStopManagedService,
  onCheckReadiness,
}: ServiceControlPanelProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">服务控制</Typography>

      <div className="settings-inline">
        <Button
          variant="secondary"
          size="sm"
          onClick={onInspectServicePort}
          disabled={loading}
        >
          检查端口
        </Button>
        {mode === "managed" && (
          <>
            <Button
              variant="primary"
              size="sm"
              onClick={onStartManagedService}
              disabled={loading || httpReady}
            >
              启动服务
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={onStopManagedService}
              disabled={loading || !httpReady}
            >
              停止服务
            </Button>
          </>
        )}
        {mode === "external" && (
          <Button
            variant="primary"
            size="sm"
            onClick={() => onConnectExternalService(externalBaseUrl)}
            disabled={loading}
          >
            连接外部服务
          </Button>
        )}
        <Button
          variant="secondary"
          size="sm"
          onClick={onCheckReadiness}
          disabled={loading}
        >
          刷新状态
        </Button>
      </div>

      <Surface variant="subtle" className="settings-section">
        <StatusRow label="端口状态" value={portStateLabel(portState)} />
        <StatusRow label="HTTP 健康" value={httpReady ? "正常" : "未就绪"} />
        <StatusRow label="数据库" value={dbReady ? "就绪" : httpReady ? "初始化中" : "不可用"} />
        <StatusRow label="模式" value={mode === "managed" ? "应用托管" : "外部服务"} />
      </Surface>

      {error && (
        <div className="settings-error" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="settings-inline">
      <Typography variant="caption" color="var(--text-secondary)">
        {label}
      </Typography>
      <StatusIndicator label={value} tone={value === "正常" || value === "就绪" ? "success" : "neutral"} />
    </div>
  );
}

function portStateLabel(state: string): string {
  switch (state) {
    case "free": return "空闲";
    case "owned": return "本应用占用";
    case "external-chatlog": return "外部 chatlog 服务";
    case "occupied": return "被其他进程占用";
    default: return "未知";
  }
}
