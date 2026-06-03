import { useState } from "react";
import type { SetupProfileSummary } from "@l2/data-clerk/types/setup";
import { Button, Typography } from "@l4/ui";

interface ConfigImportPanelProps {
  loading: boolean;
  error: string | null;
  profile: SetupProfileSummary | null;
  onChooseDataDirectory: () => Promise<string | null>;
}

export function ConfigImportPanel({
  loading,
  error,
  profile,
  onChooseDataDirectory,
}: ConfigImportPanelProps) {
  const [picked, setPicked] = useState<string | null>(null);

  async function handlePickDir() {
    const dir = await onChooseDataDirectory();
    if (!dir) return;
    setPicked(dir);
  }

  return (
    <div className="space-y-4">
      <Typography variant="h2">导入配置</Typography>
      <p className="text-sm text-gray-500">
        选择包含 chatlog.json 的微信数据目录，应用将自动读取配置信息。
      </p>
      <Button variant="primary" size="md" loading={loading} onClick={handlePickDir}>
        选择微信数据目录
      </Button>
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
