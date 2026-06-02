import type { SettingsState } from "@/l2-coordinator/api-docs/settings";
import type { SettingsSaveStatus } from "@l2/data-clerk/stores/useSettingsStore";
import { Field, Input, SegmentedControl, StatusIndicator, Surface, Typography } from "@l4/ui";

const PROVIDERS = [
  { value: "ollama", label: "Ollama" },
  { value: "glm", label: "GLM" },
  { value: "deepseek", label: "DeepSeek" },
];

interface AIModelSettingsProps {
  settings: SettingsState;
  saveStatus: SettingsSaveStatus;
  saveMessage: string | null;
  onChange: (partial: Partial<SettingsState>) => void;
}

export function AIModelSettings({ settings, saveStatus, saveMessage, onChange }: AIModelSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">AI 模型</Typography>

      <Surface variant="base" className="settings-section">
        <form className="settings-stack" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <Field id="settings-ai-provider" label="模型提供商">
            <SegmentedControl
              label="模型提供商"
              value={settings.aiProvider}
              options={PROVIDERS}
              onChange={(provider) => onChange({ aiProvider: provider })}
            />
          </Field>

          <Field id="settings-ai-endpoint" label="API 端点">
            <Input
              id="settings-ai-endpoint"
              value={settings.aiEndpoint}
              onChange={(event) => onChange({ aiEndpoint: event.currentTarget.value })}
            />
          </Field>

          {settings.aiProvider !== "ollama" && (
            <Field
              id="settings-ai-credential"
              label="凭据状态"
              hint="API Key 不保存在 UI 设置存储中。语义配置向导会在后续阶段按后端合约处理连接测试、保存和索引状态。"
            >
              <Input
                id="settings-ai-credential"
                autoComplete="off"
                value={settings.aiCredentialConfigured ? "已由安全配置来源验证" : "未配置"}
                disabled
              />
            </Field>
          )}

          <Field id="settings-ai-model" label="模型名称">
            <Input
              id="settings-ai-model"
              value={settings.aiModel}
              onChange={(event) => onChange({ aiModel: event.currentTarget.value })}
              placeholder={settings.aiProvider === "ollama" ? "llama3" : "模型名称"}
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
    </div>
  );
}
