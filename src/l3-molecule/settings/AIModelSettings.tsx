import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Field, Input, SegmentedControl, Surface, Typography } from "@l4/ui";

const PROVIDERS = [
  { value: "ollama", label: "Ollama" },
  { value: "glm", label: "GLM" },
  { value: "deepseek", label: "DeepSeek" },
];

export function AIModelSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  return (
    <div className="settings-stack">
      <Typography variant="h2">AI 模型</Typography>

      <Surface variant="base" className="settings-section">
        <Field id="settings-ai-provider" label="模型提供商">
          <SegmentedControl
            label="模型提供商"
            value={settings.aiProvider}
            options={PROVIDERS}
            onChange={(provider) => updateAndSave({ aiProvider: provider })}
          />
        </Field>

        <Field id="settings-ai-endpoint" label="API 端点">
          <Input
            id="settings-ai-endpoint"
            value={settings.aiEndpoint}
            onChange={(event) => updateAndSave({ aiEndpoint: event.currentTarget.value })}
          />
        </Field>

        {settings.aiProvider !== "ollama" && (
          <Field id="settings-ai-api-key" label="API Key">
            <Input
              id="settings-ai-api-key"
              type="password"
              value={settings.aiApiKey}
              onChange={(event) => updateAndSave({ aiApiKey: event.currentTarget.value })}
            />
          </Field>
        )}

        <Field id="settings-ai-model" label="模型名称">
          <Input
            id="settings-ai-model"
            value={settings.aiModel}
            onChange={(event) => updateAndSave({ aiModel: event.currentTarget.value })}
            placeholder={settings.aiProvider === "ollama" ? "llama3" : "模型名称"}
          />
        </Field>
      </Surface>
    </div>
  );
}
