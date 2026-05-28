import type { ReactNode } from "react";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Typography } from "@l4/ui";
import { applyWindowMaterial } from "@l4/system/applyWindowMaterial";
import { useSettingsStore } from "@l2/data-clerk/stores/useSettingsStore";
import { useDevConsoleStore } from "@l2/data-clerk/stores/useDevConsoleStore";

interface AppLayoutProps {
  children: ReactNode;
}

export function AppLayout({ children }: AppLayoutProps) {
  const navigate = useNavigate();
  const privacyOn = useSettingsStore((s) => s.settings.privacyOn);
  const togglePrivacy = useSettingsStore((s) => s.togglePrivacy);
  const toggleConsole = useDevConsoleStore((s) => s.toggle);

  useEffect(() => {
    const settings = useSettingsStore.getState().settings;
    if (settings.windowMaterial && settings.windowMaterial !== "none") {
      applyWindowMaterial(settings.windowMaterial);
    }
  }, []);

  return (
    <div className="flex flex-col h-full w-full select-none">
      <header
        className="flex items-center justify-between h-10 px-4 shrink-0"
        style={{ WebkitAppRegion: "drag" } as React.CSSProperties}
      >
        <div className="flex items-center gap-2" style={{ WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <div className="flex items-center gap-1.5">
            <button
              className="w-3 h-3 rounded-full bg-[#FF5F57] hover:brightness-90 transition-all"
              onClick={() => window.close?.()}
              aria-label="关闭"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#FEBC2E] hover:brightness-90 transition-all"
              aria-label="最小化"
            />
            <button
              className="w-3 h-3 rounded-full bg-[#28C840] hover:brightness-90 transition-all"
              aria-label="全屏"
            />
          </div>
        </div>
        <Typography variant="label" color="#8E8E93">
          chatlog_alpha
        </Typography>
        <div style={{ width: 128, display: "flex", justifyContent: "flex-end", gap: 8, alignItems: "center", WebkitAppRegion: "no-drag" } as React.CSSProperties}>
          <button
            onClick={togglePrivacy}
            style={{
              background: "none", border: "none", cursor: "pointer",
              fontSize: 16, padding: 0, lineHeight: 1,
              color: privacyOn ? "#FFD60A" : "#8E8E93",
            }}
            aria-label="隐私模式"
            title={privacyOn ? "关闭隐私模式" : "开启隐私模式"}
          >
            {privacyOn ? "\u{1F512}" : "\u{1F513}"}
          </button>
          <button
            onClick={toggleConsole}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 16,
              padding: 0,
              lineHeight: 1,
              color: "#8E8E93",
            }}
            aria-label="开发者控制台"
            title="开发者控制台"
          >
            {"\u{1F5A5}"}
          </button>
          <button
            onClick={() => navigate("/settings")}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              fontSize: 18,
              padding: 0,
              lineHeight: 1,
              color: "#8E8E93",
            }}
            aria-label="设置"
          >
            ⚙
          </button>
        </div>
      </header>

      <main className="flex-1 overflow-hidden">{children}</main>
    </div>
  );
}
