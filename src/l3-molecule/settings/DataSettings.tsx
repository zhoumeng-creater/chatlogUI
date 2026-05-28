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
