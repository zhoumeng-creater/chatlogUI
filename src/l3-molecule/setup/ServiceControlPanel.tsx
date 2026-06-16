import type { PortState, SetupMode } from "@l2/data-clerk/types/setup";
import { Field, Input, StatusIndicator, Surface, Typography } from "@l4/ui";
import { formatSafeUserFacingError } from "@/utils/privacyDisplay";

interface ServiceControlPanelProps {
  mode: SetupMode;
  portState: PortState;
  httpReady: boolean;
  dbReady: boolean;
  loading: boolean;
  error: string | null;
  externalBaseUrl: string;
  externalBaseUrlError: string | null;
  latestDiagnosticFamily: string;
  onExternalBaseUrlChange: (value: string) => void;
}

export function ServiceControlPanel({
  mode,
  portState,
  httpReady,
  dbReady,
  loading,
  error,
  externalBaseUrl,
  externalBaseUrlError,
  latestDiagnosticFamily,
  onExternalBaseUrlChange,
}: ServiceControlPanelProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">服务状态</Typography>

      {mode === "external" && (
        <Field
          id="external-chatlog-base-url"
          label="外部服务地址"
          hint="仅支持本机 HTTP origin，例如 http://127.0.0.1:5030"
          error={externalBaseUrlError}
        >
          <Input
            id="external-chatlog-base-url"
            value={externalBaseUrl}
            inputMode="url"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="http://127.0.0.1:5030"
            aria-invalid={Boolean(externalBaseUrlError)}
            onChange={(event) => onExternalBaseUrlChange(event.currentTarget.value)}
          />
        </Field>
      )}

      {loading && (
        <Typography variant="caption" color="var(--text-secondary)">
          正在检查服务和数据库状态...
        </Typography>
      )}

      <Surface variant="subtle" className="settings-section">
        <StatusRow label="模式" value={mode === "managed" ? "应用托管" : "外部服务"} />
        <StatusRow label="端口状态" value={portStateLabel(portState)} />
        <StatusRow label="HTTP 健康" value={httpReady ? "正常" : "未就绪"} />
        <StatusRow label="数据库" value={dbReady ? "就绪" : httpReady ? "数据库尚未就绪" : "不可用"} />
        <StatusRow label="最近诊断事件" value={latestDiagnosticFamily || "none"} />
        <Typography variant="caption" color="var(--text-secondary)">
          {safeServiceActionMessage({ mode, portState })}
        </Typography>
      </Surface>

      {error && (
        <div className="settings-error" role="alert">
          {formatSafeUserFacingError(error)}
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
    case "external-chatlog": return "外部本机服务";
    case "occupied": return "未知进程占用";
    default: return "未知";
  }
}

function safeServiceActionMessage({
  mode,
  portState,
}: {
  mode: SetupMode;
  portState: PortState;
}): string {
  if (portState === "occupied") {
    return "应用不会停止未知进程；请手动处理端口占用或改用已有服务。";
  }
  if (mode === "external" || portState === "external-chatlog") {
    return "仅连接本机服务，不会停止外部进程。";
  }
  if (portState === "owned") {
    return "停止服务只会影响本应用托管的本机服务。";
  }
  return "应用只会启动或停止自己托管的本机服务。";
}
