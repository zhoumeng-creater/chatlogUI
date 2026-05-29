import { useState } from "react";
import { openDirectoryPicker } from "@l4/system";
import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { Typography } from "@l4/ui/Typography";

export function ConfigImportPanel() {
  const { importDataDirectory } = useSetupCommander();
  const loading = useSetupStore((s) => s.loading);
  const error = useSetupStore((s) => s.error);
  const profile = useSetupStore((s) => s.profile);
  const [picked, setPicked] = useState<string | null>(null);

  async function handlePickDir() {
    const dir = await openDirectoryPicker();
    if (!dir) return;
    setPicked(dir);
    await importDataDirectory(dir);
  }

  return (
    <div className="space-y-4">
      <Typography variant="h2">导入配置</Typography>
      <p className="text-sm text-gray-500">
        选择包含 chatlog.json 的微信数据目录，应用将自动读取配置信息。
      </p>
      <button
        type="button"
        onClick={handlePickDir}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm font-medium"
      >
        {loading ? "正在读取..." : "选择微信数据目录"}
      </button>
      {picked && (
        <p className="text-xs text-gray-400">已选择: {picked}</p>
      )}
      {profile && (
        <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded-md text-sm">
          <p className="text-green-700 font-medium">配置已导入</p>
          <p className="text-green-600">
            平台: {profile.platform ?? "-"} | 版本: {profile.fullVersion ?? "-"}
          </p>
          <p className="text-green-600">
            密钥: {profile.hasDataKey ? "已获取" : "未获取"}
          </p>
        </div>
      )}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
