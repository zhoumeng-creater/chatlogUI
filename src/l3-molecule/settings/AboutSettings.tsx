import { Typography } from "@l4/ui/Typography";
import { GlassPanel } from "@l4/ui/GlassPanel";

export function AboutSettings() {
  return (
    <div>
      <Typography variant="h2" style={{ marginBottom: 24 }}>关于</Typography>

      <GlassPanel>
        <div style={{ padding: 16, textAlign: "center" }}>
          <Typography variant="h3" style={{ marginBottom: 8 }}>chatlog_alpha</Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            版本 1.0.0
          </Typography>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 8 }}>
            技术栈
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            Tauri v2 · React 18 · TypeScript 5 · Three.js · Go (chatlog_alpha)
          </Typography>
        </div>
      </GlassPanel>

      <GlassPanel>
        <div style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 8 }}>
            开源许可
          </Typography>
          <Typography variant="caption" color="var(--color-text-secondary)">
            基于 chatlog_alpha 开源项目构建。本软件仅供个人学习和研究使用。
          </Typography>
        </div>
      </GlassPanel>
    </div>
  );
}
