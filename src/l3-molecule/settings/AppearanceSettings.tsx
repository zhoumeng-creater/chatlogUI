import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Field, SegmentedControl, Surface, Typography } from "@l4/ui";
import type { FontSize, ThemeMode, WindowMaterial } from "@/l2-coordinator/api-docs/settings";

const THEME_OPTIONS: { value: ThemeMode; label: string }[] = [
  { value: "system", label: "跟随系统" },
  { value: "light", label: "浅色" },
  { value: "dark", label: "深色" },
];

const FONT_OPTIONS: { value: FontSize; label: string }[] = [
  { value: "small", label: "小" },
  { value: "medium", label: "中" },
  { value: "large", label: "大" },
];

const MATERIAL_OPTIONS: { value: WindowMaterial; label: string }[] = [
  { value: "mica", label: "亚克力材质" },
  { value: "none", label: "不透明" },
];

export function AppearanceSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  return (
    <div className="settings-stack">
      <Typography variant="h2">外观</Typography>

      <Surface variant="base" className="settings-section">
        <Field id="settings-theme" label="主题">
          <SegmentedControl
            label="主题"
            value={settings.theme}
            options={THEME_OPTIONS}
            onChange={(theme) => updateAndSave({ theme })}
          />
        </Field>

        <Field id="settings-font-size" label="字体大小">
          <SegmentedControl
            label="字体大小"
            value={settings.fontSize}
            options={FONT_OPTIONS}
            onChange={(fontSize) => updateAndSave({ fontSize })}
          />
        </Field>

        <Field id="settings-window-material" label="窗口材质">
          <SegmentedControl
            label="窗口材质"
            value={settings.windowMaterial}
            options={MATERIAL_OPTIONS}
            onChange={(windowMaterial) => updateAndSave({ windowMaterial })}
          />
        </Field>

        <Field id="settings-reduce-motion" label="动画效果">
          <SegmentedControl
            label="动画效果"
            value={settings.reduceAnimations ? "reduced" : "full"}
            options={[
              { value: "full", label: "标准" },
              { value: "reduced", label: "减少" },
            ]}
            onChange={(value) => updateAndSave({ reduceAnimations: value === "reduced" })}
          />
        </Field>
      </Surface>
    </div>
  );
}
