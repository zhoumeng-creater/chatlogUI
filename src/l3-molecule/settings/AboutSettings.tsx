import { useState, useCallback } from "react";
import { Typography } from "@l4/ui/Typography";
import { GlassPanel } from "@l4/ui/GlassPanel";
import { AppleButton } from "@l4/ui/AppleButton";
import { useUpdateCommander } from "@l2/commander/useUpdateCommander";

export function AboutSettings() {
  const { checkUpdate } = useUpdateCommander();
  const [checkingText, setCheckingText] = useState("");

  const handleCheckUpdate = useCallback(async () => {
    setCheckingText("正在检查更新...");
    const hasUpdate = await checkUpdate();
    if (!hasUpdate) {
      setCheckingText("已是最新版本");
      setTimeout(() => setCheckingText(""), 3000);
    }
  }, [checkUpdate]);

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

      <GlassPanel>
        <div style={{ padding: 16, marginTop: 16 }}>
          <Typography variant="label" weight={600} style={{ marginBottom: 12 }}>
            更新
          </Typography>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <AppleButton variant="secondary" size="sm" onClick={handleCheckUpdate}>
              检查更新
            </AppleButton>
            {checkingText && (
              <Typography variant="caption" color="var(--color-text-secondary)">
                {checkingText}
              </Typography>
            )}
          </div>
        </div>
      </GlassPanel>
    </div>
  );
}
