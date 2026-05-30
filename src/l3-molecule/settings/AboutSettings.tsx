import { useCallback, useState } from "react";
import { useUpdateCommander } from "@l2/commander/useUpdateCommander";
import { Button, Surface, Typography } from "@l4/ui";

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
    <div className="settings-stack">
      <Typography variant="h2">关于</Typography>

      <Surface variant="base" className="settings-section settings-section--center">
        <Typography variant="h3">chatlog_alpha</Typography>
        <Typography variant="caption" color="var(--text-secondary)">
          版本 1.0.0
        </Typography>
      </Surface>

      <Surface variant="subtle" className="settings-section">
        <Typography variant="label" weight={700}>
          技术栈
        </Typography>
        <Typography variant="body" color="var(--text-secondary)">
          Tauri v2 · React 18 · TypeScript 5 · Three.js · Go (chatlog_alpha)
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
          <Button variant="secondary" size="md" onClick={handleCheckUpdate}>
            检查更新
          </Button>
          {checkingText && (
            <Typography variant="caption" color="var(--text-secondary)">
              {checkingText}
            </Typography>
          )}
        </div>
      </Surface>
    </div>
  );
}
