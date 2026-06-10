import type { SettingsState } from "@/l2-coordinator/api-docs/settings";
import type { SettingsSaveStatus } from "@l2/data-clerk/stores/useSettingsStore";
import { Button, Field, Input, StatusIndicator, Surface, Typography } from "@l4/ui";
import { formatPrivatePathSummary } from "@/utils/privacyDisplay";

interface DataSettingsProps {
  settings: SettingsState;
  saveStatus: SettingsSaveStatus;
  saveMessage: string | null;
  onChooseDataDirectory: () => Promise<void>;
}

export function DataSettings({
  settings,
  saveStatus,
  saveMessage,
  onChooseDataDirectory,
}: DataSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">数据</Typography>

      <Surface variant="base" className="settings-section">
        <form className="settings-stack" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <div className="settings-inline">
            <Field id="settings-wx-path" label="微信数据路径">
              <Input
                id="settings-wx-path"
                value={formatPrivatePathSummary(settings.wxDataPath, "data-dir")}
                readOnly
              />
            </Field>
            <Button variant="secondary" size="md" onClick={onChooseDataDirectory}>
              选择目录
            </Button>
          </div>
          <Field id="settings-data-key" label="数据解密密钥" hint="Data Key 只在设置中心配置，不保存在 UI 设置里。">
            <Input
              id="settings-data-key"
              type="password"
              autoComplete="off"
              value=""
              disabled
              placeholder="请在设置中心配置 data key"
            />
          </Field>
        </form>
        {saveMessage && (
          <StatusIndicator
            label={saveMessage}
            tone={saveStatus === "error" ? "danger" : saveStatus === "saving" ? "info" : "success"}
            busy={saveStatus === "saving"}
          />
        )}
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
