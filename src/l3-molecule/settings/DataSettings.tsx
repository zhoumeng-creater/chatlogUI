import type { SettingsDataServiceSummary } from "@/l2-coordinator/commander/settingsConfigOwnership";
import { Button, Field, Input, StatusIndicator, Surface, Typography } from "@l4/ui";

interface DataSettingsProps {
  view: SettingsDataServiceSummary;
  onOpenSetup: () => void;
}

export function DataSettings({
  view,
  onOpenSetup,
}: DataSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">{view.title}</Typography>

      <Surface variant="base" className="settings-section">
        <form className="settings-stack" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <div className="settings-inline">
            <Field id="settings-wx-path" label="微信数据路径">
              <Input
                id="settings-wx-path"
                value={view.pathSummary}
                readOnly
              />
            </Field>
            <Button type="button" variant="secondary" size="md" onClick={onOpenSetup}>
              {view.primaryAction.label}
            </Button>
          </div>
          <Field id="settings-data-key" label="数据解密密钥" hint="解密密钥只在设置中心配置，不保存在 UI 设置里。">
            <Input
              id="settings-data-key"
              type="password"
              autoComplete="off"
              value=""
              disabled
              placeholder={view.decryptionKeyLabel}
            />
          </Field>
        </form>
        <StatusIndicator label={view.serviceStatusLabel} tone={view.serviceStatusTone} />
        <Typography variant="caption" color="var(--text-secondary)">
          {view.serviceLabel}
        </Typography>
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
