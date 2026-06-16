import { Button, Surface, Typography } from "@l4/ui";
import type { SettingsMessages } from "@/l2-coordinator/commander/messages.zh-CN";
import type { DiagnosticsReport } from "@l2/commander/diagnostics";
import { SettingsDiagnosticsDisclosure } from "./SettingsDiagnosticsDisclosure";
import packageJson from "../../../package.json";

interface AboutSettingsProps {
  copy: SettingsMessages["settings"]["about"];
  diagnosticsCopy: SettingsMessages["settings"]["diagnostics"];
  updateStatusText: string;
  onCheckUpdate: () => Promise<void>;
  diagnosticReport: DiagnosticsReport;
  diagnosticCopyText: string;
  onExportDiagnostics: () => Promise<string>;
}

export function AboutSettings({
  copy,
  diagnosticsCopy,
  updateStatusText,
  onCheckUpdate,
  diagnosticReport,
  diagnosticCopyText,
  onExportDiagnostics,
}: AboutSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">{copy.title}</Typography>

      <Surface variant="base" className="settings-section settings-section--center">
        <Typography variant="h3">{copy.productName}</Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {copy.versionPrefix} {packageJson.version}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {copy.productDescription}
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          {copy.kernelTitle}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {copy.kernelDescription}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          Tauri API {packageJson.dependencies["@tauri-apps/api"]} · React {packageJson.dependencies.react} · TypeScript {packageJson.devDependencies.typescript}
        </Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          {copy.kernelRuntimeNote}
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          {copy.licenseTitle}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {copy.licenseDescription}
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          {copy.updateTitle}
        </Typography>
        <div className="settings-inline">
          <Button variant="secondary" size="md" onClick={onCheckUpdate}>
            {copy.checkUpdate}
          </Button>
          {updateStatusText && (
            <Typography variant="caption" color="var(--text-secondary)">
              {updateStatusText}
            </Typography>
          )}
        </div>
      </Surface>

      <SettingsDiagnosticsDisclosure
        copy={diagnosticsCopy}
        report={diagnosticReport}
        copyText={diagnosticCopyText}
        onExport={onExportDiagnostics}
      />
    </div>
  );
}
