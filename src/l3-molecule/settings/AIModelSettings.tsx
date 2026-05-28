import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { GlassPanel } from "@l4/ui/GlassPanel";

const PROVIDERS: { key: string; label: string }[] = [
  { key: "ollama", label: "Ollama (本地)" },
  { key: "glm", label: "智谱 GLM" },
  { key: "deepseek", label: "DeepSeek" },
];

export function AIModelSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  const handleProviderChange = (provider: string) => {
    updateAndSave({ aiProvider: provider });
  };

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>AI 模型</Typography>

      <GlassPanel>
        <div style={{ padding: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            模型提供商
          </Typography>
          <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
            {PROVIDERS.map((p) => (
              <AppleButton
                key={p.key}
                variant={settings.aiProvider === p.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => handleProviderChange(p.key)}
              >
                {p.label}
              </AppleButton>
            ))}
          </div>

          <div style={{ marginBottom: 12 }}>
            <Typography variant="caption" color="var(--color-text-secondary)">
              API 端点
            </Typography>
            <input
              value={settings.aiEndpoint}
              onChange={(e) => updateAndSave({ aiEndpoint: e.target.value })}
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

          {settings.aiProvider !== "ollama" && (
            <div style={{ marginBottom: 12 }}>
              <Typography variant="caption" color="var(--color-text-secondary)">
                API Key
              </Typography>
              <input
                type="password"
                value={settings.aiApiKey}
                onChange={(e) => updateAndSave({ aiApiKey: e.target.value })}
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
          )}

          <div style={{ marginBottom: 12 }}>
            <Typography variant="caption" color="var(--color-text-secondary)">
              模型名称
            </Typography>
            <input
              value={settings.aiModel}
              onChange={(e) => updateAndSave({ aiModel: e.target.value })}
              placeholder={settings.aiProvider === "ollama" ? "llama3" : "模型名称"}
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
    </div>
  );
}
