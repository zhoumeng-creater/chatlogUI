import { useState } from "react";
import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import type { ServerConfigDraft } from "@l4/system";
import { Typography } from "@l4/ui/Typography";

export function ManualAdvancedConfigPanel() {
  const { saveManualConfig } = useSetupCommander();
  const loading = useSetupStore((s) => s.loading);
  const error = useSetupStore((s) => s.error);

  const [form, setForm] = useState<ServerConfigDraft>({
    dataDir: "",
    workDir: "",
    platform: "windows",
    version: 4,
    fullVersion: "",
    dataKey: "",
    imgKey: "",
    httpAddr: "127.0.0.1:5030",
    saveDecryptedMedia: true,
  });

  const [showKey, setShowKey] = useState(false);

  function update(field: keyof ServerConfigDraft, value: string | number | boolean | null) {
    setForm((prev) => ({ ...prev, [field]: value }));
  }

  async function handleSave() {
    await saveManualConfig(form);
  }

  return (
    <div className="space-y-4">
      <Typography variant="h2">高级手动配置</Typography>
      <p className="text-sm text-gray-500">
        手动填写 chatlog_alpha 服务所需的全部配置字段。
      </p>

      <div className="grid gap-3">
        <label className="text-sm">
          <span className="text-gray-700">数据目录 *</span>
          <input
            type="text"
            value={form.dataDir ?? ""}
            onChange={(e) => update("dataDir", e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
            placeholder="E:\WeChat Files\wxid_xxx"
          />
        </label>
        <label className="text-sm">
          <span className="text-gray-700">工作目录</span>
          <input
            type="text"
            value={form.workDir ?? ""}
            onChange={(e) => update("workDir", e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
          />
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            <span className="text-gray-700">平台 *</span>
            <select
              value={form.platform ?? "windows"}
              onChange={(e) => update("platform", e.target.value)}
              className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
            >
              <option value="windows">Windows</option>
              <option value="darwin">macOS</option>
              <option value="linux">Linux</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="text-gray-700">版本号 *</span>
            <input
              type="number"
              value={form.version ?? 4}
              onChange={(e) => update("version", Number(e.target.value))}
              className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
            />
          </label>
        </div>
        <label className="text-sm">
          <span className="text-gray-700">完整版本号 *</span>
          <input
            type="text"
            value={form.fullVersion ?? ""}
            onChange={(e) => update("fullVersion", e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
            placeholder="4.1.8.107"
          />
        </label>
        <label className="text-sm">
          <span className="text-gray-700">Data Key *</span>
          <div className="mt-1 flex gap-2">
            <input
              type={showKey ? "text" : "password"}
              value={form.dataKey ?? ""}
              onChange={(e) => update("dataKey", e.target.value)}
              className="flex-1 px-3 py-2 border rounded-md text-sm"
              placeholder="64位十六进制密钥"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="px-3 py-2 text-sm text-gray-500 border rounded-md hover:bg-gray-50"
            >
              {showKey ? "隐藏" : "显示"}
            </button>
          </div>
        </label>
        <label className="text-sm">
          <span className="text-gray-700">Image Key</span>
          <input
            type="password"
            value={form.imgKey ?? ""}
            onChange={(e) => update("imgKey", e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
          />
        </label>
        <label className="text-sm">
          <span className="text-gray-700">HTTP 地址</span>
          <input
            type="text"
            value={form.httpAddr ?? "127.0.0.1:5030"}
            onChange={(e) => update("httpAddr", e.target.value)}
            className="mt-1 w-full px-3 py-2 border rounded-md text-sm"
          />
        </label>
      </div>

      <button
        type="button"
        onClick={handleSave}
        disabled={loading}
        className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm font-medium"
      >
        {loading ? "保存中..." : "保存并验证配置"}
      </button>

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-700" role="alert">
          {error}
        </div>
      )}
    </div>
  );
}
