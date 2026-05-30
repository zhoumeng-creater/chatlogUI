import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
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
        <button
          type="button"
          onClick={inspectServicePort}
          disabled={loading}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          检查端口
        </button>
        {mode === "managed" && (
          <>
            <button
              type="button"
              onClick={startManagedService}
              disabled={loading || httpReady}
              className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              启动服务
            </button>
            <button
              type="button"
              onClick={stopManagedService}
              disabled={loading || !httpReady}
              className="px-3 py-1.5 text-sm text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-50"
            >
              停止服务
            </button>
          </>
        )}
        {mode === "external" && (
          <button
            type="button"
            onClick={() => connectExternalService(profile?.httpAddr ?? "http://127.0.0.1:5030")}
            disabled={loading}
            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            连接外部服务
          </button>
        )}
        <button
          type="button"
          onClick={checkReadiness}
          disabled={loading}
          className="px-3 py-1.5 text-sm border rounded-md hover:bg-gray-50 disabled:opacity-50"
        >
          刷新状态
        </button>
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
