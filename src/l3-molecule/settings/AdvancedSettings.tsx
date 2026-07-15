import type { SettingsState } from "@/l2-coordinator/api-docs/settings";
import type { SettingsMessages } from "@/l2-coordinator/commander/messages.zh-CN";
import type { SettingsSaveStatus } from "@l2/data-clerk/stores/useSettingsStore";
import { Field, SegmentedControl, StatusIndicator, Surface, Typography } from "@l4/ui";

interface AdvancedSettingsProps {
  copy: SettingsMessages["settings"]["advanced"];
  settings: SettingsState;
  saveStatus: SettingsSaveStatus;
  saveMessage: string | null;
  rememberRecentSearches: boolean;
  onChange: (partial: Partial<SettingsState>) => void;
  onRememberRecentSearchesChange: (enabled: boolean) => void;
}

export function AdvancedSettings({
  copy,
  settings,
  saveStatus,
  saveMessage,
  rememberRecentSearches,
  onChange,
  onRememberRecentSearchesChange,
}: AdvancedSettingsProps) {
  return (
    <div className="settings-stack">
      <Typography variant="h2">{copy.title}</Typography>

      <Surface variant="base" className="settings-section">
        <Field
          id="settings-privacy-default"
          label={copy.privacyDefaultLabel}
          hint={copy.privacyDefaultHint}
        >
          <SegmentedControl
            label={copy.privacyDefaultLabel}
            value={settings.privacyOn ? "enabled" : "disabled"}
            options={[
              { value: "disabled", label: copy.privacyDefaultOff },
              { value: "enabled", label: copy.privacyDefaultOn },
            ]}
            onChange={(value) => onChange({ privacyOn: value === "enabled" })}
          />
        </Field>
        <Field
          id="settings-recent-searches"
          label={copy.recentSearchesLabel}
          hint={copy.recentSearchesHint}
        >
          <SegmentedControl
            label={copy.recentSearchesLabel}
            value={rememberRecentSearches ? "enabled" : "disabled"}
            options={[
              { value: "disabled", label: copy.recentSearchesDisabled },
              { value: "enabled", label: copy.recentSearchesEnabled },
            ]}
            onChange={(value) => onRememberRecentSearchesChange(value === "enabled")}
          />
        </Field>
        <Field
          id="settings-developer-mode"
          label={copy.developerEntryLabel}
          hint={copy.developerHint}
        >
          <SegmentedControl
            label={copy.developerEntryLabel}
            value={settings.developerMode ? "enabled" : "disabled"}
            options={[
              { value: "disabled", label: copy.developerDisabled },
              { value: "enabled", label: copy.developerEnabled },
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
