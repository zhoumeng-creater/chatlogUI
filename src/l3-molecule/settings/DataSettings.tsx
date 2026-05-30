import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Button, Field, Input, Surface, Typography } from "@l4/ui";
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
    <div className="settings-stack">
      <Typography variant="h2">数据</Typography>

      <Surface variant="base" className="settings-section">
        <Field id="settings-wx-path" label="微信数据路径">
          <div className="settings-inline">
            <Input
              id="settings-wx-path"
              value={settings.wxDataPath || "未设置"}
              readOnly
            />
            <Button variant="secondary" size="md" onClick={handlePickPath}>
              选择目录
            </Button>
          </div>
        </Field>
        <Field id="settings-data-key" label="数据解密密钥" hint="Data Key 只在设置中心配置，不保存在 UI 设置里。">
          <Input
            id="settings-data-key"
            type="password"
            value=""
            disabled
            placeholder="请在设置中心配置 data key"
          />
        </Field>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          缓存管理
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          聊天记录和 AI 索引缓存保存在本地存储。后续诊断阶段会把缓存清理、导出和索引状态合并到统一设置中心。
        </Typography>
      </Surface>
    </div>
  );
}
