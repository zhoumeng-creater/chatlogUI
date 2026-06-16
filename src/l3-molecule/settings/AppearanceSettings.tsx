import { Field, SegmentedControl, StatusIndicator, Surface, Typography } from "@l4/ui";
import type { FontSize, SettingsState, ThemeMode, WindowMaterial } from "@/l2-coordinator/api-docs/settings";
import type { SettingsSaveStatus } from "@l2/data-clerk/stores/useSettingsStore";
import type { SettingsMessages } from "@/l2-coordinator/commander/messages.zh-CN";

interface AppearanceSettingsProps {
  copy: SettingsMessages["settings"]["appearance"];
  settings: SettingsState;
  saveStatus: SettingsSaveStatus;
  saveMessage: string | null;
  onChange: (partial: Partial<SettingsState>) => void;
}

export function AppearanceSettings({
  copy,
  settings,
  saveStatus,
  saveMessage,
  onChange,
}: AppearanceSettingsProps) {
  const themeOptions: { value: ThemeMode; label: string }[] = [
    { value: "system", label: copy.theme.system },
    { value: "light", label: copy.theme.light },
    { value: "dark", label: copy.theme.dark },
  ];
  const fontOptions: { value: FontSize; label: string }[] = [
    { value: "small", label: copy.fontSize.small },
    { value: "medium", label: copy.fontSize.medium },
    { value: "large", label: copy.fontSize.large },
  ];
  const materialOptions: { value: WindowMaterial; label: string }[] = [
    { value: "vibrancy", label: copy.material.vibrancy },
    { value: "mica", label: copy.material.mica },
    { value: "acrylic", label: copy.material.acrylic },
    { value: "none", label: copy.material.none },
  ];

  return (
    <div className="settings-stack">
      <Typography variant="h2">{copy.title}</Typography>

      <Surface variant="base" className="settings-section">
        <Field id="settings-theme" label={copy.theme.label}>
          <SegmentedControl
            label={copy.theme.label}
            value={settings.theme}
            options={themeOptions}
            onChange={(theme) => onChange({ theme })}
          />
        </Field>

        <Field id="settings-font-size" label={copy.fontSize.label}>
          <SegmentedControl
            label={copy.fontSize.label}
            value={settings.fontSize}
            options={fontOptions}
            onChange={(fontSize) => onChange({ fontSize })}
          />
        </Field>

        <Field id="settings-window-material" label={copy.material.label}>
          <SegmentedControl
            label={copy.material.label}
            value={settings.windowMaterial}
            options={materialOptions}
            onChange={(windowMaterial) => onChange({ windowMaterial })}
          />
        </Field>

        <Field id="settings-reduce-motion" label={copy.motion.label}>
          <SegmentedControl
            label={copy.motion.label}
            value={settings.reduceAnimations ? "reduced" : "full"}
            options={[
              { value: "full", label: copy.motion.full },
              { value: "reduced", label: copy.motion.reduced },
            ]}
            onChange={(value) => onChange({ reduceAnimations: value === "reduced" })}
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
