import { useEffect } from "react";
import { Link } from "react-router-dom";
import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { useAppStore } from "@l2/data-clerk/stores/useAppStore";
import { AppLayout } from "@l3/common/AppLayout";
import { StatusBar } from "@l3/common/StatusBar";
import { StatusIndicator, Surface, Typography } from "@l4/ui";
import { DashboardView } from "./DashboardView";

export function WorkbenchShellView() {
  const { loadExistingProfile, checkReadiness } = useSetupCommander();
  const dbReady = useSetupStore((s) => s.dbReady);
  const httpReady = useSetupStore((s) => s.httpReady);
  const profile = useSetupStore((s) => s.profile);
  const sidecarStatus = useAppStore((s) => s.sidecarStatus);

  useEffect(() => {
    void loadExistingProfile().then(() => checkReadiness());
  }, [loadExistingProfile, checkReadiness]);

  if (dbReady) {
    return <DashboardView />;
  }

  const statusText = httpReady ? "服务运行中，数据库未就绪" : "服务未启动";

  return (
    <AppLayout title="工作台">
      <div style={{ display: "flex", height: "100%", minHeight: 0, flexDirection: "column" }}>
        <div style={{
          flex: 1,
          minHeight: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: 24,
        }}>
          <Surface variant="raised" style={{ width: "min(100%, 420px)", padding: 28 }}>
            <div style={{ display: "grid", justifyItems: "center", gap: 12, textAlign: "center" }}>
              <StatusIndicator
                label={statusText}
                tone={httpReady ? "warning" : "neutral"}
              />
              <Typography variant="h3">{profile ? "服务尚未完全就绪" : "尚未配置"}</Typography>
              <Typography variant="body" color="var(--text-secondary)">
                {!profile
                  ? "请先完成设置中心的基本配置后再进入工作台。"
                  : !httpReady
                    ? "chatlog_alpha 服务尚未启动，请在设置中心启动服务。"
                    : "服务已启动但数据库尚未就绪，请稍候。"}
              </Typography>
              <Link to="/" className="ui-button ui-button--primary ui-button--md" style={{ marginTop: 8 }}>
                前往设置中心
              </Link>
            </div>
          </Surface>
        </div>
        <StatusBar status={sidecarStatus} httpReady={httpReady} dbReady={dbReady} />
      </div>
    </AppLayout>
  );
}
