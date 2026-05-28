import { useNavigate } from "react-router-dom";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { SettingsLayout } from "@l3/settings/SettingsLayout";
import { AIModelSettings } from "@l3/settings/AIModelSettings";
import { AppearanceSettings } from "@l3/settings/AppearanceSettings";
import { DataSettings } from "@l3/settings/DataSettings";
import { AboutSettings } from "@l3/settings/AboutSettings";
import { useSettingsCommander } from "@l2/commander/useSettingsCommander";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { useAiCommander } from "@l2/commander/useAiCommander";
import { Typography } from "@l4/ui/Typography";

export function SettingsView() {
  const navigate = useNavigate();
  const { activeCategory } = useSettingsCommander();
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);
  const { indexStatus } = useAiCommander();

  const renderContent = () => {
    switch (activeCategory) {
      case "ai":
        return <AIModelSettings />;
      case "appearance":
        return <AppearanceSettings />;
      case "data":
        return <DataSettings />;
      case "about":
        return <AboutSettings />;
      default:
        return null;
    }
  };

  return (
    <AppLayout>
      <div style={{ display: "flex", alignItems: "center", padding: "8px 16px", gap: 16, borderBottom: "1px solid var(--color-border)" }}>
        <button
          onClick={() => navigate("/dashboard", { replace: true })}
          style={{
            background: "none",
            border: "none",
            cursor: "pointer",
            color: "var(--color-accent)",
            fontSize: 14,
            padding: 0,
          }}
        >
          ← 返回仪表盘
        </button>
        <Typography variant="label" weight={600}>设置</Typography>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        <SettingsLayout>{renderContent()}</SettingsLayout>
      </div>
      <StatusBar status={sidecarStatus} indexStatus={indexStatus} />
    </AppLayout>
  );
}
