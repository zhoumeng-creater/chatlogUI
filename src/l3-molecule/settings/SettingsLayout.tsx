import type { ReactNode } from "react";
import type { SettingsCategory } from "@/l2-coordinator/api-docs/settings";
import { SETTINGS_SIDEBAR_WIDTH } from "@/utils/constants";
import { GlassPanel } from "@l4/ui/GlassPanel";
import { Typography } from "@l4/ui/Typography";
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";

const CATEGORIES: { key: SettingsCategory; label: string }[] = [
  { key: "ai", label: "AI 模型" },
  { key: "appearance", label: "外观" },
  { key: "data", label: "数据" },
  { key: "about", label: "关于" },
];

interface SettingsLayoutProps {
  children: ReactNode;
}

export function SettingsLayout({ children }: SettingsLayoutProps) {
  const { activeCategory, setActiveCategory } = useSettingsCommander();

  return (
    <div style={{ display: "flex", height: "100%" }}>
      <div
        style={{
          width: SETTINGS_SIDEBAR_WIDTH,
          minWidth: SETTINGS_SIDEBAR_WIDTH,
          flexShrink: 0,
          paddingTop: 8,
        }}
      >
        <GlassPanel>
          <div style={{ padding: 8 }}>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.key}
                onClick={() => setActiveCategory(cat.key)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "8px 12px",
                  borderRadius: 8,
                  border: "none",
                  background: activeCategory === cat.key
                    ? "rgba(0, 122, 255, 0.1)"
                    : "transparent",
                  cursor: "pointer",
                  marginBottom: 2,
                }}
              >
                <Typography
                  variant="body"
                  weight={activeCategory === cat.key ? 600 : 400}
                  color={activeCategory === cat.key ? "var(--color-accent)" : "var(--color-text-primary)"}
                >
                  {cat.label}
                </Typography>
              </button>
            ))}
          </div>
        </GlassPanel>
      </div>

      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "24px 32px",
        }}
      >
        {children}
      </div>
    </div>
  );
}
