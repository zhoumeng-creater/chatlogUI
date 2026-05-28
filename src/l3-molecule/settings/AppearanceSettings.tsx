import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { Typography } from "@l4/ui/Typography";
import { AppleButton } from "@l4/ui/AppleButton";
import { GlassPanel } from "@l4/ui/GlassPanel";
import type { ThemeMode, FontSize, WindowMaterial } from "@/l2-coordinator/api-docs/settings";

const THEME_OPTIONS: { key: ThemeMode; label: string }[] = [
  { key: "system", label: "跟随系统" },
  { key: "light", label: "浅色" },
  { key: "dark", label: "深色" },
];

const FONT_OPTIONS: { key: FontSize; label: string }[] = [
  { key: "small", label: "小" },
  { key: "medium", label: "中" },
  { key: "large", label: "大" },
];

const MATERIAL_OPTIONS: { key: WindowMaterial; label: string }[] = [
  { key: "mica", label: "亚克力材质" },
  { key: "none", label: "不透明" },
];

export function AppearanceSettings() {
  const { settings, updateAndSave } = useSettingsCommander();

  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>外观</Typography>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            主题
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {THEME_OPTIONS.map((t) => (
              <AppleButton
                key={t.key}
                variant={settings.theme === t.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateAndSave({ theme: t.key })}
              >
                {t.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            字体大小
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {FONT_OPTIONS.map((f) => (
              <AppleButton
                key={f.key}
                variant={settings.fontSize === f.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateAndSave({ fontSize: f.key })}
              >
                {f.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginBottom: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            窗口材质
          </Typography>
          <div style={{ display: "flex", gap: 8 }}>
            {MATERIAL_OPTIONS.map((m) => (
              <AppleButton
                key={m.key}
                variant={settings.windowMaterial === m.key ? "primary" : "secondary"}
                size="sm"
                onClick={() => updateAndSave({ windowMaterial: m.key })}
              >
                {m.label}
              </AppleButton>
            ))}
          </div>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16 }}>
          <label style={{ display: "flex", alignItems: "center", gap: 12, cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={settings.reduceAnimations}
              onChange={(e) => updateAndSave({ reduceAnimations: e.target.checked })}
              style={{ width: 18, height: 18 }}
            />
            <Typography variant="body">减少动画效果</Typography>
          </label>
        </div>
      </GlassPanel>
    </div>
  );
}
