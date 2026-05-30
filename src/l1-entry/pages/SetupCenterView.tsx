import { useEffect } from "react";
import { Database, Server, ShieldCheck } from "lucide-react";
import { useSetupCommander } from "@l2/commander";
import { useSetupStore } from "@l2/data-clerk/stores/useSetupStore";
import { SetupStepper } from "@l3/setup/SetupStepper";
import { SetupModeChooser } from "@l3/setup/SetupModeChooser";
import { ConfigImportPanel } from "@l3/setup/ConfigImportPanel";
import { ManualAdvancedConfigPanel } from "@l3/setup/ManualAdvancedConfigPanel";
import { ServiceControlPanel } from "@l3/setup/ServiceControlPanel";
import { ReadinessChecklist } from "@l3/setup/ReadinessChecklist";
import { DiagnosticPanel } from "@l3/setup/DiagnosticPanel";
import { Button, StatusIndicator, Surface, Typography } from "@l4/ui";

export function SetupCenterView() {
  const { loadExistingProfile, openWorkbench } = useSetupCommander();
  const currentStep = useSetupStore((s) => s.currentStep);
  const dbReady = useSetupStore((s) => s.dbReady);

  useEffect(() => {
    loadExistingProfile();
  }, [loadExistingProfile]);

  return (
    <div className="setup-shell">
      <aside className="setup-shell__nav">
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
          <div className="ui-icon-button ui-icon-button--md ui-icon-button--active" aria-hidden="true">
            <Server size={17} />
          </div>
          <div>
            <Typography variant="label" weight={700}>设置中心</Typography>
            <Typography variant="caption" color="var(--text-tertiary)">chatlog_alpha</Typography>
          </div>
        </div>
        <SetupStepper />
      </aside>

      <main className="setup-shell__main">
        <div className="setup-shell__content">
          <div style={{ marginBottom: 24 }}>
            <Typography variant="h2">连接本地聊天数据服务</Typography>
            <Typography variant="body" color="var(--text-secondary)" style={{ marginTop: 6 }}>
              选择服务模式、确认配置与数据库状态后进入工作台。
            </Typography>
          </div>

          {currentStep === "mode" && (
            <Surface variant="raised" style={{ padding: 20 }}>
              <SetupModeChooser />
            </Surface>
          )}
          {currentStep === "config" && (
            <Surface variant="raised" style={{ padding: 20 }}>
              <ConfigImportPanel />
              <div style={{ marginTop: 20, paddingTop: 20, borderTop: "1px solid var(--border-subtle)" }}>
                <ManualAdvancedConfigPanel />
              </div>
            </Surface>
          )}
          {(currentStep === "service" || currentStep === "database") && (
            <Surface variant="raised" style={{ padding: 20 }}>
              <ServiceControlPanel />
            </Surface>
          )}
          {currentStep === "ready" && (
            <Surface variant="raised" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
                <div className="ui-icon-button ui-icon-button--lg ui-icon-button--active" aria-hidden="true">
                  <ShieldCheck size={19} />
                </div>
                <div>
                  <Typography variant="h3">服务已就绪</Typography>
                  <Typography variant="body" color="var(--text-secondary)" style={{ marginTop: 4 }}>
                    所有检查已通过，可以开始使用了。
                  </Typography>
                </div>
              </div>
              <Button type="button" onClick={openWorkbench}>
                打开工作台
              </Button>
            </Surface>
          )}
        </div>
      </main>

      <aside className="setup-shell__aside">
        <div aria-live="polite" className="sr-only">
          {currentStep === "ready" ? "所有组件就绪，可以进入工作台" : `当前步骤: ${currentStep}`}
        </div>
        <div style={{ display: "grid", gap: 16 }}>
          <Surface variant="base" style={{ padding: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <Database size={16} color="var(--text-secondary)" />
              <Typography variant="label" weight={700}>状态</Typography>
            </div>
            <div style={{ display: "grid", gap: 8 }}>
              <StatusIndicator label={dbReady ? "数据库就绪" : "数据库未就绪"} tone={dbReady ? "success" : "warning"} />
              <ReadinessChecklist />
            </div>
          </Surface>

          <Surface variant="base" style={{ padding: 14 }}>
            <Typography variant="label" weight={700}>诊断信息</Typography>
            <div style={{ marginTop: 10 }}>
              <DiagnosticPanel />
            </div>
          </Surface>

          <Button type="button" variant={dbReady ? "primary" : "secondary"} onClick={openWorkbench}>
            {dbReady ? "打开工作台" : "稍后配置，打开空工作台"}
          </Button>
        </div>
      </aside>
    </div>
  );
}
