import type { SettingsDataServiceSummary } from "@/l2-coordinator/commander/settingsConfigOwnership";
import type { SettingsMessages } from "@/l2-coordinator/commander/messages.zh-CN";
import { Button, Field, Input, StatusIndicator, Surface, Typography } from "@l4/ui";

interface DataSettingsProps {
  copy: SettingsMessages["settings"]["data"];
  view: SettingsDataServiceSummary;
  onOpenSetup: () => void;
}

export function DataSettings({
  copy,
  view,
  onOpenSetup,
}: DataSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">{view.title}</Typography>

      <Surface variant="base" className="settings-section">
        <form className="settings-stack" autoComplete="off" onSubmit={(event) => event.preventDefault()}>
          <div className="settings-inline">
            <Field id="settings-wx-path" label={copy.dataDirectoryLabel}>
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
          <Field
            id="settings-data-key"
            label={copy.keyConfiguredLabel}
            hint={copy.keyConfiguredHint}
          >
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
          {copy.cacheTitle}
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          {copy.cacheDescription}
        </Typography>
      </Surface>
    </div>
  );
}
