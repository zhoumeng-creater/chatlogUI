import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { GlassPanel } from "@l4/ui/GlassPanel";
import { openDirectoryPicker } from "@l4/system/openDirectoryPicker";

export function DataSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  const handlePickPath = async () => {
    try {
      const path = await openDirectoryPicker();
      if (path) {
        updateAndSave({ wxDataPath: path });
      }
    } catch {
      // user cancelled
    }
  };

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>数据</Typography>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            微信数据路径
          </Typography>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <Typography variant="caption" color="var(--color-text-secondary)" style={{ flex: 1 }}>
              {settings.wxDataPath || "未设置"}
            </Typography>
            <AppleButton variant="secondary" size="sm" onClick={handlePickPath}>
              选择目录
            </AppleButton>
          </div>
          <div style={{ marginTop: 16 }}>
            <Typography variant="caption" color="var(--color-text-secondary)">
              数据解密密钥
            </Typography>
            <input
              type="password"
              value={settings.dataKey}
              onChange={(e) => updateAndSave({ dataKey: e.target.value })}
              placeholder="64 位十六进制密钥，留空则由后端配置决定"
              style={{
                width: "100%",
                padding: "8px 12px",
                borderRadius: 8,
                border: "1px solid var(--color-border)",
                background: "var(--color-bg-primary)",
                color: "var(--color-text-primary)",
                fontSize: 14,
                marginTop: 4,
              }}
            />
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            缓存管理
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            聊天记录和 AI 索引缓存在本地存储
          </Typography>
        </div>
      </GlassPanel>
    </div>
  );
}
