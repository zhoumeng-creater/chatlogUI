import type { SettingsState } from "@/l2-coordinator/api-docs/settings";
import type { SettingsSaveStatus } from "@l2/data-clerk/stores/useSettingsStore";
import { Field, SegmentedControl, StatusIndicator, Surface, Typography } from "@l4/ui";

interface AdvancedSettingsProps {
  settings: SettingsState;
  saveStatus: SettingsSaveStatus;
  saveMessage: string | null;
  onChange: (partial: Partial<SettingsState>) => void;
}

export function AdvancedSettings({ settings, saveStatus, saveMessage, onChange }: AdvancedSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">高级诊断</Typography>

      <Surface variant="base" className="settings-section">
        <Field
          id="settings-developer-mode"
          label="开发者工具入口"
          hint="仅控制本机高级诊断入口；复制和导出诊断仍会脱敏。"
        >
          <SegmentedControl
            label="开发者工具入口"
            value={settings.developerMode ? "enabled" : "disabled"}
            options={[
              { value: "disabled", label: "隐藏" },
              { value: "enabled", label: "显示" },
            ]}
            onChange={(value) => onChange({ developerMode: value === "enabled" })}
          />
        </Field>
        {saveMessage && (
          <StatusIndicator
            label={saveMessage}
            tone={saveStatus === "error" ? "danger" : saveStatus === "saving" ? "info" : "success"}
            busy={saveStatus === "saving"}
          />
        )}
      </Surface>
    </div>
  );
}
