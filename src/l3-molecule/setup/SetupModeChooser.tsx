import type { SetupMode } from "@l2/data-clerk/types/setup";
import { classNames } from "@/utils/classNames";

interface SetupModeChooserProps {
  mode: SetupMode;
  onChooseMode: (mode: SetupMode) => void;
}

export function SetupModeChooser({ mode, onChooseMode }: SetupModeChooserProps) {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold text-gray-800">选择服务模式</h2>
      <div className="grid gap-3">
        <button
          type="button"
          onClick={() => onChooseMode("managed")}
          className={classNames(
            "text-left p-4 rounded-lg border-2 transition-colors",
            mode === "managed"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300",
          )}
        >
          <div className="font-medium text-gray-800">由应用启动 chatlog_alpha</div>
          <div className="text-sm text-gray-500 mt-1">
            应用将自动管理本地 chatlog_alpha 服务的启动和停止
          </div>
        </button>
        <button
          type="button"
          onClick={() => onChooseMode("external")}
          className={classNames(
            "text-left p-4 rounded-lg border-2 transition-colors",
            mode === "external"
              ? "border-blue-500 bg-blue-50"
              : "border-gray-200 hover:border-gray-300",
          )}
        >
          <div className="font-medium text-gray-800">连接已经运行的 chatlog_alpha 服务</div>
          <div className="text-sm text-gray-500 mt-1">
            你已经手动启动了服务，应用仅连接到已有服务，不会启动或停止任何进程
          </div>
        </button>
      </div>
    </div>
  );
}
