import type { SettingsAiSemanticSummary } from "@/l2-coordinator/commander/settingsConfigOwnership";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

interface AIModelSettingsProps {
  view: SettingsAiSemanticSummary;
  onOpenSemanticSettings: () => void;
}

export function AIModelSettings({ view, onOpenSemanticSettings }: AIModelSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">{view.title}</Typography>

      <Surface variant="base" className="settings-section">
        <div className="settings-summary-row">
          <div className="settings-summary-row__copy">
            <StatusIndicator label={view.statusLabel} tone={view.statusTone} />
            <Typography variant="body" color="var(--text-secondary)">
              {view.description}
            </Typography>
            <Typography variant="caption" color="var(--text-secondary)">
              {view.indexLabel}
            </Typography>
          </div>
          <Button type="button" variant="primary" size="md" onClick={onOpenSemanticSettings}>
            {view.primaryAction.label}
          </Button>
        </div>
        {view.legacyIgnored && (
          <Typography variant="caption" color="var(--text-secondary)">
            已忽略旧版 Settings AI 字段；真实语义配置以 AI 工作台为准。
          </Typography>
        )}
      </Surface>
    </div>
  );
}
