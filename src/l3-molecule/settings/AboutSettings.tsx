import { Button, Surface, Typography } from "@l4/ui";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { SettingsDiagnosticsDisclosure } from "./SettingsDiagnosticsDisclosure";
import packageJson from "../../../package.json";

interface AboutSettingsProps {
  updateStatusText: string;
  onCheckUpdate: () => Promise<void>;
  diagnosticReport: DiagnosticsReport;
  diagnosticCopyText: string;
  onExportDiagnostics: () => Promise<string>;
}

export function AboutSettings({
  updateStatusText,
  onCheckUpdate,
  diagnosticReport,
  diagnosticCopyText,
  onExportDiagnostics,
}: AboutSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">关于</Typography>

      <Surface variant="base" className="settings-section settings-section--center">
        <Typography variant="h3">chatlog_alpha</Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          应用版本 {packageJson.version}
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          技术栈
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          Tauri API {packageJson.dependencies["@tauri-apps/api"]} · React {packageJson.dependencies.react} · TypeScript {packageJson.devDependencies.typescript} · Go sidecar
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          Sidecar 版本需在运行时由本地 chatlog_alpha 提供；当前设置页不伪造版本号。
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          开源许可
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          基于 chatlog_alpha 开源项目构建。本软件仅供个人学习和研究使用。
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          更新
        </Typography>
        <div className="settings-inline">
          <Button variant="secondary" size="md" onClick={onCheckUpdate}>
            检查更新
          </Button>
          {updateStatusText && (
            <Typography variant="caption" color="var(--text-secondary)">
              {updateStatusText}
            </Typography>
          )}
        </div>
      </Surface>

      <SettingsDiagnosticsDisclosure
        report={diagnosticReport}
        copyText={diagnosticCopyText}
        onExport={onExportDiagnostics}
      />
    </div>
  );
}
