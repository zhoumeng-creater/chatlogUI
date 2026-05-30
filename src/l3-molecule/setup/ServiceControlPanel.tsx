import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { Button } from "@l4/ui/Button";
import { Typography } from "@l4/ui/Typography";

export function ServiceControlPanel() {
  const {
    inspectServicePort,
    startManagedService,
    connectExternalService,
    stopManagedService,
    checkReadiness,
  } = useSetupCommander();

  const mode = useSetupStore((s) => s.mode);
  const portState = useSetupStore((s) => s.portState);
  const httpReady = useSetupStore((s) => s.httpReady);
  const dbReady = useSetupStore((s) => s.dbReady);
  const loading = useSetupStore((s) => s.loading);
  const error = useSetupStore((s) => s.error);
  const profile = useSetupStore((s) => s.profile);

  return (
    <div className="space-y-4">
      <Typography variant="h2">服务控制</Typography>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={inspectServicePort}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          检查端口
        </Button>
        {mode === "managed" && (
          <>
            <Button
              type="button"
              onClick={startManagedService}
              disabled={loading || httpReady}
              variant="primary"
              size="sm"
            >
              启动服务
            </Button>
            <Button
              type="button"
              onClick={stopManagedService}
              disabled={loading || !httpReady}
              variant="danger"
              size="sm"
            >
              停止服务
            </Button>
          </>
        )}
        {mode === "external" && (
          <Button
            type="button"
            onClick={() => connectExternalService(profile?.httpAddr ?? "http://127.0.0.1:5030")}
            disabled={loading}
            variant="primary"
            size="sm"
          >
            连接外部服务
          </Button>
        )}
        <Button
          type="button"
          onClick={checkReadiness}
          disabled={loading}
          variant="secondary"
          size="sm"
        >
          刷新状态
        </Button>
      </div>

      <div className="grid gap-2 text-sm">
        <StatusRow label="端口状态" value={portStateLabel(portState)} />
        <StatusRow label="HTTP 健康" value={httpReady ? "正常" : "未就绪"} />
        <StatusRow label="数据库" value={dbReady ? "就绪" : httpReady ? "初始化中" : "不可用"} />
        <StatusRow label="模式" value={mode === "managed" ? "应用托管" : "外部服务"} />
      </div>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}

function StatusRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-gray-100">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800 font-medium">{value}</span>
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
